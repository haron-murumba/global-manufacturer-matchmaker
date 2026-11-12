

const express = require('express');
const router = express.Router();

const Manufacturer = require('../models/Manufacturer');
const Project = require('../models/Project');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  findManufacturerMatches,
} = require('../services/manufacturerMatching');

// POST: Manufacturer login
router.post('/login', async (req, res) => {
  try {
    const { contactEmail, password } = req.body;

    if (!contactEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const manufacturer = await Manufacturer.findOne({
      contactEmail: contactEmail.trim().toLowerCase(),
      verificationStatus: 'Verified',
      passwordHash: { $exists: true, $ne: null },
    }).select('+passwordHash');

    if (!manufacturer || !manufacturer.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or supplier account not yet activated.',
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      manufacturer.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    if (manufacturer.verificationStatus !== 'Verified') {
      return res.status(403).json({
        success: false,
        message: 'Your manufacturer account must be verified before accessing RFQs.',
      });
    }

    const token = jwt.sign(
      {
        manufacturerId: manufacturer._id,
        role: 'manufacturer',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Manufacturer login successful.',
      token,
      manufacturer: {
        id: manufacturer._id,
        companyName: manufacturer.companyName,
        contactEmail: manufacturer.contactEmail,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Manufacturer login failed.',
    });
  }
});

// POST: Activate manufacturer account
router.post('/activate', async (req, res) => {
  try {
    const { contactEmail, activationToken, password } = req.body;

    if (!contactEmail || !activationToken || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, activation token and password are required.',
      });
    }

    if (typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 12 characters.',
      });
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(activationToken)
      .digest('hex');

    const manufacturer = await Manufacturer.findOne({
      contactEmail: contactEmail.trim().toLowerCase(),
      verificationStatus: 'Verified',
      activationTokenHash: tokenHash,
      activationExpiresAt: { $gt: new Date() },
    }).select('+activationTokenHash +activationExpiresAt +passwordHash');

    if (!manufacturer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired activation details.',
      });
    }

    if (manufacturer.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'Account is already activated.',
      });
    }

    manufacturer.passwordHash = await bcrypt.hash(password, 12);
    manufacturer.activationTokenHash = undefined;
    manufacturer.activationExpiresAt = undefined;

    await manufacturer.save();

    res.status(200).json({
      success: true,
      message: 'Manufacturer account activated. You can now log in.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Account activation failed.',
    });
  }
});

// GET: View verified manufacturers (public access)
router.get("/", async (req, res) => {
  try {
    const manufacturers = await Manufacturer.find({
      verificationStatus: 'Verified',
    })
      .select(
        '-verificationDocuments ' +
        '-verificationSubmittedAt ' +
        '-reviewedBy ' +
        '-reviewedAt ' +
        '-reviewNotes ' +
        '-rejectionReason'
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: manufacturers.length,
      manufacturers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve manufacturers',
    });
  }
});

// GET: Match a project with suitable manufacturers
router.get('/match/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID',
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const manufacturers = await Manufacturer.find({
      verificationStatus: 'Verified',
    });

    const matches = findManufacturerMatches(
      project,
      manufacturers
    );

    res.status(200).json({
      success: true,
      project: {
        id: project._id,
        productName: project.productName,
        quantity: project.quantity,
        material: project.material,
        process: project.process,
      },
      count: matches.length,
      matches,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to match manufacturers',
      error: error.message,
    });
  }
});

// POST: Register a manufacturer
router.post('/', async (req, res) => {
  try {
    const {
      companyName,
      country,
      city,
      website,
      contactEmail,
      capabilities,
      manufacturingProcesses,
      materials,
      productCategories,
      minimumOrderQuantity,
      smallOrderResponsiveness,
      notes,
    } = req.body;

    const manufacturer = await Manufacturer.create({
      companyName,
      country,
      city,
      website,
      contactEmail: contactEmail.trim().toLowerCase(),
      capabilities,
      manufacturingProcesses,
      materials,
      productCategories,
      minimumOrderQuantity,
      smallOrderResponsiveness,
      notes,
      verificationStatus: 'Unverified',
    });

    res.status(201).json({
      success: true,
      message: 'Manufacturer registered successfully',
      manufacturer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to register manufacturer',
      error: error.message,
    });
  }
});

module.exports = router;
