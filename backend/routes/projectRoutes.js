
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const Project = require('../models/Project');
const cloudinary = require('../config/cloudinary');

const storage = multer.memoryStorage();

const allowedExtensions = ['.step', '.stp', '.iges', '.igs', '.pdf'];

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error('Only STEP, STP, IGES, IGS and PDF files are allowed.'));
    }
  },
});

// Upload a CAD file to Cloudinary.
function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const safeName = path.basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9_-]/g, '-');

    const publicId = `${Date.now()}-${safeName}${extension}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'gmm/cad-files',
        resource_type: 'raw',
        type: 'private',
        public_id: publicId,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(file.buffer);
  });
}

// GET: Generate a temporary secure CAD download URL.
router.get('/:id/cad-file', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project || !project.cadFile?.publicId) {
      return res.status(404).json({
        success: false,
        message: 'CAD file or Cloudinary public ID not found.',
      });
    }

    const url = cloudinary.utils.private_download_url(
      project.cadFile.publicId,
      project.cadFile.fileType.replace('.', ''),
      {
        resource_type: 'raw',
        type: 'private',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }
    );

    res.json({
      success: true,
      url,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to generate CAD download link.',
      error: error.message,
    });
  }
});

// GET: Retrieve all projects.
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve projects',
      error: error.message,
    });
  }
});

// PUT: Edit project details and optionally replace its CAD file.
router.put('/:id', upload.single('cadFile'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.',
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const allowedFields = [
      'productName',
      'description',
      'quantity',
      'material',
      'process',
      'status',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    }

    // Replace CAD file only when a new file is uploaded.
    if (req.file) {
      const uploadedFile = await uploadToCloudinary(req.file);

      project.cadFile = {
        originalName: req.file.originalname,
        filePath: uploadedFile.secure_url,
        fileType: path.extname(req.file.originalname).toLowerCase(),
        publicId: uploadedFile.public_id,
      };
    }

    await project.save();

    res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      project,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update project.',
      error: error.message,
    });
  }
});

// POST: Create a project with a required CAD/specification file.
router.post('/', upload.single('cadFile'), async (req, res) => {
  try {
    const {
      productName,
      description,
      quantity,
      material,
      process,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a CAD file or specification sheet.',
      });
    }

    const uploadedFile = await uploadToCloudinary(req.file);

    const project = await Project.create({
      productName,
      description,
      quantity,
      material,
      process,
      cadFile: {
        originalName: req.file.originalname,
        filePath: uploadedFile.secure_url,
        fileType: path.extname(req.file.originalname).toLowerCase(),
        publicId: uploadedFile.public_id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Project created and CAD file uploaded successfully.',
      project,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create project.',
      error: error.message,
    });
  }
});

module.exports = router;
