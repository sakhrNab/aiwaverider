/**
 * Async Handler Middleware
 * 
 * Wraps async controller functions to catch errors and pass them to the error handler.
 * This eliminates the need for try/catch blocks in every controller function.
 */

/**
 * Async handler function
 * @param {Function} fn - The async controller function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler; 