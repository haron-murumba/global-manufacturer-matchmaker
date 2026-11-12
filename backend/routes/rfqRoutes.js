

const express = require("express");
const mongoose = require("mongoose");

const RFQ = require("../models/RFQ");
const Project = require("../models/Project");
const Manufacturer = require("../models/Manufacturer");
const Notification = require("../models/Notification");
const manufacturerAuth = require('../middleware/manufacturerAuth');
const adminAuth = require("../middleware/adminAuth");

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

    const manufacturers = await Manufacturer.find({
      _id: { $in: uniqueIds },
      verificationStatus: "Verified",
    });

    if (manufacturers.length !== uniqueIds.length) {
      return res.status(400).json({
        message: "All selected manufacturers must be verified.",
      });
    }

    const rfq = await RFQ.create({
      project: projectId,
      title: title.trim(),
      quantity: qty,
      material,
      process,
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

    rfq.selectedManufacturer = manufacturerId;
    rfq.awardedAt = new Date();
    rfq.status = "Completed";

        // Notify the selected manufacturer about the RFQ award.
    try {
      await Notification.create({
        recipientType: "Manufacturer",
        recipient: manufacturerId,
        type: "RFQ_AWARDED",
        title: "Congratulations! RFQ Awarded",
        message: `Your quotation for "${rfq.title}" has been selected. The buyer has awarded this RFQ to your company.`,
        relatedRFQ: rfq._id,
        relatedProject: rfq.project,
      });
    } catch (notificationError) {
      console.error(
        "RFQ award notification failed:",
        notificationError.message
      );
    }

    await rfq.save();

    const populatedRFQ = await populateRFQ(
      RFQ.findById(rfq._id)
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
