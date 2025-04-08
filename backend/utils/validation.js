/**
 * Validation Utilities
 * 
 * Common validation functions used throughout the application
 */

const AppError = require('./appError');

/**
 * Validates that all required fields are present and not empty in the provided object
 * 
 * @param {Object} data - The object to validate
 * @param {Array<string>} requiredFields - Array of field names that are required
 * @throws {AppError} - Throws an error if any required field is missing or empty
 */
const validateRequiredFields = (data, requiredFields) => {
  if (!data || typeof data !== 'object') {
    throw new AppError('Invalid data object provided', 400);
  }

  if (!Array.isArray(requiredFields) || requiredFields.length === 0) {
    throw new AppError('Invalid requiredFields array provided', 500);
  }

  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '' || 
           (Array.isArray(value) && value.length === 0);
  });

  if (missingFields.length > 0) {
    throw new AppError(
      `Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`,
      400
    );
  }
};

/**
 * Validates that a string is a valid email format
 * 
 * @param {string} email - The email to validate
 * @returns {boolean} - True if the email is valid, false otherwise
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates that a string has at least the specified minimum length
 * 
 * @param {string} str - The string to validate
 * @param {number} minLength - The minimum length required
 * @returns {boolean} - True if the string meets the minimum length requirement
 */
const hasMinLength = (str, minLength) => {
  if (!str || typeof str !== 'string') return false;
  return str.length >= minLength;
};

/**
 * Validates that a number is within the specified range
 * 
 * @param {number} num - The number to validate
 * @param {number} min - The minimum allowed value
 * @param {number} max - The maximum allowed value
 * @returns {boolean} - True if the number is within the range
 */
const isInRange = (num, min, max) => {
  if (typeof num !== 'number' || isNaN(num)) return false;
  return num >= min && num <= max;
};

module.exports = {
  validateRequiredFields,
  isValidEmail,
  hasMinLength,
  isInRange
}; 