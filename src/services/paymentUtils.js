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

/**
 * Credit Card Utilities
 * Functions for validating and formatting credit card information
 */

/**
 * Validate a credit card number using the Luhn algorithm
 * @param {string} cardNumber - The credit card number to validate
 * @returns {boolean} - Whether the card number is valid
 */
export const validateCardNumber = (cardNumber) => {
  if (!cardNumber) return false;
  
  // Remove spaces and non-numeric characters
  const digitsOnly = cardNumber.replace(/\D/g, '');
  
  if (digitsOnly.length < 13 || digitsOnly.length > 19) {
    return false; // Invalid length
  }
  
  // Luhn algorithm implementation
  let sum = 0;
  let shouldDouble = false;
  
  // Loop through the digits in reverse order
  for (let i = digitsOnly.length - 1; i >= 0; i--) {
    let digit = parseInt(digitsOnly.charAt(i));
    
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  
  return sum % 10 === 0;
};

/**
 * Format a credit card number with spaces for readability
 * @param {string} cardNumber - The credit card number to format
 * @returns {string} - The formatted credit card number
 */
export const formatCardNumber = (cardNumber) => {
  if (!cardNumber) return '';
  
  // Remove existing spaces and non-numeric characters
  const digitsOnly = cardNumber.replace(/\D/g, '');
  
  // Basic formatting for common card types
  // Visa, Mastercard, Discover, etc.: 4 groups of 4 digits
  // Amex: 1 group of 4 digits, 1 group of 6 digits, 1 group of 5 digits
  const isAmex = /^3[47]/.test(digitsOnly);
  
  if (isAmex && digitsOnly.length > 10) {
    return `${digitsOnly.substring(0, 4)} ${digitsOnly.substring(4, 10)} ${digitsOnly.substring(10, 15)}`.trim();
  } else {
    // For other cards, group by 4 digits
    const parts = [];
    for (let i = 0; i < digitsOnly.length; i += 4) {
      parts.push(digitsOnly.substring(i, i + 4));
    }
    
    return parts.join(' ');
  }
};

/**
 * Get the card type based on the card number
 * @param {string} cardNumber - The credit card number
 * @returns {string} - The card type (visa, mastercard, amex, discover, unknown)
 */
export const getCardType = (cardNumber) => {
  if (!cardNumber) return 'unknown';
  
  // Remove spaces and non-numeric characters
  const digitsOnly = cardNumber.replace(/\D/g, '');
  
  // Card type regex patterns
  const patterns = {
    visa: /^4/,
    mastercard: /^(5[1-5]|2[2-7])/,
    amex: /^3[47]/,
    discover: /^(6011|65|64[4-9]|622)/,
    diners: /^(30[0-5]|36|38)/,
    jcb: /^35/,
    unionpay: /^62/
  };
  
  // Check the card number against each pattern
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(digitsOnly)) {
      return type;
    }
  }
  
  return 'unknown';
};

/**
 * Validate a card expiry date
 * @param {string} expiryMonth - The expiry month (1-12)
 * @param {string} expiryYear - The expiry year (2 or 4 digits)
 * @returns {boolean} - Whether the expiry date is valid and not expired
 */
export const validateCardExpiry = (expiryMonth, expiryYear) => {
  if (!expiryMonth || !expiryYear) return false;
  
  // Convert to integers
  let month = parseInt(expiryMonth, 10);
  let year = parseInt(expiryYear, 10);
  
  // Handle 2-digit years
  if (year < 100) {
    year += 2000;
  }
  
  // Check if month is valid
  if (month < 1 || month > 12) {
    return false;
  }
  
  // Get current date
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-based
  const currentYear = now.getFullYear();
  
  // Check if card is expired
  return (year > currentYear || (year === currentYear && month >= currentMonth));
};

/**
 * Format a card expiry date
 * @param {string} value - The input value to format
 * @returns {string} - The formatted expiry date (MM/YY)
 */
export const formatCardExpiry = (value) => {
  if (!value) return '';
  
  // Remove non-numeric characters
  const digitsOnly = value.replace(/\D/g, '');
  
  if (digitsOnly.length < 3) {
    return digitsOnly;
  } else {
    const month = digitsOnly.substring(0, 2);
    const year = digitsOnly.substring(2, 4);
    
    return `${month}/${year}`;
  }
};

/**
 * Validate a card CVV/CVC code
 * @param {string} cvv - The CVV to validate
 * @param {string} cardType - The card type (optional, for length validation)
 * @returns {boolean} - Whether the CVV is valid
 */
export const validateCardCvv = (cvv, cardType = 'unknown') => {
  if (!cvv) return false;
  
  // Remove non-numeric characters
  const digitsOnly = cvv.replace(/\D/g, '');
  
  // Amex CVVs are 4 digits, others are 3 digits
  const requiredLength = cardType === 'amex' ? 4 : 3;
  return digitsOnly.length === requiredLength;
};

/**
 * Handle specific errors from Stripe for card payments
 * @param {Error} error - The error object from Stripe
 * @returns {string} - A user-friendly error message
 */
export const getCardErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred';
  
  // Check for Stripe error codes
  const code = error.code || '';
  const decline_code = error.decline_code || '';
  
  // Common error messages
  if (code === 'card_declined') {
    if (decline_code === 'insufficient_funds') {
      return 'Your card has insufficient funds. Please use a different card.';
    } else if (decline_code === 'lost_card') {
      return 'This card has been reported lost. Please use a different card.';
    } else if (decline_code === 'stolen_card') {
      return 'This card has been reported stolen. Please use a different card.';
    } else if (decline_code === 'expired_card') {
      return 'Your card has expired. Please use a different card.';
    } else {
      return 'Your card was declined. Please use a different payment method.';
    }
  } else if (code === 'expired_card') {
    return 'Your card has expired. Please update your card information.';
  } else if (code === 'incorrect_cvc') {
    return 'Your card\'s security code is incorrect. Please check your card details.';
  } else if (code === 'processing_error') {
    return 'An error occurred while processing your card. Please try again in a moment.';
  } else if (code === 'rate_limit') {
    return 'Too many payment attempts. Please try again in a moment.';
  }
  
  // Return original message or default error
  return error.message || 'There was a problem processing your payment. Please try again.';
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
  getCountryConfig,
  validateCardNumber,
  formatCardNumber,
  getCardType,
  validateCardExpiry,
  formatCardExpiry,
  validateCardCvv,
  getCardErrorMessage
}; 