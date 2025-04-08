/**
 * HTML Sanitizer
 * 
 * Wrapper around sanitize.js to provide HTML sanitization functionality
 * while maintaining backward compatibility with older imports
 */

const { sanitizeContent } = require('./sanitize');

/**
 * Sanitize HTML content to prevent XSS attacks
 * 
 * @param {string} html - The HTML content to sanitize
 * @param {object} options - Optional sanitization options
 * @returns {string} - The sanitized HTML
 */
const sanitizeHtml = (html, options = {}) => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  return sanitizeContent(html, options);
};

module.exports = {
  sanitizeHtml
}; 