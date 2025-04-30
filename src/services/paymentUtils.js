/**
 * Payment Utilities
 * 
 * Shared utilities for payment processing across different payment methods
 */

import { toast } from 'react-toastify';
import axios from 'axios';

// API URL from environment or fallback
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Process a digital wallet payment (Apple Pay or Google Pay)
 * @param {string} walletType - The type of wallet ('apple' or 'google')
 * @param {Object} paymentData - The payment data from the wallet
 * @param {Object} orderDetails - Order details including amount, currency, items
 * @param {string} email - Customer email
 * @returns {Promise<Object>} - The payment result
 */
export const processWalletPayment = async (walletType, paymentData, orderDetails, email) => {
  try {
    const endpoint = walletType === 'apple' 
      ? '/api/payments/process-apple-pay'
      : '/api/payments/process-google-pay';
    
    const response = await axios.post(endpoint, {
      paymentData,
      orderDetails,
      email
    });
    
    return response.data;
  } catch (error) {
    console.error(`${walletType} Pay payment processing failed:`, error);
    
    // Standardize the error format
    const errorMessage = error.response?.data?.message || error.message || 'Payment processing failed';
    throw new Error(errorMessage);
  }
};

/**
 * Validate Apple Pay merchant
 * @param {string} validationURL - Validation URL from Apple Pay session
 * @returns {Promise<Object>} - Validation result
 */
export const validateApplePayMerchant = async (validationURL) => {
  try {
    const response = await axios.post(`${API_URL}/api/payments/validate-apple-pay-merchant`, {
      validationURL
    });
    
    if (!response.data || !response.data.merchantSession) {
      throw new Error('Invalid merchant session response');
    }
    
    return response.data.merchantSession;
  } catch (error) {
    console.error('Apple Pay merchant validation error:', error);
    throw error;
  }
};

/**
 * Handle successful payment
 * @param {Object} result - Payment result from backend
 * @param {Function} onSuccess - Success callback function
 */
export const handlePaymentSuccess = (result, onSuccess) => {
  if (typeof onSuccess === 'function') {
    onSuccess(result);
  }
};

/**
 * Handle payment error
 * @param {Error} error - Error object
 * @param {string} paymentMethod - The payment method that failed (e.g., 'Apple Pay')
 * @param {Function} onError - Error callback function
 */
export const handlePaymentError = (error, paymentMethod, onError) => {
  // Format error message
  const errorMessage = error.message || `${paymentMethod} payment failed`;
  
  if (typeof onError === 'function') {
    onError({
      message: errorMessage,
      originalError: error
    });
  }
};

/**
 * Get available payment methods based on country code
 * @param {string} countryCode - Two-letter country code
 * @returns {Promise<Object>} - Available payment methods
 */
export const getPaymentMethodsForCountry = async (countryCode) => {
  try {
    const response = await axios.get(`${API_URL}/api/payments/methods?country=${countryCode}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return { error: error.message };
  }
};

/**
 * Get currency based on country code
 * @param {string} countryCode - Two-letter country code
 * @returns {string} - Currency code
 */
export const getCurrencyForCountry = (countryCode) => {
  switch (countryCode) {
    case 'US':
      return 'USD';
    case 'GB':
      return 'GBP';
    case 'IN':
      return 'INR';
    case 'DE':
    case 'FR':
    case 'IT':
    case 'ES':
    case 'NL':
    case 'BE':
      return 'EUR';
    default:
      return 'USD';
  }
};

export const PAYMENT_METHODS = {
  CARD: 'card',
  PAYPAL: 'paypal',
  IDEAL: 'ideal',
  SEPA: 'sepa',
  UPI: 'upi',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
  CRYPTO: 'crypto',
  AFTERPAY: 'afterpay',
};

/**
 * Format amount for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} - Formatted amount
 */
export const formatAmount = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Validate payment request data
 * @param {Object} data - The payment request data
 * @returns {boolean} - Whether the data is valid
 */
export const validatePaymentData = (data) => {
  const { amount, currency, email } = data;
  
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    toast.error('Invalid payment amount');
    return false;
  }
  
  if (!currency || typeof currency !== 'string') {
    toast.error('Invalid currency');
    return false;
  }
  
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    toast.error('Invalid email address');
    return false;
  }
  
  return true;
};

/**
 * Check if the browser supports a specific payment method
 * @param {string} method - The payment method to check ('applepay' or 'googlepay')
 * @returns {boolean} - Whether the method is supported
 */
export const isPaymentMethodSupported = (method) => {
  if (method === 'applepay') {
    return window.ApplePaySession && ApplePaySession.canMakePayments();
  } else if (method === 'googlepay') {
    return !!(window.google && window.google.payments);
  }
  
  return false;
};

/**
 * Create a payment completion object with common success properties
 * @param {string} orderId - The order ID
 * @param {number} amount - The payment amount
 * @param {string} currency - The currency code
 * @returns {Object} - Payment completion object
 */
export const createPaymentCompletionData = (orderId, amount, currency) => {
  return {
    orderId,
    amount,
    currency,
    timestamp: new Date().toISOString(),
    status: 'success'
  };
};

/**
 * Check if Apple Pay is available in the browser
 * @returns {boolean} - Whether Apple Pay is available
 */
export const isApplePayAvailable = () => {
  return (
    window.ApplePaySession &&
    ApplePaySession.canMakePayments()
  );
};

/**
 * Create country-specific configuration
 * @param {string} countryCode - ISO country code
 * @returns {Object} - Country-specific configuration
 */
export const getCountryConfig = (countryCode = 'US') => {
  // Simplified configuration that works in TEST mode
  return {
    currencyCode: getCurrencyForCountry(countryCode).toUpperCase(),
    countryCode: countryCode,
    supportedNetworks: ['visa', 'mastercard']
  };
};

export default {
  API_URL,
  validateApplePayMerchant,
  processWalletPayment,
  handlePaymentSuccess,
  handlePaymentError,
  getPaymentMethodsForCountry,
  getCurrencyForCountry,
  PAYMENT_METHODS,
  formatAmount,
  validatePaymentData,
  isPaymentMethodSupported,
  createPaymentCompletionData,
  isApplePayAvailable,
  getCountryConfig
}; 