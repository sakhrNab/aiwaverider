/**
 * Centralized Logging Service
 * 
 * This service provides structured logging for the application with different levels
 * and integrations with external error monitoring services like Sentry.
 */

import { ENV, MONITORING } from '../config/config';

// Initialize external monitoring services if in production
let sentryCaptureInitialized = false;
let logRocketInitialized = false;

/**
 * Initialize external monitoring services like Sentry and LogRocket
 * This should be called once at application startup
 */
export const initializeErrorMonitoring = async () => {
  if (!ENV.PROD || !MONITORING) return;
  
  try {
    // Initialize Sentry
    if (MONITORING.SENTRY.DSN) {
      const Sentry = await import('@sentry/browser');
      Sentry.init({
        dsn: MONITORING.SENTRY.DSN,
        environment: MONITORING.SENTRY.ENVIRONMENT,
        integrations: [new Sentry.BrowserTracing()],
        tracesSampleRate: MONITORING.SENTRY.TRACES_SAMPLE_RATE,
      });
      sentryCaptureInitialized = true;
      console.log('Sentry initialized for error monitoring');
    }

    // Initialize LogRocket
    if (MONITORING.LOGROCKET.APP_ID) {
      const LogRocket = await import('logrocket');
      LogRocket.init(MONITORING.LOGROCKET.APP_ID, {
        network: {
          requestSanitizer: (request) => {
            // Sanitize sensitive data from requests
            if (request.headers['Authorization']) {
              request.headers['Authorization'] = '**REDACTED**';
            }
            
            // Don't log payment card data
            if (request.body && 
                (request.url.includes('/payment') || 
                request.url.includes('/stripe'))) {
              try {
                const body = JSON.parse(request.body);
                if (body.paymentMethod && body.paymentMethod.card) {
                  body.paymentMethod.card = '**REDACTED**';
                }
                if (body.card) {
                  body.card = '**REDACTED**';
                }
                request.body = JSON.stringify(body);
              } catch (e) {
                // If we can't parse the body, redact it entirely
                request.body = '**REDACTED**';
              }
            }
            
            return request;
          }
        }
      });
      logRocketInitialized = true;
      console.log('LogRocket initialized for session recording');
      
      // Connect LogRocket with Sentry if both are available
      if (sentryCaptureInitialized) {
        const Sentry = await import('@sentry/browser');
        LogRocket.getSessionURL(sessionURL => {
          Sentry.configureScope(scope => {
            scope.setExtra("logRocketSessionURL", sessionURL);
          });
        });
      }
    }
  } catch (error) {
    console.error('Error initializing monitoring services:', error);
  }
};

/**
 * Log an error to the console and external monitoring services
 * @param {Error|string} error - The error object or message to log
 * @param {Object} context - Additional context for the error
 * @param {string} source - Source of the error (component, function, etc.)
 * @param {boolean} isFatal - Whether this is a fatal error
 */
export const logError = (error, context = {}, source = '', isFatal = false) => {
  // Create a structured error object
  const errorObj = {
    message: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : new Error().stack,
    timestamp: new Date().toISOString(),
    source,
    context,
    isFatal
  };
  
  // Always log to console
  console.error(`[ERROR]${source ? ` [${source}]` : ''}:`, errorObj.message, errorObj);
  
  // Log to external services in production
  if (ENV.PROD && MONITORING) {
    try {
      // Send to Sentry if initialized
      if (sentryCaptureInitialized) {
        import('@sentry/browser').then(Sentry => {
          Sentry.withScope(scope => {
            scope.setLevel(isFatal ? 'fatal' : 'error');
            Object.entries(context).forEach(([key, value]) => {
              scope.setExtra(key, value);
            });
            scope.setTag('source', source);
            Sentry.captureException(error instanceof Error ? error : new Error(error));
          });
        }).catch(e => console.error('Failed to send error to Sentry:', e));
      }
      
      // Send to LogRocket if initialized
      if (logRocketInitialized) {
        import('logrocket').then(LogRocket => {
          LogRocket.captureException(error instanceof Error ? error : new Error(error), {
            tags: {
              source,
              fatal: isFatal
            },
            extra: context
          });
        }).catch(e => console.error('Failed to send error to LogRocket:', e));
      }
    } catch (e) {
      console.error('Error while sending logs to monitoring services:', e);
    }
  }
  
  return errorObj;
};

/**
 * Log informational messages
 * @param {string} message - The message to log
 * @param {Object} data - Additional data to log
 * @param {string} source - Source of the information
 */
export const logInfo = (message, data = {}, source = '') => {
  const logObj = {
    message,
    data,
    source,
    timestamp: new Date().toISOString(),
    level: 'info'
  };
  
  // In development, always log to console
  if (!ENV.PROD) {
    console.info(`[INFO]${source ? ` [${source}]` : ''}:`, message, data);
  } else if (MONITORING.LOGGING_LEVEL === 'debug' || ENV.DEV) {
    // In production, only log if debug logging is enabled
    console.info(`[INFO]${source ? ` [${source}]` : ''}:`, message);
  }
  
  return logObj;
};

/**
 * Log warning messages
 * @param {string} message - The warning message
 * @param {Object} data - Additional data for the warning
 * @param {string} source - Source of the warning
 */
export const logWarning = (message, data = {}, source = '') => {
  const logObj = {
    message,
    data,
    source,
    timestamp: new Date().toISOString(),
    level: 'warning'
  };
  
  // Always log warnings to console
  console.warn(`[WARNING]${source ? ` [${source}]` : ''}:`, message, data);
  
  // Send warnings to monitoring in production
  if (ENV.PROD && MONITORING) {
    try {
      if (sentryCaptureInitialized) {
        import('@sentry/browser').then(Sentry => {
          Sentry.withScope(scope => {
            scope.setLevel('warning');
            Object.entries(data).forEach(([key, value]) => {
              scope.setExtra(key, value);
            });
            scope.setTag('source', source);
            Sentry.captureMessage(message);
          });
        }).catch(e => console.error('Failed to send warning to Sentry:', e));
      }
    } catch (e) {
      console.error('Error while sending warning to monitoring services:', e);
    }
  }
  
  return logObj;
};

/**
 * Log transaction-related events for payment processing
 * @param {string} transactionId - ID of the transaction
 * @param {string} status - Status of the transaction
 * @param {string} type - Type of payment (card, sepa, etc.)
 * @param {Object} metadata - Additional transaction metadata
 */
export const logTransaction = (transactionId, status, type, metadata = {}) => {
  const transactionLog = {
    transactionId,
    status,
    type,
    timestamp: new Date().toISOString(),
    metadata: {
      ...metadata,
      // Ensure we don't log any sensitive payment details
      ...(metadata.paymentMethod ? { paymentMethod: '**REDACTED**' } : {}),
      ...(metadata.card ? { card: '**REDACTED**' } : {})
    }
  };
  
  // Log to console in non-production
  if (!ENV.PROD) {
    console.log(`[TRANSACTION] ${type} ${status}: ${transactionId}`, transactionLog);
  }
  
  // In production, send to analytics
  if (ENV.PROD) {
    // Example of sending to analytics service
    try {
      // Could integrate with payment analytics here
      if (window.analytics) {
        window.analytics.track('Payment Transaction', transactionLog);
      }
    } catch (e) {
      console.error('Error logging transaction to analytics:', e);
    }
  }
  
  return transactionLog;
};

export default {
  initializeErrorMonitoring,
  logError,
  logInfo,
  logWarning,
  logTransaction
}; 