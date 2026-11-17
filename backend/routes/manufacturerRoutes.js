

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');

const Manufacturer = require('../models/Manufacturer');
const Project = require('../models/Project');
const customerAuth = require('../middleware/customerAuth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  analyzeManufacturerMatches,
} = require('../services/manufacturerMatching');

// Country normalization keeps free-text manufacturer country names comparable.
function normalizeCountryName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const COUNTRY_ALIASES = {
  'usa': 'united states',
  'united states of america': 'united states',
  'uk': 'united kingdom',
  'great britain': 'united kingdom',
  'britain': 'united kingdom',
  'south korea': 'south korea',
  'republic of korea': 'south korea',
  'korea south': 'south korea',
  'north korea': 'north korea',
  'korea north': 'north korea',
  'viet nam': 'vietnam',
  'prc': 'china',
  'people s republic of china': 'china',
  'uae': 'united arab emirates',
  'russian federation': 'russia',
  'czech republic': 'czechia',
  'turkiye': 'turkey',
};

function canonicalCountryName(value) {
  const normalized = normalizeCountryName(value);
  return COUNTRY_ALIASES[normalized] || normalized;
}

// Explicit country-to-region mapping. Unknown country names remain unclassified.
const COUNTRIES_BY_REGION = {
  Africa: [
    'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
    'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad', 'Comoros',
    'Democratic Republic of the Congo', 'Republic of the Congo', 'Djibouti',
    'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon',
    'Gambia', 'Ghana', 'Guinea', 'Guinea Bissau', 'Ivory Coast', 'Kenya',
    'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali',
    'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger',
    'Nigeria', 'Rwanda', 'Sao Tome and Principe', 'Senegal', 'Seychelles',
    'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan', 'Sudan',
    'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
  ],
  Asia: [
    'Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Bhutan',
    'Brunei', 'Cambodia', 'China', 'Cyprus', 'Georgia', 'India', 'Indonesia',
    'Iran', 'Iraq', 'Israel', 'Japan', 'Jordan', 'Kazakhstan', 'Kuwait',
    'Kyrgyzstan', 'Laos', 'Lebanon', 'Malaysia', 'Maldives', 'Mongolia',
    'Myanmar', 'Nepal', 'North Korea', 'Oman', 'Pakistan', 'Palestine',
    'Philippines', 'Qatar', 'Saudi Arabia', 'Singapore', 'South Korea',
    'Sri Lanka', 'Syria', 'Taiwan', 'Tajikistan', 'Thailand', 'Timor Leste',
    'Turkey', 'Turkmenistan', 'United Arab Emirates', 'Uzbekistan', 'Vietnam',
    'Yemen',
  ],
  Europe: [
    'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium',
    'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Czechia', 'Denmark',
    'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland',
    'Ireland', 'Italy', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania',
    'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands',
    'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia',
    'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
    'Switzerland', 'Ukraine', 'United Kingdom', 'Vatican City',
  ],
  'North America': [
    'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Canada',
    'Costa Rica', 'Cuba', 'Dominica', 'Dominican Republic', 'El Salvador',
    'Grenada', 'Guatemala', 'Haiti', 'Honduras', 'Jamaica', 'Mexico',
    'Nicaragua', 'Panama', 'Saint Kitts and Nevis', 'Saint Lucia',
    'Saint Vincent and the Grenadines', 'Trinidad and Tobago',
    'United States',
  ],
  'South America': [
    'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador',
    'Guyana', 'Paraguay', 'Peru', 'Suriname', 'Uruguay', 'Venezuela',
  ],
  Oceania: [
    'Australia', 'Fiji', 'Kiribati', 'Marshall Islands', 'Micronesia',
    'Nauru', 'New Zealand', 'Palau', 'Papua New Guinea', 'Samoa',
    'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu',
  ],
};

const COUNTRY_REGION_LOOKUP = Object.fromEntries(
  Object.entries(COUNTRIES_BY_REGION).flatMap(([region, countries]) =>
    countries.map((country) => [canonicalCountryName(country), region])
  )
);

function getCountryRegion(country) {
  return COUNTRY_REGION_LOOKUP[canonicalCountryName(country)] || null;
}

const evidenceStorage = multer.memoryStorage();

const evidenceFileTypes = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

const evidenceUpload = multer({
  storage: evidenceStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 4,
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const expectedMimeType = evidenceFileTypes[extension];

    if (!expectedMimeType || file.mimetype !== expectedMimeType) {
      return callback(
        new Error('Only PDF, JPG, JPEG and PNG evidence files are allowed.')
      );
    }

    callback(null, true);
  },
});

const evidenceFields = [
  { name: 'companyRegistration', maxCount: 1 },
  { name: 'businessLicense', maxCount: 1 },
  { name: 'capabilityEvidence', maxCount: 1 },
  { name: 'otherEvidence', maxCount: 1 },
];

const evidenceDocumentTypes = {
  companyRegistration: 'Company Registration',
  businessLicense: 'Business License',
  capabilityEvidence: 'Manufacturing Capability Evidence',
  otherEvidence: 'Other',
};

function parseManufacturerArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

function uploadEvidenceToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const publicId = `gmm/manufacturer-evidence/${crypto.randomUUID()}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        type: 'private',
        public_id: publicId,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}


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
router.get('/match/:projectId', customerAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID',
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      customer: req.customer.customerId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    if (project.specificationStatus !== 'Confirmed') {
      return res.status(409).json({
        success: false,
        code: 'SPECIFICATIONS_NOT_CONFIRMED',
        message: 'Please review and confirm your product specifications before requesting manufacturer matches.',
      });
    }

    const manufacturers = await Manufacturer.find({
      verificationStatus: 'Verified',
    });

    const analysis = analyzeManufacturerMatches(
      project,
      manufacturers
    );

    const { incompatible } = analysis;
    const preferredCountry = canonicalCountryName(project.preferredCountry);
    const preferredRegion = String(project.preferredRegion || '').trim();

    // Country takes precedence when both preferences are supplied.
    const locationPreferenceActive = Boolean(
      preferredCountry || preferredRegion
    );

    const locationExcluded = [];
    const matches = analysis.matches.filter((match) => {
      if (preferredCountry) {
        const matchesCountry =
          canonicalCountryName(match.country) === preferredCountry;

        if (!matchesCountry) {
          locationExcluded.push({
            ...match,
            locationExclusionReason:
              'Outside the preferred manufacturing country',
          });
        }

        return matchesCountry;
      }

      if (preferredRegion) {
        const manufacturerRegion = getCountryRegion(match.country);
        const matchesRegion = manufacturerRegion === preferredRegion;

        if (!matchesRegion) {
          locationExcluded.push({
            ...match,
            locationExclusionReason: manufacturerRegion
              ? 'Outside the preferred manufacturing region'
              : 'Manufacturer country could not be confidently classified',
          });
        }

        return matchesRegion;
      }

      return true;
    });

    res.status(200).json({
      success: true,
      project: {
        id: project._id,
        productName: project.productName,
        productCategory: project.productCategory,
        productCategories: Array.isArray(project.productCategories) &&
          project.productCategories.length
            ? project.productCategories
            : project.productCategory
              ? [project.productCategory]
              : [],
        quantity: project.quantity,
        material: project.material,
        process: project.process,
        preferredRegion: project.preferredRegion || '',
        preferredCountry: project.preferredCountry || '',
        dimensions: project.dimensions,
        technicalRequirements: project.technicalRequirements,
        specificationStatus: project.specificationStatus,
      },
      count: matches.length,
      matches,
      locationPreference: {
        preferredRegion: project.preferredRegion || '',
        preferredCountry: project.preferredCountry || '',
        active: locationPreferenceActive,
        countryTakesPrecedence: Boolean(preferredCountry),
      },
      locationExcludedCount: locationExcluded.length,
      locationExcluded,
      technicallyCompatibleCount: analysis.matches.length,
      incompatibleCount: incompatible.length,
      incompatible,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to match manufacturers',
      error: error.message,
    });
  }
});

// POST: Register a manufacturer with supporting verification evidence
router.post(
  '/',
  (req, res, next) => {
    evidenceUpload.fields(evidenceFields)(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      next();
    });
  },
  async (req, res) => {
    const uploadedDocuments = [];

    try {
      const {
        companyName,
        country,
        city,
        website,
        contactEmail,
        minimumOrderQuantity,
        smallOrderResponsiveness,
        notes,
      } = req.body;

      if (!companyName?.trim() || !country?.trim() || !contactEmail?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Company name, country and contact email are required.',
        });
      }

      const files = Object.entries(req.files || {}).flatMap(
        ([fieldName, fieldFiles]) =>
          fieldFiles.map((file) => ({ fieldName, file }))
      );

      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Upload at least one supporting verification document.',
        });
      }

      let parsedMOQ;

      if (minimumOrderQuantity !== undefined && minimumOrderQuantity !== '') {
        parsedMOQ = Number(minimumOrderQuantity);

        if (!Number.isFinite(parsedMOQ) || parsedMOQ < 1) {
          return res.status(400).json({
            success: false,
            message: 'Minimum order quantity must be at least 1.',
          });
        }
      }

      const verificationDocuments = [];

      for (const { fieldName, file } of files) {
        const result = await uploadEvidenceToCloudinary(file);

        uploadedDocuments.push({
          publicId: result.public_id,
          resourceType: 'raw',
        });

        verificationDocuments.push({
          documentType: evidenceDocumentTypes[fieldName],
          originalFilename: file.originalname,
          publicId: result.public_id,
          resourceType: 'raw',
          format: path.extname(file.originalname).slice(1).toLowerCase(),
          uploadedAt: new Date(),
        });
      }

      const manufacturer = await Manufacturer.create({
        companyName: companyName.trim(),
        country: country.trim(),
        city: city?.trim() || '',
        website: website?.trim() || '',
        contactEmail: contactEmail.trim().toLowerCase(),
        capabilities: parseManufacturerArray(req.body.capabilities),
        manufacturingProcesses: parseManufacturerArray(
          req.body.manufacturingProcesses
        ),
        materials: parseManufacturerArray(req.body.materials),
        productCategories: parseManufacturerArray(req.body.productCategories),
        minimumOrderQuantity: parsedMOQ,
        smallOrderResponsiveness: smallOrderResponsiveness || 'Unknown',
        notes: notes?.trim() || '',
        verificationDocuments,
        verificationSubmittedAt: new Date(),
        verificationStatus: 'Under Review',
      });

      res.status(201).json({
        success: true,
        message: 'Manufacturer registered and evidence submitted for review.',
        manufacturer: {
          id: manufacturer._id,
          companyName: manufacturer.companyName,
          verificationStatus: manufacturer.verificationStatus,
          verificationDocuments: manufacturer.verificationDocuments.map(
            (document) => ({
              documentType: document.documentType,
              originalFilename: document.originalFilename,
              uploadedAt: document.uploadedAt,
            })
          ),
        },
      });
    } catch (error) {
      console.error('Manufacturer registration error:', error);

      await Promise.all(
        uploadedDocuments.map((document) =>
          cloudinary.uploader.destroy(document.publicId, {
            resource_type: document.resourceType,
            type: 'private',
          }).catch((cleanupError) => {
            console.error('Evidence cleanup failed:', cleanupError.message);
          })
        )
      );

      res.status(400).json({
        success: false,
        message: 'Failed to register manufacturer.',
        error: error.message,
      });
    }
  }
);

module.exports = router;
