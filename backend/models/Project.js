
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
