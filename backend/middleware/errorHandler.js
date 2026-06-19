const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Database unique constraint
  if (err.code === '23505' || err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Resource already exists';
  }

  // Database foreign key constraint
  if (
    err.code === '23503' ||
    err.code === 'ER_NO_REFERENCED_ROW_2' ||
    err.code === 'ER_NO_REFERENCED_ROW' ||
    err.code === 'ER_ROW_IS_REFERENCED_2' ||
    err.code === 'ER_ROW_IS_REFERENCED'
  ) {
    statusCode = 400;
    message = 'Referenced resource not found';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (process.env.NODE_ENV !== 'production') {
    logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`);
    if (err.stack) logger.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, AppError };
