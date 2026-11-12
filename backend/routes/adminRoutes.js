
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Manufacturer = require('../models/Manufacturer');
const Notification = require('../models/Notification');
const adminAuth = require('../middleware/adminAuth');
const crypto = require('crypto');

const { rateLimit } = require('express-rate-limit');

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

const router = express.Router();

// POST: Administrator login
router.post('/login', adminLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash || !process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Administrator authentication is not configured.',
      });
    }

    if (email.trim().toLowerCase() !== adminEmail.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const passwordIsValid = await bcrypt.compare(
      password,
      adminPasswordHash
    );

    if (!passwordIsValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = jwt.sign(
      {
        email: adminEmail,
        role: 'admin',
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      success: true,
      message: 'Administrator login successful.',
      token,
      admin: {
        email: adminEmail,
        role: 'admin',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Administrator login failed.',
    });
  }
});

// GET: View manufacturers awaiting verification
router.get('/manufacturers/pending', adminAuth, async (req, res) => {
  try {
    const manufacturers = await Manufacturer.find({
        verificationStatus: {
            $in: ['Under Review', 'Unverified'],
        },
    }).select('-verificationDocuments.publicId');

    res.status(200).json({
      success: true,
      count: manufacturers.length,
      manufacturers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending manufacturers.',
    });
  }
});

// GET: View verified manufacturers who have not activated their accounts
router.get('/manufacturers/awaiting-activation', adminAuth, async (req, res) => {
  try {
    const manufacturers = await Manufacturer.find({
      verificationStatus: 'Verified',
      passwordHash: { $exists: false },
    }).select('-verificationDocuments.publicId');

    res.status(200).json({
      success: true,
      count: manufacturers.length,
      manufacturers,
    });
  } catch (error) {
    console.error('Awaiting activation retrieval error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve manufacturers awaiting activation.',
    });
  }
});

// PATCH: Approve or reject a manufacturer
router.patch('/manufacturers/:id/review', adminAuth, async (req, res) => {
  try {
    const { decision, reviewNotes, rejectionReason } = req.body;

    if (!['Verified', 'Rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Decision must be Verified or Rejected.',
      });
    }

    if (decision === 'Rejected' && !rejectionReason?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is required.',
      });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid manufacturer ID.',
      });
    }

    const manufacturer = await Manufacturer.findById(req.params.id).select('+passwordHash');

    if (!manufacturer) {
      return res.status(404).json({
        success: false,
        message: 'Manufacturer not found.',
      });
    }

    if (!['Under Review', 'Unverified'].includes(manufacturer.verificationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Only unverified or under-review manufacturers can be reviewed.',
    });
}

    manufacturer.verificationStatus = decision;
    manufacturer.reviewedBy = req.admin.email;
    manufacturer.reviewedAt = new Date();
    manufacturer.reviewNotes = reviewNotes?.trim() || '';
    manufacturer.rejectionReason =
      decision === 'Rejected' ? rejectionReason.trim() : '';

    await manufacturer.save();

        // Notify manufacturer about the admin's review decision.
    try {
      await Notification.create({
        recipientType: "Manufacturer",
        recipient: manufacturer._id,
        type:
          decision === "Verified"
            ? "MANUFACTURER_APPROVED"
            : "MANUFACTURER_REJECTED",
        title:
          decision === "Verified"
            ? "Manufacturer Account Approved"
            : "Manufacturer Application Rejected",
        message:
          decision === "Verified"
            ? "Your manufacturer account has been approved. You can now access verified manufacturer opportunities."
            : `Your manufacturer application was rejected. Reason: ${rejectionReason.trim()}`,
      });
    } catch (notificationError) {
      console.error(
        "Manufacturer review notification failed:",
        notificationError.message
      );
    }

    res.status(200).json({
      success: true,
      message: `Manufacturer ${decision.toLowerCase()} successfully.`,
      manufacturer: {
        id: manufacturer._id,
        companyName: manufacturer.companyName,
        verificationStatus: manufacturer.verificationStatus,
        reviewedBy: manufacturer.reviewedBy,
        reviewedAt: manufacturer.reviewedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Manufacturer review failed.',
    });
  }
});

// POST: Generate a one-time manufacturer activation token
router.post(
  '/manufacturers/:id/activation-token',
  adminAuth,
  async (req, res) => {
    try {

      if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid manufacturer ID.',
          });
        }
      const manufacturer = await Manufacturer.findById(req.params.id);

      if (!manufacturer) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturer not found.',
        });
      }

      if (manufacturer.verificationStatus !== 'Verified') {
        return res.status(403).json({
          success: false,
          message: 'Only verified manufacturers can activate accounts.',
        });
      }

      if (manufacturer.passwordHash) {
        return res.status(400).json({
          success: false,
          message: 'Manufacturer account is already activated.',
        });
      }

      const activationToken = crypto.randomBytes(32).toString('hex');

      manufacturer.activationTokenHash = crypto
        .createHash('sha256')
        .update(activationToken)
        .digest('hex');

      manufacturer.activationExpiresAt = new Date(
        Date.now() + 30 * 60 * 1000
      );

      await manufacturer.save();

      res.status(200).json({
        success: true,
        message: 'Activation token generated. Share it securely with the manufacturer.',
        activationToken,
        expiresInMinutes: 30,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate activation token.',
      });
    }
  }
);

module.exports = router;
