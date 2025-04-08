/**
 * Custom Error class for application errors
 * 
 * Provides a consistent way to create operational errors with status codes,
 * error codes, and other metadata for better error handling and logging.
 */
class AppError extends Error {
  /**
   * Create a new AppError
   * @param {string} message - The error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string|null} errorCode - Optional application-specific error code
   * @param {Object} meta - Optional additional metadata about the error
   */
  constructor(message, statusCode = 500, errorCode = null, meta = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.meta = meta;
    this.isOperational = true; // Indicates this is a known operational error
    
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a BadRequest error (400)
   * @param {string} message - Error message
   * @param {string|null} errorCode - Optional error code
   * @param {Object} meta - Optional metadata
   * @returns {AppError} The created error
   */
  static badRequest(message = 'Bad Request', errorCode = 'BAD_REQUEST', meta = {}) {
    return new AppError(message, 400, errorCode, meta);
  }

  /**
   * Create an Unauthorized error (401)
   * @param {string} message - Error message
   * @param {string|null} errorCode - Optional error code
   * @param {Object} meta - Optional metadata
   * @returns {AppError} The created error
   */
  static unauthorized(message = 'Unauthorized', errorCode = 'UNAUTHORIZED', meta = {}) {
    return new AppError(message, 401, errorCode, meta);
  }

  /**
   * Create a Forbidden error (403)
   * @param {string} message - Error message
   * @param {string|null} errorCode - Optional error code
   * @param {Object} meta - Optional metadata
   * @returns {AppError} The created error
   */
  static forbidden(message = 'Forbidden', errorCode = 'FORBIDDEN', meta = {}) {
    return new AppError(message, 403, errorCode, meta);
  }

  /**
   * Create a Not Found error (404)
   * @param {string} message - Error message
   * @param {string|null} errorCode - Optional error code
   * @param {Object} meta - Optional metadata
   * @returns {AppError} The created error
   */
  static notFound(message = 'Not Found', errorCode = 'NOT_FOUND', meta = {}) {
    return new AppError(message, 404, errorCode, meta);
  }

  /**
   * Create a Validation Error (422)
   * @param {string} message - Error message
   * @param {string|null} errorCode - Optional error code
   * @param {Object} meta - Optional metadata (e.g., validation details)
   * @returns {AppError} The created error
   */
  static validation(message = 'Validation Error', errorCode = 'VALIDATION_ERROR', meta = {}) {
    return new AppError(message, 422, errorCode, meta);
  }

  /**
   * Create an Internal Server Error (500)
   * @param {string} message - Error message
   * @param {string|null} errorCode - Optional error code
   * @param {Object} meta - Optional metadata
   * @returns {AppError} The created error
   */
  static internal(message = 'Internal Server Error', errorCode = 'INTERNAL_ERROR', meta = {}) {
    return new AppError(message, 500, errorCode, meta);
  }
}

module.exports = AppError; 