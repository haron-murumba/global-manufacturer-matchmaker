
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const Project = require('../models/Project');
const RFQ = require('../models/RFQ');
const adminAuth = require('../middleware/adminAuth');
const customerAuth = require('../middleware/customerAuth');
const cloudinary = require('../config/cloudinary');

const PROJECT_STATUSES = [
  'Draft',
  'Processing',
  'Ready for Matching',
  'Completed',
];

function parseSpecificationObject(value, fieldName) {
  if (value === undefined) {
    return { value: undefined, error: null };
  }

  if (typeof value === 'string') {
    if (!value.trim()) {
      return { value: {}, error: null };
    }

    try {
      value = JSON.parse(value);
    } catch (error) {
      return {
        value: undefined,
        error: `${fieldName} must contain valid JSON.`,
      };
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      value: undefined,
      error: `${fieldName} must be an object.`,
    };
  }

  return { value, error: null };
}

function validateSpecificationDetails(dimensions, requirements) {
  if (dimensions) {
    for (const field of ['length', 'width', 'height']) {
      const value = dimensions[field];

      if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        (!Number.isFinite(Number(value)) || Number(value) < 0)
      ) {
        return `${field} must be a valid non-negative number.`;
      }
    }

    if (
      dimensions.unit !== undefined &&
      !['', 'mm', 'cm', 'in'].includes(dimensions.unit)
    ) {
      return 'Dimension unit must be mm, cm, or in.';
    }
  }

  if (requirements) {
    const allowed = [
      'tolerances',
      'surfaceFinish',
      'standards',
      'certifications',
      'additionalRequirements',
    ];

    for (const field of allowed) {
      if (
        requirements[field] !== undefined &&
        typeof requirements[field] !== 'string'
      ) {
        return `${field} must be text.`;
      }
    }
  }

  return null;
}

function normalizeDimensions(dimensions) {
  if (!dimensions) return undefined;

  const normalized = {};

  for (const field of ['length', 'width', 'height']) {
    const value = dimensions[field];

    normalized[field] =
      value === undefined || value === null || value === ''
        ? undefined
        : Number(value);
  }

  normalized.unit = dimensions.unit || '';
  return normalized;
}

function getProductCategories(body) {
  let categories = body.productCategories;

  if (typeof categories === 'string') {
    try {
      categories = JSON.parse(categories);
    } catch (error) {
      categories = [];
    }
  }

  if (Array.isArray(categories)) {
    return [...new Set(
      categories
        .filter((category) => typeof category === 'string')
        .map((category) => category.trim())
        .filter(Boolean)
    )];
  }

  if (typeof body.productCategory === 'string' && body.productCategory.trim()) {
    return [body.productCategory.trim()];
  }

  return [];
}

function validateProjectFields(body, isCreate = false) {
  if (isCreate || body.productName !== undefined) {
    if (typeof body.productName !== 'string' || !body.productName.trim()) {
      return 'Product name is required.';
    }
  }

  if (
    isCreate ||
    body.productCategory !== undefined ||
    body.productCategories !== undefined
  ) {
    if (getProductCategories(body).length === 0) {
      return 'Select at least one product category.';
    }
  }

  if (isCreate || body.quantity !== undefined) {
    const quantity = Number(body.quantity);

    if (
      body.quantity === '' ||
      body.quantity === undefined ||
      !Number.isFinite(quantity) ||
      quantity < 1
    ) {
      return 'Quantity must be a valid number greater than zero.';
    }
  }

  if (
    body.status !== undefined &&
    !PROJECT_STATUSES.includes(body.status)
  ) {
    return 'Invalid project status.';
  }

  return null;
}


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

// CUSTOMER ROUTES

// GET: Retrieve projects belonging only to the logged-in customer.
router.get('/mine', customerAuth, async (req, res) => {
  try {
    const projects = await Project.find({
      customer: req.customer.customerId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your projects.',
    });
  }
});

// POST: Create a project for the logged-in customer.
router.post('/mine', customerAuth, upload.single('cadFile'), async (req, res) => {
  let uploadedFile = null;

  try {
    const {
      productName,
      productCategory,
      description,
      quantity,
      material,
      process,
    } = req.body;

    const parsedDimensions = parseSpecificationObject(
      req.body.dimensions,
      'Dimensions'
    );
    const parsedRequirements = parseSpecificationObject(
      req.body.technicalRequirements,
      'Technical requirements'
    );

    const validationError =
      validateProjectFields(req.body, true) ||
      parsedDimensions.error ||
      parsedRequirements.error ||
      validateSpecificationDetails(
        parsedDimensions.value,
        parsedRequirements.value
      );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const allowedRegions = ["", "Africa", "Asia", "Europe", "North America", "South America", "Oceania"];
    const preferredRegion = String(req.body.preferredRegion || "").trim();
    const preferredCountry = String(req.body.preferredCountry || "").trim();

    if (!allowedRegions.includes(preferredRegion) || preferredCountry.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid manufacturing location preference.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a CAD file or specification sheet.',
      });
    }

    uploadedFile = await uploadToCloudinary(req.file);

    const productCategories = getProductCategories(req.body);

    const project = await Project.create({
      customer: req.customer.customerId,
      productName,
      productCategory: productCategories[0],
      productCategories,
      description,
      quantity,
      material,
      process,
      preferredRegion,
      preferredCountry,
      dimensions: normalizeDimensions(parsedDimensions.value),
      technicalRequirements: parsedRequirements.value,
      specificationStatus: 'Customer Review',
      specificationsConfirmedAt: null,
      specificationsConfirmedBy: null,
      cadFile: {
        originalName: req.file.originalname,
        filePath: uploadedFile.secure_url,
        fileType: path.extname(req.file.originalname).toLowerCase(),
        publicId: uploadedFile.public_id,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Your project was created successfully.',
      project,
    });
  } catch (error) {
    if (uploadedFile?.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedFile.public_id, {
          resource_type: 'raw',
          type: 'private',
        });
      } catch (cleanupError) {
        console.error('Customer CAD cleanup failed:', cleanupError.message);
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Failed to create your project.',
      error: error.message,
    });
  }
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
router.get('/:id/cad-file', adminAuth, async (req, res) => {
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
router.get('/', adminAuth, async (req, res) => {
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
router.put('/:id', adminAuth, upload.single('cadFile'), async (req, res) => {
  let newlyUploadedFile = null;

  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.',
      });
    }

    const validationError = validateProjectFields(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
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
      'productCategory',
      'description',
      'quantity',
      'material',
      'process',
    ];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    }

    if (
      req.body.productCategories !== undefined ||
      req.body.productCategory !== undefined
    ) {
      project.productCategories = getProductCategories(req.body);
      project.productCategory = project.productCategories[0] || '';
    }

    const previousCadPublicId = project.cadFile?.publicId;

    // Upload the replacement before changing the saved CAD reference.
    if (req.file) {
      newlyUploadedFile = await uploadToCloudinary(req.file);

      project.cadFile = {
        originalName: req.file.originalname,
        filePath: newlyUploadedFile.secure_url,
        fileType: path.extname(req.file.originalname).toLowerCase(),
        publicId: newlyUploadedFile.public_id,
      };
    }

    // Save first so the existing CAD reference remains safe if saving fails.
    await project.save();

    // Remove the previous asset only after the database save succeeds.
    if (
      newlyUploadedFile &&
      previousCadPublicId &&
      previousCadPublicId !== newlyUploadedFile.public_id
    ) {
      try {
        const result = await cloudinary.uploader.destroy(
          previousCadPublicId,
          {
            resource_type: 'raw',
            type: 'private',
          }
        );

        if (!['ok', 'not found'].includes(result.result)) {
          console.error(
            'Old CAD asset cleanup was unsuccessful:',
            previousCadPublicId,
            result
          );
        }
      } catch (cleanupError) {
        // The project is already saved with the new CAD file.
        console.error('Old CAD asset cleanup failed:', cleanupError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      project,
    });
  } catch (error) {
    // If upload succeeded but saving failed, clean up the unused new asset.
    if (newlyUploadedFile?.public_id) {
      try {
        await cloudinary.uploader.destroy(newlyUploadedFile.public_id, {
          resource_type: 'raw',
          type: 'private',
        });
      } catch (cleanupError) {
        console.error(
          'Failed to clean up unused replacement CAD file:',
          cleanupError.message
        );
      }
    }

    res.status(400).json({
      success: false,
      message: 'Failed to update project.',
      error: error.message,
    });
  }
});

// POST: Create a project with a required CAD/specification file.

router.post('/', adminAuth, upload.single('cadFile'), async (req, res) => {
  let uploadedFile = null;

  try {
    const {
      productName,
      description,
      quantity,
      material,
      process,
    } = req.body;

    const validationError = validateProjectFields(req.body, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a CAD file or specification sheet.',
      });
    }

    uploadedFile = await uploadToCloudinary(req.file);

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

    return res.status(201).json({
      success: true,
      message: 'Project created and CAD file uploaded successfully.',
      project,
    });
  } catch (error) {
    // Clean up the uploaded CAD file if project creation fails.
    if (uploadedFile?.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedFile.public_id, {
          resource_type: 'raw',
          type: 'private',
        });
      } catch (cleanupError) {
        console.error(
          'Failed to clean up CAD file after project creation failure:',
          cleanupError.message
        );
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Failed to create project.',
      error: error.message,
    });
  }
});

// PUT: Edit only a project owned by the logged-in customer.
router.put('/mine/:id', customerAuth, upload.single('cadFile'), async (req, res) => {
  let newlyUploadedFile = null;

  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.',
      });
    }

    const parsedDimensions = parseSpecificationObject(
      req.body.dimensions,
      'Dimensions'
    );
    const parsedRequirements = parseSpecificationObject(
      req.body.technicalRequirements,
      'Technical requirements'
    );

    const validationError =
      validateProjectFields(req.body) ||
      parsedDimensions.error ||
      parsedRequirements.error ||
      validateSpecificationDetails(
        parsedDimensions.value,
        parsedRequirements.value
      );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const allowedRegions = ["", "Africa", "Asia", "Europe", "North America", "South America", "Oceania"];

    if (req.body.preferredRegion !== undefined) {
      const region = String(req.body.preferredRegion || "").trim();

      if (!allowedRegions.includes(region)) {
        return res.status(400).json({
          success: false,
          message: "Invalid preferred manufacturing region.",
        });
      }
    }

    if (
      req.body.preferredCountry !== undefined &&
      String(req.body.preferredCountry || "").trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Preferred country must not exceed 100 characters.",
      });
    }

    const project = await Project.findOne({
      _id: id,
      customer: req.customer.customerId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Your project was not found.',
      });
    }

    let geographicPreferencesChanged = false;

    if (req.body.preferredRegion !== undefined) {
      project.preferredRegion = String(req.body.preferredRegion || "").trim();
      geographicPreferencesChanged = true;
    }

    if (req.body.preferredCountry !== undefined) {
      project.preferredCountry = String(req.body.preferredCountry || "").trim();
      geographicPreferencesChanged = true;
    }

    const allowedFields = [
      'productName',
      'productCategory',
      'description',
      'quantity',
      'material',
      'process',
    ];

    let specificationsChanged = Boolean(req.file) || geographicPreferencesChanged;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
        specificationsChanged = true;
      }
    }

    if (
      req.body.productCategories !== undefined ||
      req.body.productCategory !== undefined
    ) {
      project.productCategories = getProductCategories(req.body);
      project.productCategory = project.productCategories[0] || '';
      specificationsChanged = true;
    }

    if (parsedDimensions.value !== undefined) {
      project.dimensions = normalizeDimensions(parsedDimensions.value);
      specificationsChanged = true;
    }

    if (parsedRequirements.value !== undefined) {
      project.technicalRequirements = parsedRequirements.value;
      specificationsChanged = true;
    }

    if (specificationsChanged) {
      project.specificationStatus = 'Customer Review';
      project.specificationsConfirmedAt = null;
      project.specificationsConfirmedBy = null;
    }

    const previousCadPublicId = project.cadFile?.publicId;

    if (req.file) {
      newlyUploadedFile = await uploadToCloudinary(req.file);

      project.cadFile = {
        originalName: req.file.originalname,
        filePath: newlyUploadedFile.secure_url,
        fileType: path.extname(req.file.originalname).toLowerCase(),
        publicId: newlyUploadedFile.public_id,
      };
    }

    await project.save();

    if (newlyUploadedFile && previousCadPublicId) {
      try {
        await cloudinary.uploader.destroy(previousCadPublicId, {
          resource_type: 'raw',
          type: 'private',
        });
      } catch (cleanupError) {
        console.error('Old customer CAD cleanup failed:', cleanupError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Your project was updated successfully.',
      project,
    });
  } catch (error) {
    if (newlyUploadedFile?.public_id) {
      try {
        await cloudinary.uploader.destroy(newlyUploadedFile.public_id, {
          resource_type: 'raw',
          type: 'private',
        });
      } catch (cleanupError) {
        console.error('New customer CAD cleanup failed:', cleanupError.message);
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Failed to update your project.',
    });
  }
});

// POST: Confirm product specifications for manufacturer matching.
router.post('/mine/:id/confirm-specifications', customerAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.',
      });
    }

    const project = await Project.findOne({
      _id: id,
      customer: req.customer.customerId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Your project was not found.',
      });
    }

    if (
      !project.productName?.trim() ||
      !(
        (project.productCategories || []).length > 0 ||
        project.productCategory?.trim()
      ) ||
      !project.description?.trim() ||
      !Number.isFinite(Number(project.quantity)) ||
      Number(project.quantity) < 1 ||
      !project.cadFile?.publicId
    ) {
      return res.status(400).json({
        success: false,
        message: 'Complete the required product details and upload a specification file before confirming.',
      });
    }

    project.specificationStatus = 'Confirmed';
    project.specificationsConfirmedAt = new Date();
    project.specificationsConfirmedBy = req.customer.customerId;

    // Make a confirmed draft project available for manufacturer matching.
    if (project.status === 'Draft') {
      project.status = 'Ready for Matching';
    }

    await project.save();

    return res.status(200).json({
      success: true,
      message: 'Product specifications confirmed. Manufacturer matching is now available.',
      project,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to confirm product specifications.',
    });
  }
});

// DELETE: Remove only a project owned by the logged-in customer.
router.delete('/mine/:id', customerAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.',
      });
    }

    const project = await Project.findOne({
      _id: id,
      customer: req.customer.customerId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const linkedRFQ = await RFQ.exists({ project: project._id });

    if (linkedRFQ) {
      return res.status(409).json({
        success: false,
        message: 'This project cannot be deleted because it is linked to an RFQ.',
      });
    }

    // Delete the owned project first, preserving its CAD file if DB deletion fails.
    const deletedProject = await Project.findOneAndDelete({
      _id: project._id,
      customer: req.customer.customerId,
    });

    if (!deletedProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or no longer belongs to your account.',
      });
    }

    // Clean up the private CAD asset after the database deletion succeeds.
    if (deletedProject.cadFile?.publicId) {
      try {
        const result = await cloudinary.uploader.destroy(
          deletedProject.cadFile.publicId,
          {
            resource_type: 'raw',
            type: 'private',
          }
        );

        if (!result || !['ok', 'not found'].includes(result.result)) {
          console.error(
            'Customer CAD cleanup was unsuccessful:',
            deletedProject.cadFile.publicId,
            result
          );
        }
      } catch (cleanupError) {
        console.error('Customer CAD cleanup failed:', cleanupError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Your project was deleted successfully.',
    });
  } catch (error) {
    console.error('Customer project deletion failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete your project.',
    });
  }
});

// DELETE: Remove a project only when no RFQ references it.
router.delete('/:id', adminAuth, async (req, res) => {
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

    const linkedRFQ = await RFQ.exists({ project: project._id });

    if (linkedRFQ) {
      return res.status(409).json({
        success: false,
        message: 'This project cannot be deleted because it is linked to one or more RFQs.',
      });
    }

    // Delete the database record first. Keep the CAD asset if this fails.
    const deletedProject = await Project.findByIdAndDelete(id);

    if (!deletedProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    // Clean up the private CAD asset after the database deletion succeeds.
    if (deletedProject.cadFile?.publicId) {
      try {
        const result = await cloudinary.uploader.destroy(
          deletedProject.cadFile.publicId,
          {
            resource_type: 'raw',
            type: 'private',
          }
        );

        if (!result || !['ok', 'not found'].includes(result.result)) {
          console.error(
            'Admin CAD cleanup was unsuccessful:',
            deletedProject.cadFile.publicId,
            result
          );
        }
      } catch (cleanupError) {
        console.error('Admin CAD cleanup failed:', cleanupError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Project and associated CAD file deleted successfully.',
    });
  } catch (error) {
    console.error('Project deletion failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete project.',
    });
  }
});


// GET: Generate a secure CAD download link for a customer's own project.
router.get('/mine/:id/cad-file', customerAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.',
      });
    }

    const project = await Project.findOne({
      _id: id,
      customer: req.customer.customerId,
    });

    if (!project || !project.cadFile?.publicId) {
      return res.status(404).json({
        success: false,
        message: 'Project or CAD file not found.',
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

    return res.json({ success: true, url });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to generate CAD download link.',
    });
  }
});

// Handle CAD upload errors from Multer.
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large. Maximum allowed size is 25 MB.'
        : error.message;

    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next();
});

module.exports = router;
