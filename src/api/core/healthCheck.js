/**
 * Health Check Utility
 * 
 * This module provides system health monitoring capabilities for production:
 * - API connectivity checks
 * - Payment provider status checks
 * - Database connectivity tests
 * - Scheduled health monitoring
 */

import { API, ENV, PAYMENT, FEATURES } from '../../config/config';
import { logError, logInfo, logWarning } from '../../services/logService';
import apiClient from '../../services/apiClient';

const SERVICE_NAME = 'healthCheck';

// Health check statuses
export const STATUS = {
  OK: 'ok',
  WARNING: 'warning',
  ERROR: 'error',
  UNKNOWN: 'unknown'
};

/**
 * Check API connectivity
 * @returns {Promise<Object>} Health check result
 */
export const checkApiHealth = async () => {
  try {
    const result = await apiClient.checkApiConnectivity();
    
    return {
      name: 'API',
      status: result.ok ? STATUS.OK : STATUS.ERROR,
      message: result.message || result.error || 'API health check completed',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: 'API',
      status: STATUS.ERROR,
      message: error.message || 'API health check failed',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Check Stripe availability
 * @returns {Promise<Object>} Health check result
 */
export const checkStripeHealth = async () => {
  if (!PAYMENT.STRIPE.PUBLIC_KEY) {
    return {
      name: 'Stripe',
      status: STATUS.UNKNOWN,
      message: 'Stripe not configured',
      timestamp: new Date().toISOString()
    };
  }
  
  try {
    // Call Stripe health check endpoint
    const response = await apiClient.get(`${API.URL}/api/payments/providers/stripe/health`, {
      timeout: 5000,
      retries: 1,
      tags: ['health-check', 'payment', 'stripe']
    });
    
    return {
      name: 'Stripe',
      status: response.status === 'up' ? STATUS.OK : STATUS.WARNING,
      message: response.message || 'Stripe health check completed',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: 'Stripe',
      status: STATUS.ERROR,
      message: error.message || 'Stripe health check failed',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Check PayPal availability
 * @returns {Promise<Object>} Health check result
 */
export const checkPayPalHealth = async () => {
  if (!PAYMENT.PAYPAL.CLIENT_ID) {
    return {
      name: 'PayPal',
      status: STATUS.UNKNOWN,
      message: 'PayPal not configured',
      timestamp: new Date().toISOString()
    };
  }
  
  try {
    // Call PayPal health check endpoint
    const response = await apiClient.get(`${API.URL}/api/payments/providers/paypal/health`, {
      timeout: 5000,
      retries: 1,
      tags: ['health-check', 'payment', 'paypal']
    });
    
    return {
      name: 'PayPal',
      status: response.status === 'up' ? STATUS.OK : STATUS.WARNING,
      message: response.message || 'PayPal health check completed',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: 'PayPal',
      status: STATUS.ERROR,
      message: error.message || 'PayPal health check failed',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Check SEPA payment system availability
 * @returns {Promise<Object>} Health check result
 */
export const checkSepaHealth = async () => {
  if (!FEATURES.ENABLE_SEPA) {
    return {
      name: 'SEPA',
      status: STATUS.UNKNOWN,
      message: 'SEPA payments not enabled',
      timestamp: new Date().toISOString()
    };
  }
  
  try {
    // Call SEPA health check endpoint
    const response = await apiClient.get(`${API.URL}/api/payments/providers/sepa/health`, {
      timeout: 5000,
      retries: 1,
      tags: ['health-check', 'payment', 'sepa']
    });
    
    return {
      name: 'SEPA',
      status: response.status === 'up' ? STATUS.OK : STATUS.WARNING,
      message: response.message || 'SEPA health check completed',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: 'SEPA',
      status: STATUS.ERROR,
      message: error.message || 'SEPA health check failed',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Run all health checks
 * @returns {Promise<Object>} Consolidated health status
 */
export const runAllHealthChecks = async () => {
  logInfo('Running system health checks', {}, SERVICE_NAME);
  
  const checks = await Promise.all([
    checkApiHealth(),
    checkStripeHealth(),
    checkPayPalHealth(),
    checkSepaHealth()
  ]);
  
  // Determine overall system status
  let overallStatus = STATUS.OK;
  const errorChecks = checks.filter(check => check.status === STATUS.ERROR);
  const warningChecks = checks.filter(check => check.status === STATUS.WARNING);
  
  if (errorChecks.length > 0) {
    overallStatus = STATUS.ERROR;
    logError('System health check detected errors', { 
      errors: errorChecks.map(c => ({ name: c.name, message: c.message }))
    }, SERVICE_NAME);
  } else if (warningChecks.length > 0) {
    overallStatus = STATUS.WARNING;
    logWarning('System health check detected warnings', { 
      warnings: warningChecks.map(c => ({ name: c.name, message: c.message }))
    }, SERVICE_NAME);
  } else {
    logInfo('System health check completed successfully', {}, SERVICE_NAME);
  }
  
  return {
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString()
  };
};

/**
 * Schedule periodic health checks
 * @param {number} interval - Check interval in milliseconds
 * @returns {Object} - Timer control object
 */
export const scheduleHealthChecks = (interval = 300000) => { // Default: 5 minutes
  if (!ENV.PROD) {
    console.log('Periodic health checks are only enabled in production');
    return null;
  }
  
  logInfo(`Scheduling health checks every ${interval}ms`, {}, SERVICE_NAME);
  
  // Run an initial check
  runAllHealthChecks().catch(err => {
    logError('Initial health check failed', { error: err.message }, SERVICE_NAME);
  });
  
  // Schedule periodic checks
  const timer = setInterval(() => {
    runAllHealthChecks().catch(err => {
      logError('Scheduled health check failed', { error: err.message }, SERVICE_NAME);
    });
  }, interval);
  
  // Return control object
  return {
    stop: () => {
      clearInterval(timer);
      logInfo('Health check scheduling stopped', {}, SERVICE_NAME);
    },
    runNow: () => {
      logInfo('Manual health check triggered', {}, SERVICE_NAME);
      return runAllHealthChecks();
    },
    changeInterval: (newInterval) => {
      clearInterval(timer);
      return scheduleHealthChecks(newInterval);
    }
  };
};

export default {
  checkApiHealth,
  checkStripeHealth,
  checkPayPalHealth,
  checkSepaHealth,
  runAllHealthChecks,
  scheduleHealthChecks,
  STATUS
}; 