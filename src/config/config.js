/**
 * Global Configuration
 * 
 * This file centralizes all environment-specific configuration for the application.
 * Always use these constants instead of hardcoded values or scattered environment variable access.
 */

// Environment detection
export const ENV = {
  PROD: import.meta.env.VITE_NODE_ENV === 'production' || import.meta.env.MODE === 'production',
  DEV: import.meta.env.DEV === true || import.meta.env.MODE === 'development',
  TEST: import.meta.env.MODE === 'test',
  LOCAL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
};

// API Configuration
export const API = {
  URL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
  RETRY_ATTEMPTS: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3', 10)
};

// Firebase Configuration
export const FIREBASE = {
  API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  APP_ID: import.meta.env.VITE_FIREBASE_APP_ID
};

// Authentication Configuration
export const AUTH = {
  MICROSOFT: {
    CLIENT_ID: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    CALLBACK_URL: import.meta.env.VITE_MICROSOFT_CALLBACK_URL
  }
};

// Payment Configuration
export const PAYMENT = {
  STRIPE: {
    PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    WEBHOOK_SECRET: import.meta.env.VITE_STRIPE_WEBHOOK_SECRET,
    ELEMENTS_APPEARANCE: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#007bff'
      }
    }
  },
  PAYPAL: {
    CLIENT_ID: import.meta.env.VITE_PAYPAL_CLIENT_ID,
    CURRENCY: 'USD',
    INTENT: 'capture'
  },
  GOOGLE_PAY: {
    ENVIRONMENT: import.meta.env.VITE_GOOGLE_PAY_ENVIRONMENT || 'TEST',
    GATEWAY: import.meta.env.VITE_GOOGLE_PAY_GATEWAY || 'stripe',
    MERCHANT_NAME: import.meta.env.VITE_MERCHANT_NAME || 'AI Waverider'
  },
  APPLE_PAY: {
    MERCHANT_ID: import.meta.env.VITE_APPLE_PAY_MERCHANT_ID
  },
  ENABLE_SIMULATION: ENV.DEV && (import.meta.env.VITE_ENABLE_PAYMENT_SIMULATION === 'true'),
  ALLOWED_CURRENCIES: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY']
};

// External Services
export const SERVICES = {
  YOUTUBE_API_KEY: import.meta.env.VITE_YOUTUBE_API_KEY
};

// Monitoring and Logging
export const MONITORING = {
  SENTRY: {
    DSN: import.meta.env.VITE_SENTRY_DSN,
    ENVIRONMENT: import.meta.env.MODE,
    TRACES_SAMPLE_RATE: 0.5
  },
  LOGROCKET: {
    APP_ID: import.meta.env.VITE_LOGROCKET_APP_ID
  },
  LOGGING_LEVEL: ENV.PROD ? 'error' : 'debug'
};

// Feature Flags
export const FEATURES = {
  ENABLE_CRYPTO_PAYMENTS: import.meta.env.VITE_ENABLE_CRYPTO === 'true',
  ENABLE_APPLE_PAY: import.meta.env.VITE_ENABLE_APPLE_PAY !== 'false',
  ENABLE_GOOGLE_PAY: import.meta.env.VITE_ENABLE_GOOGLE_PAY !== 'false',
  ENABLE_SEPA: import.meta.env.VITE_ENABLE_SEPA !== 'false',
  // Only show these features in development unless explicitly enabled in production
  SHOW_TEST_FEATURES: ENV.DEV || import.meta.env.VITE_SHOW_TEST_FEATURES === 'true'
};

export default {
  ENV,
  API,
  FIREBASE,
  AUTH,
  PAYMENT,
  SERVICES,
  MONITORING,
  FEATURES
}; 