
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    productCategory: {
      type: String,
      trim: true,
      default: '',
    },

    productCategories: {
      type: [String],
      default: [],
    },

    description: {
      type: String,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    material: {
      type: String,
      trim: true,
    },

    process: {
      type: String,
      trim: true,
    },

    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      unit: {
        type: String,
        enum: ['', 'mm', 'cm', 'in'],
        default: '',
      },
    },

    technicalRequirements: {
      tolerances: { type: String, trim: true, default: '' },
      surfaceFinish: { type: String, trim: true, default: '' },
      standards: { type: String, trim: true, default: '' },
      certifications: { type: String, trim: true, default: '' },
      additionalRequirements: { type: String, trim: true, default: '' },
    },

    // Existing records retain the default Confirmed status for compatibility.
    // New customer projects explicitly start as Customer Review.
    specificationStatus: {
      type: String,
      enum: ['Customer Review', 'Confirmed'],
      default: 'Confirmed',
    },

    specificationsConfirmedAt: {
      type: Date,
      default: null,
    },

    specificationsConfirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },

    cadFile: {
      originalName: String,
      filePath: String,
      fileType: String,
      publicId: String,
    },

    status: {
      type: String,
      enum: ['Draft', 'Processing', 'Ready for Matching', 'Completed'],
      default: 'Draft',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Project', projectSchema);
