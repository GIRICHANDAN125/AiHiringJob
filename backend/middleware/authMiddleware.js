const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('./errorHandler');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      'SELECT id, name, email, role, is_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!result.rows.length) {
      throw new AppError('User not found', 401);
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    next(error);
  }
};

const requireVerified = (req, res, next) => {
  if (!req.user.is_verified) {
    return next(new AppError('Please verify your email first', 403));
  }
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('Insufficient permissions', 403));
  }
  next();
};

module.exports = { authenticate, requireVerified, requireRole };
