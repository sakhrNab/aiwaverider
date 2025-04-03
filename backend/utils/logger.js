/**
 * Logger Utility
 * 
 * Simple logging utility for the application with different log levels
 * and formatting options.
 */

const config = {
  // Set the minimum log level (error, warn, info, debug)
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Enable timestamps in logs
  timestamps: true,
  // Enable colors in console output (disable in production or file logs)
  colors: process.env.NODE_ENV !== 'production',
  // Set to true to include stack traces in error logs
  stackTrace: process.env.NODE_ENV !== 'production',
};

// Log level hierarchy (higher number = more verbose)
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  error: '\x1b[31m', // Red
  warn: '\x1b[33m',  // Yellow
  info: '\x1b[36m',  // Cyan
  debug: '\x1b[90m', // Gray
  time: '\x1b[90m',  // Gray
};

/**
 * Format and output a log message
 * @param {string} level - Log level (error, warn, info, debug)
 * @param {string} message - Log message
 * @param {Object} [metadata] - Additional metadata to log
 */
const log = (level, message, metadata = null) => {
  // Skip if this log level is below the configured minimum
  if (LOG_LEVELS[level] > LOG_LEVELS[config.level]) {
    return;
  }

  // Format timestamp
  const timestamp = config.timestamps 
    ? new Date().toISOString() 
    : '';
  
  // Prepare color formatting
  const colorStart = config.colors ? COLORS[level] : '';
  const colorReset = config.colors ? COLORS.reset : '';
  const timeColor = config.colors ? COLORS.time : '';
  
  // Format the basic log message
  let logMessage = '';
  
  if (timestamp) {
    logMessage += `${timeColor}[${timestamp}]${colorReset} `;
  }
  
  logMessage += `${colorStart}[${level.toUpperCase()}]${colorReset} ${message}`;
  
  // Output to console
  console[level === 'debug' ? 'log' : level](logMessage);
  
  // Log additional metadata if provided
  if (metadata) {
    console[level === 'debug' ? 'log' : level](metadata);
  }
  
  // Log stack trace for errors if enabled
  if (level === 'error' && config.stackTrace && metadata instanceof Error) {
    console.error(metadata.stack);
  }
};

// Create export methods for each log level
const logger = {
  error: (message, metadata) => log('error', message, metadata),
  warn: (message, metadata) => log('warn', message, metadata),
  info: (message, metadata) => log('info', message, metadata),
  debug: (message, metadata) => log('debug', message, metadata),
  
  /**
   * Set logger configuration
   * @param {Object} newConfig - New configuration options
   */
  configure: (newConfig) => {
    Object.assign(config, newConfig);
  }
};

module.exports = logger;
