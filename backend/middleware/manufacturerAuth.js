
const jwt = require('jsonwebtoken');
const Manufacturer = require('../models/Manufacturer');

async function manufacturerAuth(req, res, next) {
  let decoded;

  // First, validate the JWT.
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Manufacturer authentication required.',
      });
    }

    const token = authHeader.slice(7);

    decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (
      decoded.role !== 'manufacturer' ||
      !decoded.manufacturerId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Manufacturer access denied.',
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired manufacturer token.',
    });
  }

  // Then, confirm the account still exists and is verified.
  try {
    const manufacturer = await Manufacturer.findById(
      decoded.manufacturerId
    ).select('_id verificationStatus');

    if (!manufacturer) {
      return res.status(401).json({
        success: false,
        message: 'Manufacturer account no longer exists.',
      });
    }

    if (manufacturer.verificationStatus !== 'Verified') {
      return res.status(403).json({
        success: false,
        message: 'Your manufacturer account is not verified.',
      });
    }

    req.manufacturer = {
      manufacturerId: manufacturer._id.toString(),
    };

    next();
  } catch (error) {
    console.error('Manufacturer authentication error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to verify manufacturer account.',
    });
  }
}

module.exports = manufacturerAuth;
