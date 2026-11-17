

const express = require("express");
const mongoose = require("mongoose");

const RFQ = require("../models/RFQ");
const Project = require("../models/Project");
const Manufacturer = require("../models/Manufacturer");
const { calculateManufacturerMatch, findManufacturerMatches } = require("../services/manufacturerMatching");
const Notification = require("../models/Notification");
const manufacturerAuth = require('../middleware/manufacturerAuth');
const adminAuth = require("../middleware/adminAuth");
const customerAuth = require("../middleware/customerAuth");
const { matchesProjectGeography } = require("../services/manufacturerGeography");

const router = express.Router();

const populateRFQ = (query) =>
  query
    .populate("project", "productName quantity material process")
    .populate(
      "quotations.manufacturer",
      "companyName country city contactEmail"
    )
    .populate(
      "selectedManufacturer",
      "companyName country city contactEmail"
    );

const validDate = (value) => {
  if (!value) return true;
  return !Number.isNaN(new Date(value).getTime());
};

// GET: Find compatible verified manufacturers for an RFQ project
router.get("/matches/:projectId", adminAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID.",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    if (project.specificationStatus !== "Confirmed") {
      return res.status(400).json({
        success: false,
        message: "Project specifications must be confirmed first.",
      });
    }

    const manufacturers = await Manufacturer.find({
      verificationStatus: "Verified",
    });

    const matches = findManufacturerMatches(project, manufacturers);

    return res.status(200).json({
      success: true,
      count: matches.length,
      matches,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to find compatible manufacturers.",
    });
  }
});

// Create RFQ and assign it to verified manufacturers
router.post("/", adminAuth, async (req, res) => {
  try {
    const {
      projectId,
      title,
      quantity,
      material,
      process,
      deliveryLocation,
      deliveryDeadline,
      quotationDeadline,
      specifications,
      manufacturerIds,
    } = req.body;

    const qty = Number(quantity);

    if (!mongoose.Types.ObjectId.isValid(projectId || "")) {
      return res.status(400).json({
        message: "A valid project is required.",
      });
    }

    if (!title || !title.trim() || !Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({
        message: "RFQ title and a valid quantity are required.",
      });
    }

    if (
      !validDate(deliveryDeadline) ||
      !validDate(quotationDeadline)
    ) {
      return res.status(400).json({
        message: "One or more deadline dates are invalid.",
      });
    }

    if (
      !Array.isArray(manufacturerIds) ||
      manufacturerIds.length === 0
    ) {
      return res.status(400).json({
        message: "Select at least one manufacturer.",
      });
    }

    const uniqueIds = [...new Set(manufacturerIds.map(String))];

    if (uniqueIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({
        message: "Invalid manufacturer ID.",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    if (project.specificationStatus !== "Confirmed") {
      return res.status(400).json({
        message:
          "Customer specifications must be confirmed before creating an RFQ.",
      });
    }

    const manufacturers = await Manufacturer.find({
      _id: { $in: uniqueIds },
      verificationStatus: "Verified",
    });

    if (manufacturers.length !== uniqueIds.length) {
      return res.status(400).json({
        message: "All selected manufacturers must be verified.",
      });
    }

    // Enforce material and manufacturing-process compatibility on the backend.
    // Use the confirmed project specifications, not values submitted by the client.
    const incompatibleManufacturers = manufacturers
      .map((manufacturer) => {
        const match = calculateManufacturerMatch(project, manufacturer);

        return match.eligible
          ? null
          : {
              companyName: manufacturer.companyName,
              missing: match.missing || [],
            };
      })
      .filter(Boolean);

    if (incompatibleManufacturers.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "One or more selected manufacturers do not support the project's required material and manufacturing process.",
        incompatibleManufacturers,
      });
    }

    const rfq = await RFQ.create({
      project: projectId,
      title: title.trim(),
      quantity: qty,
      material: project.material,
      process: project.process,
      deliveryLocation,
      deliveryDeadline: deliveryDeadline || undefined,
      quotationDeadline: quotationDeadline || undefined,
      specifications,
      status: "Sent",
      quotations: uniqueIds.map((manufacturerId) => ({
        manufacturer: manufacturerId,
        status: "Pending",
      })),
    });

        // Notify every manufacturer assigned to this RFQ.
    try {
      await Notification.insertMany(
        manufacturers.map((manufacturer) => ({
          recipientType: "Manufacturer",
          recipient: manufacturer._id,
          type: "RFQ_ASSIGNED",
          title: "New RFQ Assigned",
          message: `You have been invited to submit a quotation for "${rfq.title}".`,
          relatedRFQ: rfq._id,
          relatedProject: project._id,
        }))
      );
    } catch (notificationError) {
      console.error(
        "RFQ notification creation failed:",
        notificationError.message
      );
    }

    const populatedRFQ = await populateRFQ(
      RFQ.findById(rfq._id)
    );

    res.status(201).json({
      success: true,
      message: "RFQ created and assigned successfully.",
      rfq: populatedRFQ,
    });
  } catch (error) {
    console.error("Create RFQ error:", error);
    res.status(500).json({
      message: "Could not create RFQ.",
    });
  }
});



// POST: Create an RFQ for a project owned by the authenticated customer.
router.post("/customer", customerAuth, async (req, res) => {
  try {
    const {
      projectId,
      title,
      quantity,
      deliveryLocation,
      deliveryDeadline,
      quotationDeadline,
      specifications,
      manufacturerIds,
    } = req.body;

    const qty = Number(quantity);

    if (!mongoose.Types.ObjectId.isValid(projectId || "")) {
      return res.status(400).json({
        success: false,
        message: "A valid project is required.",
      });
    }

    if (!title || !title.trim() || !Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: "RFQ title and a valid quantity are required.",
      });
    }

    if (!validDate(deliveryDeadline) || !validDate(quotationDeadline)) {
      return res.status(400).json({
        success: false,
        message: "One or more deadline dates are invalid.",
      });
    }

    if (!Array.isArray(manufacturerIds) || manufacturerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one manufacturer.",
      });
    }

    const uniqueIds = [...new Set(manufacturerIds.map(String))];

    if (uniqueIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid manufacturer ID.",
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      customer: req.customer.customerId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or you do not have access to it.",
      });
    }

    if (project.specificationStatus !== "Confirmed") {
      return res.status(400).json({
        success: false,
        message: "Confirm your project specifications before creating an RFQ.",
      });
    }

    const manufacturers = await Manufacturer.find({
      _id: { $in: uniqueIds },
      verificationStatus: "Verified",
    });

    if (manufacturers.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        message: "All selected manufacturers must be verified.",
      });
    }

    const incompatibleManufacturers = [];
    const locationExcludedManufacturers = [];

    for (const manufacturer of manufacturers) {
      const match = calculateManufacturerMatch(project, manufacturer);

      if (!match.eligible) {
        incompatibleManufacturers.push({
          companyName: manufacturer.companyName,
          missing: match.missing || [],
        });
        continue;
      }

      if (!matchesProjectGeography(project, manufacturer)) {
        locationExcludedManufacturers.push(manufacturer.companyName);
      }
    }

    if (incompatibleManufacturers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "One or more selected manufacturers are not technically compatible.",
        incompatibleManufacturers,
      });
    }

    if (locationExcludedManufacturers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "One or more selected manufacturers do not match your geographic preference.",
        locationExcludedManufacturers,
      });
    }

    const rfq = await RFQ.create({
      project: project._id,
      title: title.trim(),
      quantity: qty,
      material: project.material,
      process: project.process,
      deliveryLocation,
      deliveryDeadline: deliveryDeadline || undefined,
      quotationDeadline: quotationDeadline || undefined,
      specifications,
      status: "Sent",
      quotations: uniqueIds.map((manufacturerId) => ({
        manufacturer: manufacturerId,
        status: "Pending",
      })),
    });

    try {
      await Notification.insertMany(
        manufacturers.map((manufacturer) => ({
          recipientType: "Manufacturer",
          recipient: manufacturer._id,
          type: "RFQ_ASSIGNED",
          title: "New RFQ Assigned",
          message: `You have been invited to submit a quotation for "${rfq.title}".`,
          relatedRFQ: rfq._id,
          relatedProject: project._id,
        }))
      );
    } catch (notificationError) {
      console.error(
        "Customer RFQ notification creation failed:",
        notificationError.message
      );
    }

    const populatedRFQ = await populateRFQ(RFQ.findById(rfq._id));

    return res.status(201).json({
      success: true,
      message: "RFQ created and assigned successfully.",
      rfq: populatedRFQ,
    });
  } catch (error) {
    console.error("Create customer RFQ error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not create RFQ.",
    });
  }
});

// GET: View RFQs belonging to the authenticated customer's projects.
router.get("/customer/my-rfqs", customerAuth, async (req, res) => {
  try {
    const customerId = req.customer.customerId;

    const projects = await Project.find({
      customer: customerId,
    }).select("_id");

    const projectIds = projects.map((project) => project._id);

    const rfqs = await populateRFQ(
      RFQ.find({
        project: { $in: projectIds },
      }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: rfqs.length,
      rfqs,
    });
  } catch (error) {
    console.error("Fetch customer RFQs error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve your RFQs.",
    });
  }
});

// Get all RFQs
router.get("/", adminAuth, async (req, res) => {
  try {
    const rfqs = await populateRFQ(
      RFQ.find().sort({ createdAt: -1 })
    );

    res.json({
      success: true,
      count: rfqs.length,
      rfqs,
    });
  } catch (error) {
    console.error("Fetch RFQs error:", error);
    res.status(500).json({
      message: "Could not retrieve RFQs.",
    });
  }
});

// GET: View RFQs assigned to the authenticated manufacturer
router.get('/supplier/my-rfqs', manufacturerAuth, async (req, res) => {
  try {
    const manufacturerId = req.manufacturer.manufacturerId;

    const rfqs = await RFQ.find({
      'quotations.manufacturer': manufacturerId,
    })
      .populate('project')
      .populate('quotations.manufacturer')
      .sort({ createdAt: -1 });

    const supplierRFQs = rfqs.map((rfq) => {
      const quotation = rfq.quotations.find(
        (item) =>
          item.manufacturer &&
          item.manufacturer._id.toString() === manufacturerId
      );

      return {
        _id: rfq._id,
        title: rfq.title,
        quantity: rfq.quantity,
        material: rfq.material,
        process: rfq.process,
        deliveryLocation: rfq.deliveryLocation,
        deliveryDeadline: rfq.deliveryDeadline,
        quotationDeadline: rfq.quotationDeadline,
        status: rfq.status,
        isAwarded: Boolean(rfq.selectedManufacturer),
        project: rfq.project,
        quotation,
      };
    });

    res.status(200).json({
      success: true,
      count: supplierRFQs.length,
      rfqs: supplierRFQs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve supplier RFQs.',
    });
  }
});

// Get one RFQ
router.get("/:rfqId", adminAuth, async (req, res) => {
  try {
    const { rfqId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(rfqId)) {
      return res.status(400).json({
        message: "Invalid RFQ ID.",
      });
    }

    const rfq = await populateRFQ(
      RFQ.findById(rfqId)
    );

    if (!rfq) {
      return res.status(404).json({
        message: "RFQ not found.",
      });
    }

    res.json({
      success: true,
      rfq,
    });
  } catch (error) {
    console.error("Fetch single RFQ error:", error);
    res.status(500).json({
      message: "Could not retrieve RFQ.",
    });
  }
});

// Submit or decline a manufacturer's quotation
router.patch(
  '/:rfqId/quotations/:manufacturerId',
  manufacturerAuth,
  async (req, res) => {
    try {
      const { rfqId, manufacturerId } = req.params;

      if (
          req.manufacturer.manufacturerId !== manufacturerId
        ) {
          return res.status(403).json({
            success: false,
            message: 'You can only respond to RFQs assigned to your account.',
          });
        }

      const {
        status,
        unitPrice,
        totalPrice,
        currency,
        leadTime,
        paymentTerms,
        notes,
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(rfqId) ||
        !mongoose.Types.ObjectId.isValid(manufacturerId)
      ) {
        return res.status(400).json({
          message: "Invalid RFQ or manufacturer ID.",
        });
      }

      if (!["Submitted", "Declined"].includes(status)) {
        return res.status(400).json({
          message: "Status must be Submitted or Declined.",
        });
      }

      const rfq = await RFQ.findById(rfqId);

      if (!rfq) {
        return res.status(404).json({
          message: "RFQ not found.",
        });
      }

      if (["Cancelled", "Completed"].includes(rfq.status)) {
        return res.status(400).json({
          message: "This RFQ is no longer accepting responses.",
        });
      }

      if (
        rfq.quotationDeadline &&
        new Date() > new Date(rfq.quotationDeadline)
      ) {
        return res.status(400).json({
          message: "The quotation submission deadline has passed.",
        });
      }

      const quotation = rfq.quotations.find(
        (item) =>
          item.manufacturer.toString() === manufacturerId
      );

      if (!quotation) {
        return res.status(404).json({
          message: "Manufacturer is not assigned to this RFQ.",
        });
      }

      if (quotation.status !== "Pending") {
        return res.status(400).json({
          message: "This manufacturer has already responded.",
        });
      }

      if (status === "Submitted") {
        const price = Number(unitPrice);

        if (
          unitPrice === undefined ||
          unitPrice === "" ||
          !Number.isFinite(price) ||
          price < 0
        ) {
          return res.status(400).json({
            message: "Enter a valid unit price.",
          });
        }

        let finalTotal;

        if (totalPrice === undefined || totalPrice === "") {
          finalTotal = price * rfq.quantity;
        } else {
          finalTotal = Number(totalPrice);

          if (
            !Number.isFinite(finalTotal) ||
            finalTotal < 0
          ) {
            return res.status(400).json({
              message: "Enter a valid total price.",
            });
          }
        }

        quotation.unitPrice = price;
        quotation.totalPrice = finalTotal;
        quotation.currency = currency || "USD";
        quotation.leadTime = leadTime;
        quotation.paymentTerms = paymentTerms;
        quotation.notes = notes;
        quotation.submittedAt = new Date();
      }

      quotation.status = status;

      const allResponded = rfq.quotations.every(
        (item) => item.status !== "Pending"
      );

      rfq.status = allResponded ? "Completed" : "Sent";

      await rfq.save();

      // Notify the customer when a supplier submits or declines a quotation.
      try {
        const project = await Project.findById(rfq.project).select(
          "customer productName"
        );

        if (project && project.customer) {
          const submitted = status === "Submitted";

          await Notification.create({
            recipientType: "Customer",
            recipient: project.customer,
            type: submitted ? "QUOTATION_SUBMITTED" : "QUOTATION_DECLINED",
            title: submitted ? "New Supplier Quotation" : "Supplier Declined RFQ",
            message: submitted
              ? `A supplier has submitted a quotation for "${rfq.title}".`
              : `A supplier has declined to quote for "${rfq.title}".`,
            relatedRFQ: rfq._id,
            relatedProject: project._id,
          });
        }
      } catch (notificationError) {
        console.error(
          "Customer quotation notification failed:",
          notificationError.message
        );
      }

      const updatedRFQ = await populateRFQ(
        RFQ.findById(rfqId)
      );

      res.json({
        success: true,
        message: "Quotation updated successfully.",
        rfq: updatedRFQ,
      });
    } catch (error) {
      console.error("Update quotation error:", error);
      res.status(500).json({
        message: "Could not update quotation.",
      });
    }
  }
);

// Award an RFQ to a manufacturer (project owner only)
router.patch("/customer/:rfqId/award", customerAuth, async (req, res) => {
  try {
    const { rfqId } = req.params;
    const { manufacturerId } = req.body;
    const customerId = req.customer.customerId;

    if (
      !mongoose.Types.ObjectId.isValid(rfqId) ||
      !mongoose.Types.ObjectId.isValid(manufacturerId || "")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid RFQ or manufacturer ID.",
      });
    }

    const rfq = await RFQ.findById(rfqId);

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found.",
      });
    }

    const project = await Project.findOne({
      _id: rfq.project,
      customer: customerId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found for this customer.",
      });
    }

    if (rfq.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "A cancelled RFQ cannot be awarded.",
      });
    }

    if (rfq.selectedManufacturer) {
      return res.status(409).json({
        success: false,
        message: "This RFQ has already been awarded.",
      });
    }

    const deadlinePassed =
      rfq.quotationDeadline &&
      new Date() > new Date(rfq.quotationDeadline);

    const pendingSuppliers = rfq.quotations.filter(
      (item) => item.status === "Pending"
    );

    if (pendingSuppliers.length > 0 && !deadlinePassed) {
      return res.status(409).json({
        success: false,
        message:
          "This RFQ cannot be awarded while invited suppliers are still pending. Wait until all suppliers respond or the quotation deadline passes.",
        pendingSuppliers: pendingSuppliers.length,
      });
    }

    const submittedQuotations = rfq.quotations.filter(
      (item) => item.status === "Submitted"
    );

    if (submittedQuotations.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This RFQ cannot be awarded without a submitted quotation.",
      });
    }

    const quotation = rfq.quotations.find(
      (item) => item.manufacturer.toString() === manufacturerId
    );

    if (!quotation || quotation.status !== "Submitted") {
      return res.status(400).json({
        success: false,
        message: "Only a manufacturer with a submitted quotation can be selected.",
      });
    }

    const awardTime = new Date();

    const awardConditions = {
      _id: rfq._id,
      status: { $ne: "Cancelled" },
      $or: [
        { selectedManufacturer: null },
        { selectedManufacturer: { $exists: false } },
      ],
      $and: [
        {
          quotations: {
            $elemMatch: {
              manufacturer: manufacturerId,
              status: "Submitted",
            },
          },
        },
      ],
    };

    if (pendingSuppliers.length > 0 && !deadlinePassed) {
      awardConditions.$and.push({
        quotations: {
          $not: { $elemMatch: { status: "Pending" } },
        },
      });
    }

    const awardedRFQ = await RFQ.findOneAndUpdate(
      awardConditions,
      {
        $set: {
          selectedManufacturer: manufacturerId,
          awardedAt: awardTime,
          status: "Completed",
        },
      },
      { new: true, runValidators: true }
    );

    if (!awardedRFQ) {
      return res.status(409).json({
        success: false,
        message:
          "The RFQ could not be awarded because its status or supplier responses changed. Refresh and try again.",
      });
    }

    try {
      await Notification.create({
        recipientType: "Manufacturer",
        recipient: manufacturerId,
        type: "RFQ_AWARDED",
        title: "Congratulations! RFQ Awarded",
        message: `Your quotation for "${awardedRFQ.title}" has been selected. The buyer has awarded this RFQ to your company.`,
        relatedRFQ: awardedRFQ._id,
        relatedProject: awardedRFQ.project,
      });
    } catch (notificationError) {
      console.error(
        "Customer RFQ award notification failed:",
        notificationError.message
      );
    }

    const populatedRFQ = await populateRFQ(
      RFQ.findById(awardedRFQ._id)
    );

    return res.json({
      success: true,
      message: "Supplier successfully selected for this RFQ.",
      rfq: populatedRFQ,
    });
  } catch (error) {
    console.error("Customer award RFQ error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not award this RFQ.",
    });
  }
});

// Award an RFQ to a manufacturer (administrator only)
router.patch("/:rfqId/award", adminAuth, async (req, res) => {
  try {
    const { rfqId } = req.params;
    const { manufacturerId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(rfqId) ||
      !mongoose.Types.ObjectId.isValid(manufacturerId || "")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid RFQ or manufacturer ID.",
      });
    }

    const rfq = await RFQ.findById(rfqId);

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found.",
      });
    }

    if (rfq.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "A cancelled RFQ cannot be awarded.",
      });
    }

    if (rfq.selectedManufacturer) {
      return res.status(409).json({
        success: false,
        message: "This RFQ has already been awarded.",
      });
    }

    // Ensure suppliers have a fair opportunity to respond.
    const deadlinePassed =
      rfq.quotationDeadline &&
      new Date() > new Date(rfq.quotationDeadline);

    const pendingSuppliers = rfq.quotations.filter(
      (item) => item.status === "Pending"
    );

    if (pendingSuppliers.length > 0 && !deadlinePassed) {
      return res.status(409).json({
        success: false,
        message:
          "This RFQ cannot be awarded while invited suppliers are still pending. Wait until all suppliers respond or the quotation deadline passes.",
        pendingSuppliers: pendingSuppliers.length,
      });
    }

    const submittedQuotations = rfq.quotations.filter(
      (item) => item.status === "Submitted"
    );

    if (submittedQuotations.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This RFQ cannot be awarded without a submitted quotation.",
      });
    }

    const quotation = rfq.quotations.find(
      (item) =>
        item.manufacturer.toString() === manufacturerId
    );

    if (!quotation || quotation.status !== "Submitted") {
      return res.status(400).json({
        success: false,
        message: "Only a manufacturer with a submitted quotation can be selected.",
      });
    }

    const awardTime = new Date();

    const awardConditions = {
      _id: rfq._id,
      status: { $ne: "Cancelled" },
      $or: [
        { selectedManufacturer: null },
        { selectedManufacturer: { $exists: false } },
      ],
      $and: [
        {
          quotations: {
            $elemMatch: {
              manufacturer: manufacturerId,
              status: "Submitted",
            },
          },
        },
      ],
    };

    if (pendingSuppliers.length > 0 && !deadlinePassed) {
      awardConditions.$and.push({
        quotations: {
          $not: { $elemMatch: { status: "Pending" } },
        },
      });
    }

    const awardedRFQ = await RFQ.findOneAndUpdate(
      awardConditions,
      {
        $set: {
          selectedManufacturer: manufacturerId,
          awardedAt: awardTime,
          status: "Completed",
        },
      },
      { new: true, runValidators: true }
    );

    if (!awardedRFQ) {
      return res.status(409).json({
        success: false,
        message:
          "The RFQ could not be awarded because its status or supplier responses changed. Refresh and try again.",
      });
    }

    // Notify the selected manufacturer only after the award is saved.
    try {
      await Notification.create({
        recipientType: "Manufacturer",
        recipient: manufacturerId,
        type: "RFQ_AWARDED",
        title: "Congratulations! RFQ Awarded",
        message: `Your quotation for "${awardedRFQ.title}" has been selected. The buyer has awarded this RFQ to your company.`,
        relatedRFQ: awardedRFQ._id,
        relatedProject: awardedRFQ.project,
      });
    } catch (notificationError) {
      console.error(
        "RFQ award notification failed:",
        notificationError.message
      );
    }

    const populatedRFQ = await populateRFQ(
      RFQ.findById(awardedRFQ._id)
    );

    return res.json({
      success: true,
      message: "Supplier successfully selected for this RFQ.",
      rfq: populatedRFQ,
    });
  } catch (error) {
    console.error("Award RFQ error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not award this RFQ.",
    });
  }
});
module.exports = router;
