/**
 * PAYMENT API SERVICE - MIGRATION TO PRODUCTION
 * =============================================
 * 
 * This file contains client-side payment API service functions.
 * To migrate from test to production environment, follow these steps:
 * 
 * 1. FRONTEND API KEYS
 *    - Update the publishable Stripe key in your .env.production file:
 *      VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
 *    - Update any other payment service public keys (PayPal client ID, etc.)
 *    - Ensure test keys are NEVER used in production environment
 * 
 * 2. PAYMENT ENDPOINTS
 *    - Verify your API endpoints point to the production backend:
 *      - Ensure VITE_API_URL in .env.production points to your production API
 *      - Double-check that your API requests use the correct base URL
 *    - Update any hard-coded test endpoints that may exist in the code
 * 
 * 3. ERROR HANDLING
 *    - Enhance error handling to provide better user feedback in production
 *    - Implement graceful fallbacks when payment services are unavailable
 *    - Consider adding retry logic for intermittent failures
 *    - Ensure proper error reporting to monitoring tools
 * 
 * 4. FRONTEND VALIDATION
 *    - Implement additional validation to minimize failed payment attempts
 *    - Ensure address validation is properly implemented for regions you serve
 *    - Verify that card validation provides helpful feedback to users
 * 
 * 5. PAYMENT METHOD SUPPORT
 *    - Verify that all payment methods shown in the UI are actually enabled in your
 *      Stripe dashboard and other payment provider accounts
 *    - Consider region-specific testing for international payment methods
 *    - Test mobile wallet integrations (Apple Pay, Google Pay) on actual devices
 * 
 * 6. ANALYTICS & MONITORING
 *    - Add conversion tracking for successful payments
 *    - Implement abandonment tracking for checkout funnels
 *    - Set up alerting for abnormal payment failure rates
 */

import axios from 'axios';

// Use environment variable for API URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Create API instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to check API connectivity
export const checkApiConnectivity = async () => {
  try {
    console.log(`Checking API connectivity with ${API_URL}`);
    
    // First try the test endpoint which should always work if routes are registered
    try {
      const testResponse = await fetch(`${API_URL}/api/payments/test`);
      if (testResponse.ok) {
        console.log('Basic test endpoint is responsive');
      } else {
        console.error(`Basic test endpoint failed: ${testResponse.status}`);
      }
    } catch (testError) {
      console.error('Cannot connect to basic test endpoint:', testError);
    }
    
    // Then try the full connectivity test
    const response = await fetch(`${API_URL}/api/payments/test-connectivity`);
    
    if (!response.ok) {
      console.error(`API connectivity test failed: ${response.status}`);
      
      // If we get a 404, the route might not be registered properly
      if (response.status === 404) {
        // Try a fallback to see if the backend is running at all
        try {
          const fallbackResponse = await fetch(`${API_URL}/api`);
          if (fallbackResponse.ok) {
            return { 
              ok: false, 
              error: `API endpoint not found (404) but server is running. Backend routes may not be properly registered.`,
              fallbackOk: true
            };
          }
        } catch (fallbackError) {
          // Fallback also failed
        }
      }
      
      return { 
        ok: false, 
        error: `API returned status ${response.status}` 
      };
    }
    
    const data = await response.json();
    console.log('API connectivity test results:', data);
    
    return { 
      ok: true, 
      data 
    };
  } catch (error) {
    console.error('API connectivity check failed:', error);
    
    // If we get a network error, the backend might not be running at all
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return { 
        ok: false, 
        error: `Cannot connect to backend server at ${API_URL}. Is the server running?` 
      };
    }
    
    return { 
      ok: false, 
      error: error.message 
    };
  }
};

// Helper to determine the correct payment endpoint based on method
export const getPaymentMethodEndpoint = async (method = 'card', countryCode = 'US') => {
  try {
    const response = await fetch(`${API_URL}/api/payments/payment-methods?countryCode=${countryCode}`);
    
    if (!response.ok) {
      console.error(`Failed to get payment methods: ${response.status}`);
      // Default fallbacks if the endpoint fails
      return method === 'paypal' 
        ? `${API_URL}/api/payments/create-paypal-order` 
        : `${API_URL}/api/payments/create-stripe-checkout`;
    }
    
    const data = await response.json();
    console.log('Available payment methods:', data);
    
    // Find the method in the response
    const methodName = method === 'sepa' ? 'sepa_debit' : method;
    
    if (data.methodDetails && data.methodDetails[methodName]) {
      return `${API_URL}${data.methodDetails[methodName].endpoint}`;
    }
    
    // Fallback to Stripe for most methods
    return method === 'paypal' 
      ? `${API_URL}/api/payments/create-paypal-order` 
      : `${API_URL}/api/payments/create-stripe-checkout`;
  } catch (error) {
    console.error('Error getting payment method endpoint:', error);
    // Default fallbacks if the endpoint fails
    return method === 'paypal' 
      ? `${API_URL}/api/payments/create-paypal-order` 
      : `${API_URL}/api/payments/create-stripe-checkout`;
  }
};

/**
 * Create a PayPal order
 * @param {Object} data - Cart data including cartTotal and items
 * @returns {Promise<Object>} - PayPal order details with order ID
 */
export const createPayPalOrder = async (data) => {
  try {
    const endpoint = await getPaymentMethodEndpoint('paypal');
    console.log(`Attempting to create PayPal order at: ${endpoint}`);
    console.log('Request data:', JSON.stringify(data, null, 2));
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    console.log('PayPal order response status:', response.status);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('PayPal order error response:', errorData);
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        const textError = await response.text();
        console.error('Response text:', textError);
        throw new Error(`Server returned ${response.status}: ${textError || 'No response body'}`);
      }
      throw new Error(errorData.error || `Failed to create PayPal order: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log('PayPal order created successfully:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    throw error;
  }
};

/**
 * Capture PayPal payment after approval
 * @param {string} orderID - PayPal order ID to capture
 * @returns {Promise<Object>} - Capture details
 */
export const capturePayPalPayment = async (orderID) => {
  try {
    const response = await fetch(`${API_URL}/api/payments/capture-paypal-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderID }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to capture PayPal payment');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error capturing PayPal payment:', error);
    throw error;
  }
};

/**
 * Create a Stripe checkout session
 * @param {Object} data - Cart data including cartTotal, items, currency, and countryCode
 * @returns {Promise<Object>} - Stripe checkout session details with session URL
 */
export const createStripeCheckout = async (data) => {
  try {
    // Determine if we're dealing with SEPA or iDEAL
    const paymentMethod = data.paymentMethodTypes && data.paymentMethodTypes.length > 0 
      ? data.paymentMethodTypes[0] 
      : 'card';
    
    const endpoint = await getPaymentMethodEndpoint(paymentMethod, data.countryCode);
    
    console.log(`Attempting to create Stripe checkout session at: ${endpoint}`);
    console.log('Stripe request data:', JSON.stringify(data, null, 2));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('Stripe checkout response status:', response.status);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('Stripe checkout error response:', errorData);
          
          // Better handling of detailed error information
          if (errorData.details) {
            console.error('Stripe error details:', errorData.details);
          }
          
          // Enhanced error message with details if available
          const errorMessage = errorData.error || `Failed to create Stripe checkout session: ${response.status}`;
          throw new Error(errorMessage);
        } catch (parseError) {
          console.error('Failed to parse Stripe error response:', parseError);
          const textError = await response.text();
          console.error('Stripe response text:', textError);
          throw new Error(`Server returned ${response.status}: ${textError || 'No response body'}`);
        }
      }
      
      const responseData = await response.json();
      console.log('Stripe checkout session created successfully:', responseData);
      return responseData;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Request timed out after 15 seconds');
        throw new Error('Request timed out. The server took too long to respond. Please try again.');
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    throw error;
  }
};

/**
 * Create a Stripe payment intent for Custom Elements
 * @param {Object} data - Payment data including amount, currency, and paymentMethodTypes
 * @returns {Promise<Object>} - Payment intent with client secret
 */
export const createPaymentIntent = async (data) => {
  try {
    const response = await fetch(`${API_URL}/api/payments/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payment intent');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Check payment status
 * @param {string} id - Payment ID (payment intent or checkout session)
 * @param {string} type - Payment type ('payment_intent' or 'checkout_session')
 * @returns {Promise<Object>} - Payment status details
 */
export const getPaymentStatus = async (id, type = 'payment_intent') => {
  try {
    const response = await fetch(`${API_URL}/api/payments/payment-status/${id}?type=${type}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get payment status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking payment status:', error);
    throw error;
  }
};

/**
 * Create a crypto payment (BitPay)
 * @param {Object} data - Cart data including cartTotal, items, and currency
 * @returns {Promise<Object>} - BitPay invoice details with payment URL
 */
export const createCryptoPayment = async (data) => {
  try {
    const response = await fetch(`${API_URL}/api/payments/create-crypto-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create crypto payment');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating crypto payment:', error);
    throw error;
  }
};

/**
 * Check crypto payment status
 * @param {string} id - BitPay invoice ID
 * @returns {Promise<Object>} - Payment status details
 */
export const getCryptoPaymentStatus = async (id) => {
  try {
    const response = await fetch(`${API_URL}/api/payments/crypto-payment-status/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get crypto payment status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking crypto payment status:', error);
    throw error;
  }
};

/**
 * Detect user's country code
 * @returns {Promise<string>} - Two-letter country code
 */
export const detectUserCountry = async () => {
  try {
    // Try to get country from IP geolocation service
    const response = await fetch('https://ipapi.co/json/');
    
    if (response.ok) {
      const data = await response.json();
      return data.country_code;
    }
    
    // Fallback to browser's language preferences
    const language = navigator.language || navigator.userLanguage;
    const country = language.split('-')[1];
    
    return country || 'US'; // Default to US if detection fails
  } catch (error) {
    console.error('Error detecting user country:', error);
    return 'US'; // Default to US if detection fails
  }
}; 