
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      enum: ["Manufacturer", "Buyer", "Admin"],
      required: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recipientType",
    },

    type: {
      type: String,
      required: true,
      enum: [
        "RFQ_ASSIGNED",
        "QUOTATION_SUBMITTED",
        "QUOTATION_DECLINED",
        "RFQ_AWARDED",
        "RFQ_CANCELLED",
        "MANUFACTURER_APPROVED",
        "MANUFACTURER_REJECTED",
        "GENERAL",
      ],
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    relatedRFQ: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RFQ",
      default: null,
    },

    relatedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({
  recipientType: 1,
  recipient: 1,
  isRead: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Notification", notificationSchema);
