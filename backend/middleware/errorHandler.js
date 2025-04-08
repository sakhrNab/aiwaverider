/**
 * Error Handler Middleware
 * 
 * Centralized error handling for the API
 */

const logger = require('../utils/logger');
const AppError = require('../utils/appError');

/**
 * Handles errors during request processing
 */
const errorHandler = (err, req, res, next) => {
  // Default status code and error object
  let statusCode = err.statusCode || 500;
  let errorObj = {
    error: err.message || 'Internal Server Error',
    path: req.path
  };
  
  // Add error code if available
  if (err.errorCode) {
    errorObj.code = err.errorCode;
  }
  
  // Add metadata if available
  if (err.meta && Object.keys(err.meta).length > 0) {
    errorObj.meta = err.meta;
  }
  
  // Handle specific error types
  if (err instanceof AppError) {
    // This is a known operational error, just log it as a warning
    logger.warn(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  } else {
    // This is an unknown error, log it as an error with stack trace
    logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    logger.error(err.stack);
    
    // In production, don't expose error details for unknown errors
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
      errorObj.error = 'Internal Server Error';
    } else {
      // In development, add stack trace
      errorObj.stack = err.stack;
    }
  }
  
  // Handle specific error types from libraries
  if (err.name === 'ValidationError') {
    // Handle validation errors (e.g. from Joi or Mongoose)
    statusCode = 400;
    errorObj.error = 'Validation Error';
    errorObj.details = err.details || err.errors;
  } else if (err.name === 'UnauthorizedError') {
    // Handle JWT authentication errors
    statusCode = 401;
    errorObj.error = 'Unauthorized';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    // Handle file size limit errors
    statusCode = 400;
    errorObj.error = 'File too large';
  } else if (err.name === 'MongoError' && err.code === 11000) {
    // Handle duplicate key errors
    statusCode = 409;
    errorObj.error = 'Duplicate Entry';
    errorObj.field = Object.keys(err.keyValue)[0];
  } else if (err.name === 'TokenExpiredError') {
    // Handle expired JWT
    statusCode = 401;
    errorObj.error = 'Token expired';
  } else if (err.name === 'JsonWebTokenError') {
    // Handle invalid JWT
    statusCode = 401;
    errorObj.error = 'Invalid token';
  }
  
  // Add request ID for tracking if available
  if (req.id) {
    errorObj.requestId = req.id;
  }
  
  // Send response
  res.status(statusCode).json(errorObj);
};

// Not found middleware
const notFoundHandler = (req, res, next) => {
  const err = AppError.notFound(`Route not found: ${req.originalUrl}`);
  next(err);
};

module.exports = {
  errorHandler,
  notFoundHandler
}; 