const express = require("express");
const mongoose = require("mongoose");

const RFQ = require("../models/RFQ");
const Project = require("../models/Project");
const Manufacturer = require("../models/Manufacturer");

const router = express.Router();

// Create an RFQ and assign it to verified manufacturers
router.post("/", async (req, res) => {
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

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "A valid project is required." });
    }

    if (!title || !quantity || Number(quantity) < 1) {
      return res.status(400).json({
        message: "RFQ title and a valid quantity are required.",
      });
    }

    if (!Array.isArray(manufacturerIds) || manufacturerIds.length === 0) {
      return res.status(400).json({
        message: "Select at least one manufacturer.",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const uniqueIds = [...new Set(manufacturerIds.map(String))];

    if (uniqueIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({
        message: "One or more manufacturer IDs are invalid.",
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
      title,
      quantity: Number(quantity),
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

    const populatedRFQ = await RFQ.findById(rfq._id)
      .populate("project", "productName quantity material process")
      .populate(
        "quotations.manufacturer",
        "companyName country city contactEmail"
      );

    res.status(201).json({
      success: true,
      message: "RFQ created and assigned to selected manufacturers.",
      rfq: populatedRFQ,
    });
  } catch (error) {
    console.error("Create RFQ error:", error);
    res.status(500).json({ message: "Could not create RFQ." });
  }
});

// Get all RFQs
router.get("/", async (req, res) => {
  try {
    const rfqs = await RFQ.find()
      .populate("project", "productName quantity material process")
      .populate(
        "quotations.manufacturer",
        "companyName country city contactEmail"
      )
      .sort({ createdAt: -1 });

    res.json({ success: true, count: rfqs.length, rfqs });
  } catch (error) {
    console.error("Fetch RFQs error:", error);
    res.status(500).json({ message: "Could not retrieve RFQs." });
  }
});

// Submit or decline a manufacturer's quotation
router.patch("/:rfqId/quotations/:manufacturerId", async (req, res) => {
  try {
    const { rfqId, manufacturerId } = req.params;
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
      return res.status(400).json({ message: "Invalid RFQ or manufacturer ID." });
    }

    if (!["Submitted", "Declined"].includes(status)) {
      return res.status(400).json({
        message: "Quotation status must be Submitted or Declined.",
      });
    }

    if (status === "Submitted" && (unitPrice === undefined || Number(unitPrice) < 0 || unitPrice === "")) {
      return res.status(400).json({
        message: "Enter a valid unit price for the quotation.",
      });
    }

    const rfq = await RFQ.findById(rfqId);

    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found." });
    }

    const quotation = rfq.quotations.find(
      (item) => item.manufacturer.toString() === manufacturerId
    );

    if (!quotation) {
      return res.status(404).json({
        message: "This manufacturer is not assigned to the RFQ.",
      });
    }

    quotation.status = status;

    if (status === "Submitted") {
      quotation.unitPrice = Number(unitPrice);
      quotation.totalPrice =
        totalPrice === undefined || totalPrice === ""
          ? undefined
          : Number(totalPrice);
      quotation.currency = currency || "USD";
      quotation.leadTime = leadTime;
      quotation.paymentTerms = paymentTerms;
      quotation.notes = notes;
      quotation.submittedAt = new Date();
    }

    const allResponded = rfq.quotations.every(
      (item) => item.status !== "Pending"
    );

    if (allResponded) {
      rfq.status = "Completed";
    }

    await rfq.save();

    const updatedRFQ = await RFQ.findById(rfqId)
      .populate("project", "productName quantity material process")
      .populate(
        "quotations.manufacturer",
        "companyName country city contactEmail"
      );

    res.json({
      success: true,
      message: "Quotation updated successfully.",
      rfq: updatedRFQ,
    });
  } catch (error) {
    console.error("Update quotation error:", error);
    res.status(500).json({ message: "Could not update quotation." });
  }
});

module.exports = router;
