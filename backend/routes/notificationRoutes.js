
const express = require("express");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const manufacturerAuth = require("../middleware/manufacturerAuth");

const router = express.Router();

// All notification endpoints require manufacturer authentication.
router.use(manufacturerAuth);

// GET: Retrieve notifications for the logged-in manufacturer.
router.get("/", async (req, res) => {
  try {
    const manufacturerId = req.manufacturer.manufacturerId;

    const notifications = await Notification.find({
      recipientType: "Manufacturer",
      recipient: manufacturerId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipientType: "Manufacturer",
      recipient: manufacturerId,
      isRead: false,
    });

    res.json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve notifications.",
    });
  }
});

// PATCH: Mark one notification as read.
router.patch("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const manufacturerId = req.manufacturer.manufacturerId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        recipientType: "Manufacturer",
        recipient: manufacturerId,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to update notification.",
    });
  }
});

// PATCH: Mark all notifications as read.
router.patch("/read-all", async (req, res) => {
  try {
    const manufacturerId = req.manufacturer.manufacturerId;

    await Notification.updateMany(
      {
        recipientType: "Manufacturer",
        recipient: manufacturerId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    res.json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to update notifications.",
    });
  }
});

module.exports = router;
