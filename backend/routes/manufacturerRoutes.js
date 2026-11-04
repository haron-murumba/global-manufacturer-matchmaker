
const express = require('express');
const router = express.Router();

const Manufacturer = require('../models/Manufacturer');
const Project = require('../models/Project');
const {
  findManufacturerMatches,
} = require('../services/manufacturerMatching');

// GET: View verified manufacturers (public access)
router.get('/', async (req, res) => {
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
      contactEmail,
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
