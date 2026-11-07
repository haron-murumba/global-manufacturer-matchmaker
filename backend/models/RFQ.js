
const mongoose = require("mongoose");

const supplierQuotationSchema = new mongoose.Schema(
  {
    manufacturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manufacturer",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Submitted", "Declined"],
      default: "Pending",
    },
    unitPrice: {
      type: Number,
      min: 0,
    },
    totalPrice: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    leadTime: {
      type: String,
    },
    paymentTerms: {
      type: String,
    },
    notes: {
      type: String,
    },
    submittedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const rfqSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    material: String,
    process: String,
    deliveryLocation: String,
    deliveryDeadline: Date,
    quotationDeadline: Date,
    specifications: String,
    status: {
      type: String,
      enum: ["Draft", "Sent", "Completed", "Cancelled"],
      default: "Draft",
    },
    quotations: [supplierQuotationSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("RFQ", rfqSchema);

