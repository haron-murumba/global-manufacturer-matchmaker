const jwt = require('jsonwebtoken');

function customerAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== 'customer' || !decoded.customerId) {
      return res.status(403).json({
        success: false,
        message: 'Customer access denied.',
      });
    }

    req.customer = {
      customerId: decoded.customerId,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }
}

module.exports = customerAuth;
