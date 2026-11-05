
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Manufacturer = require('../models/Manufacturer');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// POST: Administrator login
router.post('/login', async (req, res) => {
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

    const manufacturer = await Manufacturer.findById(req.params.id);

    if (!manufacturer) {
      return res.status(404).json({
        success: false,
        message: 'Manufacturer not found.',
      });
    }

    if (manufacturer.verificationStatus !== 'Under Review') {
      return res.status(400).json({
        success: false,
        message: 'Only manufacturers Under Review can be reviewed.',
      });
    }

    manufacturer.verificationStatus = decision;
    manufacturer.reviewedBy = req.admin.email;
    manufacturer.reviewedAt = new Date();
    manufacturer.reviewNotes = reviewNotes?.trim() || '';
    manufacturer.rejectionReason =
      decision === 'Rejected' ? rejectionReason.trim() : '';

    await manufacturer.save();

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

module.exports = router;
