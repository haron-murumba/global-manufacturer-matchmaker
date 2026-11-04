
const mongoose = require('mongoose');

const verificationDocumentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: [
        'Company Registration',
        'Business License',
        'Manufacturing Capability Evidence',
        'Other',
      ],
      required: true,
    },

    originalFilename: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      required: true,
    },

    resourceType: {
      type: String,
      default: 'raw',
    },

    format: {
      type: String,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const manufacturerSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
    },

    contactEmail: {
      type: String,
      trim: true,
    },

    capabilities: [{ type: String }],

    manufacturingProcesses: [{ type: String }],

    materials: [{ type: String }],

    productCategories: [{ type: String }],

    minimumOrderQuantity: {
      type: Number,
      min: 1,
    },

    smallOrderResponsiveness: {
      type: String,
      enum: ['Yes', 'No', 'Unknown'],
      default: 'Unknown',
    },

    verificationStatus: {
      type: String,
      enum: ['Unverified', 'Under Review', 'Verified', 'Rejected'],
      default: 'Unverified',
    },

    verificationDocuments: {
      type: [verificationDocumentSchema],
      default: [],
    },

    verificationSubmittedAt: {
      type: Date,
    },

    reviewedBy: {
      type: String,
      trim: true,
    },

    reviewedAt: {
      type: Date,
    },

    reviewNotes: {
      type: String,
      trim: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Manufacturer', manufacturerSchema);
