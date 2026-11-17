const express = require("express");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const customerAuth = require("../middleware/customerAuth");

const router = express.Router();

router.use(customerAuth);

// GET: Retrieve notifications for the authenticated customer.
router.get("/", async (req, res) => {
  try {
    const customerId = req.customer.customerId;

    const filter = {
      recipientType: "Customer",
      recipient: customerId,
    };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      ...filter,
      isRead: false,
    });

    return res.json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("Fetch customer notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve notifications.",
    });
  }
});

// PATCH: Mark one customer's notification as read.
router.patch("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.customer.customerId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        recipientType: "Customer",
        recipient: customerId,
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

    return res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Mark customer notification as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update notification.",
    });
  }
});

// PATCH: Mark all notifications belonging to this customer as read.
router.patch("/read-all", async (req, res) => {
  try {
    const customerId = req.customer.customerId;

    await Notification.updateMany(
      {
        recipientType: "Customer",
        recipient: customerId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return res.json({
      success: true,
      message: "All customer notifications marked as read.",
    });
  } catch (error) {
    console.error("Mark all customer notifications as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update notifications.",
    });
  }
});

module.exports = router;
