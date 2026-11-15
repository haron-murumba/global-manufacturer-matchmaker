const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');

const Customer = require('../models/Customer');
const customerAuth = require('../middleware/customerAuth');

const router = express.Router();

const customerLoginLimiter = rateLimit({
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

// Customer registration
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email and password are required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters.',
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Authentication is not configured.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingCustomer = await Customer.findOne({
      email: normalizedEmail,
    });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const customer = await Customer.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const token = jwt.sign(
      {
        customerId: customer._id.toString(),
        role: 'customer',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Customer account created successfully.',
      token,
      customer: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        role: 'customer',
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    console.error('Customer registration error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Customer registration failed.',
    });
  }
});

// Customer login
router.post('/login', customerLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Authentication is not configured.',
      });
    }

    const customer = await Customer.findOne({
      email: email.trim().toLowerCase(),
    }).select('+passwordHash');

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const passwordIsValid = await bcrypt.compare(
      password,
      customer.passwordHash
    );

    if (!passwordIsValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = jwt.sign(
      {
        customerId: customer._id.toString(),
        role: 'customer',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Customer login successful.',
      token,
      customer: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        role: 'customer',
      },
    });
  } catch (error) {
    console.error('Customer login error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Customer login failed.',
    });
  }
});

// Get authenticated customer profile
router.get('/me', customerAuth, async (req, res) => {
  try {
    const customer = await Customer.findById(
      req.customer.customerId
    ).select('fullName email createdAt');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer account not found.',
      });
    }

    return res.json({
      success: true,
      customer: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        createdAt: customer.createdAt,
        role: 'customer',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not retrieve customer profile.',
    });
  }
});

module.exports = router;
