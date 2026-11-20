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
      enum: ["USD", "EUR", "GBP", "KES", "CNY"],
      default: "USD",
      uppercase: true,
      trim: true,
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
    respondedAt: {
      type: Date,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manufacturer",
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
    currency: {
      type: String,
      enum: ["USD", "EUR", "GBP", "KES", "CNY"],
      default: "USD",
      uppercase: true,
      trim: true,
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
    selectedManufacturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manufacturer",
      default: null,
    },
    awardedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Only one active sourcing round per project.
// Completed and Cancelled RFQs do not prevent a new round.
rfqSchema.index(
  { project: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["Draft", "Sent"] },
    },
    name: "one_active_rfq_per_project",
  }
);

module.exports = mongoose.model("RFQ", rfqSchema);
