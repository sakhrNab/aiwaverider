/**
 * Async Handler Utility
 * 
 * Wraps async route handlers to avoid try/catch blocks in every controller
 */

/**
 * Wraps an async function and forwards any errors to the error middleware
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - Express middleware function with error handling
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler; 