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
 * Capture a PayPal payment after approval
 * @param {string} orderID - PayPal order ID to capture
 * @returns {Promise<Object>} - Capture details
 */
export const capturePayPalPayment = async (orderID, metadata = {}) => {
  try {
    // Try to get cart items from localStorage if not in metadata
    if (!metadata.items) {
      try {
        const cartItems = localStorage.getItem('cartItems');
        if (cartItems) {
          metadata.items = cartItems;
        }
      } catch (err) {
        console.warn('Could not retrieve cart items from localStorage', err);
      }
    }
    
    // Try to get user info from localStorage
    if (!metadata.email) {
      try {
        const userData = localStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          metadata.email = user.email || '';
          metadata.userId = user.id || user.uid || '';
        }
      } catch (err) {
        console.warn('Could not retrieve user data from localStorage', err);
      }
    }
    
    // Generate a unique order ID for tracking
    const generatedOrderId = metadata.orderId || 
                             ('ORD-' + Date.now().toString().substring(6) + 
                             Math.random().toString(36).substring(2, 8).toUpperCase());
    
    const response = await fetch(`${API_URL}/api/payments/capture-paypal-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        orderID,
        metadata: {
          ...metadata,
          orderId: generatedOrderId,
          payment_method: 'paypal',
          order_id: generatedOrderId
        }
      }),
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
 * Create a Stripe Payment Intent for card payments
 * @param {Object} data - Payment data including amount and currency
 * @returns {Promise<Object>} - The payment intent data with client secret
 */
export const createPaymentIntent = async (data) => {
  try {
    const { amount, currency, email, metadata = {}, paymentMethodTypes, items = [] } = data;
    
    if (!amount || !currency) {
      throw new Error('Amount and currency are required for payment');
    }
    
    console.log('Creating payment intent:', { amount, currency, paymentMethodTypes });
    
    // Get cart items from localStorage if not provided
    let cartItems = items;
    if (!cartItems || cartItems.length === 0) {
      try {
        const storedItems = localStorage.getItem('cartItems');
        if (storedItems) {
          cartItems = JSON.parse(storedItems);
        }
      } catch (err) {
        console.warn('Could not retrieve cart items from localStorage', err);
      }
    }
    
    // If we still don't have items, try to get from cart context through localStorage
    if (!cartItems || cartItems.length === 0) {
      try {
        const cart = localStorage.getItem('lastPurchasedItems');
        if (cart) {
          cartItems = JSON.parse(cart);
        }
      } catch (err) {
        console.warn('Could not retrieve cart from localStorage', err);
      }
    }
    
    // Ensure items are in a format that can be properly serialized to JSON
    const formattedItems = Array.isArray(cartItems) ? cartItems.map(item => ({
      id: item.id || 'unknown',
      title: item.title || item.name || 'Product',
      price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
      quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 1,
      imageUrl: item.imageUrl || item.image || null
    })) : [];
    
    // Generate a unique order ID for tracking
    const generatedOrderId = 'ORD-' + Date.now().toString().substring(6) + 
                             Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Try to get user ID from localStorage
    let userId = null;
    try {
      userId = localStorage.getItem('userId') || null;
      
      // Check if we have user data in localStorage
      const userData = localStorage.getItem('userData');
      if (userData && !userId) {
        const user = JSON.parse(userData);
        userId = user.id || user.uid || null;
      }
    } catch (err) {
      console.warn('Could not retrieve user ID from localStorage', err);
    }
    
    const response = await fetch(`${API_URL}/api/payments/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: currency.toLowerCase(),
        email,
        paymentMethodTypes: paymentMethodTypes || ['card'], // Default to card if not specified
        metadata: {
          ...metadata,
          orderId: generatedOrderId,
          email: email || metadata.userEmail || '',
          userEmail: metadata.userEmail || email || '',
          items: JSON.stringify(formattedItems), // Convert items array to a JSON string for metadata
          userId: userId,
          source: 'checkout-form'
        }
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Payment intent creation failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Payment intent created successfully:', result);
    
    return result;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Confirm a card payment
 * @param {string} clientSecret - The payment intent client secret
 * @param {Object} paymentMethod - The payment method data
 * @returns {Promise<Object>} - The payment confirmation result
 */
export const confirmCardPayment = async (clientSecret, paymentMethod) => {
  // This is handled by Stripe.js directly on the client side
  // We include this function for documentation purposes
  try {
    // In a real implementation, you might have additional server-side validation
    // or logging related to the payment confirmation
    console.log('Confirming card payment with client secret');
    
    // Return a structured object for consistent API
    return {
      success: true,
      message: 'Payment confirmation initiated by client'
    };
  } catch (error) {
    console.error('Error in confirmCardPayment:', error);
    throw error;
  }
};

/**
 * Check the status of a card payment
 * @param {string} paymentIntentId - The payment intent ID
 * @returns {Promise<Object>} - The payment status
 */
export const checkCardPaymentStatus = async (paymentIntentId) => {
  try {
    if (!paymentIntentId) {
      throw new Error('Payment ID is required');
    }
    
    const response = await fetch(`${API_URL}/api/payments/payment-status/${paymentIntentId}?type=payment_intent`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Payment status check failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking card payment status:', error);
    throw error;
  }
};

/**
 * Get payment status
 * @param {string} id - Payment ID
 * @param {string} type - Payment type (payment_intent, checkout_session, paypal_order, sepa_credit_transfer)
 * @returns {Promise<Object>} - Payment status details
 */
export const getPaymentStatus = async (id, type = 'payment_intent') => {
  try {
    // Log what we're checking for diagnostic purposes
    console.log(`Checking payment status for ${type} ${id}`);
    
    // Handle special payment types that use different endpoints
    if (type === 'sepa_credit_transfer') {
      const response = await fetch(`${API_URL}/api/payments/sepa-credit-transfer/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Gracefully handle errors for SEPA payments
        console.warn(`SEPA payment check returned status ${response.status}`);
        
        // For SEPA, we'll return a pending status as a fallback
        // This is because the payment might still be processing in the banking system
        return {
          success: true,
          id,
          type,
          status: 'pending',
          result: {
            id,
            status: 'pending',
            metadata: { orderId: id }
          }
        };
      }
      
      return await response.json();
    }
    
    // Standard payment status endpoint for other payment types
    const response = await fetch(`${API_URL}/api/payments/payment-status/${id}?type=${type}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
      throw new Error(errorData.error || 'Failed to get payment status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking payment status:', error);
    
    // Return a minimal fallback object that the UI can handle
    if (type === 'sepa_credit_transfer') {
      return {
        success: true,
        id,
        type,
        status: 'pending',  // Default status for SEPA
        result: {
          id,
          status: 'pending',
          metadata: { orderId: id }
        }
      };
    }
    
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

/**
 * Validate Apple Pay merchant
 * @param {string} validationURL - The validation URL provided by Apple Pay
 * @returns {Promise<Object>} - Merchant session object from Apple
 */
export const validateApplePayMerchant = async (validationURL) => {
  try {
    console.log('Validating Apple Pay merchant with URL:', validationURL);
    
    if (!validationURL) {
      throw new Error('Missing validation URL');
    }
    
    const response = await fetch(`${API_URL}/api/payments/validate-apple-pay-merchant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ validationURL }),
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('Apple Pay validation error response:', errorData);
      } catch (parseError) {
        const textError = await response.text();
        console.error('Response text:', textError);
        throw new Error(`Server returned ${response.status}: ${textError || 'No response body'}`);
      }
      throw new Error(errorData.error || `Failed to validate Apple Pay merchant: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log('Apple Pay merchant validation successful:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error validating Apple Pay merchant:', error);
    throw error;
  }
};

/**
 * Process Google Pay payment
 * @param {Object} data - Payment data including paymentData, amount, currency, items, and email
 * @returns {Promise<Object>} - Payment processing result
 */
export const processGooglePay = async (data) => {
  try {
    console.log('Processing Google Pay payment');
    
    if (!data || !data.paymentData) {
      throw new Error('Missing payment data');
    }
    
    // Enhance data with additional metadata for order processing
    const enhancedData = { ...data };
    
    // Validate email
    const email = data.email || '';
    if (!email || !email.includes('@')) {
      console.warn('Google Pay payment attempted without valid email', { emailProvided: !!email });
    }
    
    // Try to get cart items from data or localStorage if not provided
    if (!enhancedData.items || !enhancedData.items.length) {
      try {
        const storedItems = localStorage.getItem('cartItems');
        if (storedItems) {
          enhancedData.items = JSON.parse(storedItems);
        }
      } catch (err) {
        console.error('Error retrieving cart from localStorage:', err);
      }
    }
    
    // Try to enhance metadata with user information
    try {
      // Ensure metadata object exists
      enhancedData.metadata = enhancedData.metadata || {};
      
      const userId = localStorage.getItem('userId');
      if (userId) {
        enhancedData.metadata.userId = userId;
        enhancedData.metadata.userEmail = email;
      }
      
      // Store additional email in metadata to ensure it reaches the backend
      if (email) {
        enhancedData.metadata.email = email;
      }
    } catch (err) {
      console.error('Error retrieving user data from localStorage:', err);
    }
    
    // Generate a unique order ID for tracking
    const generatedOrderId = 'ORD-' + Date.now().toString().substring(6) + 
                             Math.random().toString(36).substring(2, 8).toUpperCase();
    
    enhancedData.metadata.orderId = generatedOrderId;
    enhancedData.metadata.order_id = generatedOrderId;
    enhancedData.metadata.payment_method = 'google_pay';
    
    // Create the orderDetails object
    const orderDetails = {
      amount: enhancedData.orderDetails?.amount || enhancedData.amount || enhancedData.cartTotal || 0,
      currency: enhancedData.orderDetails?.currency || enhancedData.currency || 'USD',
      items: enhancedData.orderDetails?.items || enhancedData.items || []
    };
    
    // Convert items to JSON string if needed
    if (enhancedData.items && Array.isArray(enhancedData.items)) {
      enhancedData.metadata.items = JSON.stringify(enhancedData.items);
    }
    
    console.log('Sending Google Pay request with data:', {
      paymentData: 'REDACTED',
      orderDetails,
      email,
      metadata: enhancedData.metadata
    });
    
    const response = await fetch(`${API_URL}/api/payments/process-google-pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentData: enhancedData.paymentData,
        orderDetails,
        email: email,
        metadata: enhancedData.metadata
      }),
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('Google Pay processing error response:', errorData);
      } catch (parseError) {
        const textError = await response.text();
        console.error('Response text:', textError);
        throw new Error(`Server returned ${response.status}: ${textError || 'No response body'}`);
      }
      throw new Error(errorData.error || `Failed to process Google Pay payment: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log('Google Pay payment processed successfully:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error processing Google Pay payment:', error);
    throw error;
  }
};

/**
 * Process Apple Pay payment
 * @param {Object} data - Payment data including payment object, amount, currency, items, and email
 * @returns {Promise<Object>} - Payment processing result
 */
export const processApplePay = async (data) => {
  try {
    console.log('Processing Apple Pay payment');
    
    if (!data.payment || !data.payment.token) {
      throw new Error('Missing payment token');
    }
    
    // Enhance data with additional metadata for order processing
    const enhancedData = { ...data };
    
    // Try to get cart items from data or localStorage if not provided
    if (!enhancedData.items || enhancedData.items.length === 0) {
      try {
        const storedItems = localStorage.getItem('cartItems');
        if (storedItems) {
          enhancedData.items = JSON.parse(storedItems);
        }
      } catch (err) {
        console.warn('Could not retrieve cart items from localStorage', err);
      }
    }
    
    // Try to get user info from localStorage
    if (!enhancedData.metadata) enhancedData.metadata = {};
    
    try {
      // Try to get user ID from localStorage
      const userId = localStorage.getItem('userId');
      if (userId) {
        enhancedData.metadata.userId = userId;
      }
      
      // Try to get user data from localStorage
      const userData = localStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        if (!enhancedData.email && user.email) {
          enhancedData.email = user.email;
        }
        if (!enhancedData.metadata.userId && (user.id || user.uid)) {
          enhancedData.metadata.userId = user.id || user.uid;
        }
      }
    } catch (err) {
      console.warn('Could not retrieve user data from localStorage', err);
    }
    
    // Generate a unique order ID for tracking
    const generatedOrderId = 'ORD-' + Date.now().toString().substring(6) + 
                             Math.random().toString(36).substring(2, 8).toUpperCase();
    
    enhancedData.metadata.orderId = generatedOrderId;
    enhancedData.metadata.order_id = generatedOrderId;
    enhancedData.metadata.payment_method = 'apple_pay';
    
    // Convert items to JSON string if needed
    if (enhancedData.items && Array.isArray(enhancedData.items)) {
      enhancedData.metadata.items = JSON.stringify(enhancedData.items);
    }
    
    const response = await fetch(`${API_URL}/api/payments/process-apple-pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enhancedData),
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('Apple Pay processing error response:', errorData);
      } catch (parseError) {
        const textError = await response.text();
        console.error('Response text:', textError);
        throw new Error(`Server returned ${response.status}: ${textError || 'No response body'}`);
      }
      throw new Error(errorData.error || `Failed to process Apple Pay payment: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log('Apple Pay payment processed successfully:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error processing Apple Pay payment:', error);
    throw error;
  }
};

/**
 * Get thank you page redirect URL for a specific session
 * @param {string} sessionId - The payment session ID
 * @returns {string} - The URL to redirect to
 */
export const getThankYouRedirectUrl = (sessionId) => {
  if (!sessionId) {
    console.error('Missing session ID for thank you redirect');
    return `${window.location.origin}/checkout/success`;
  }
  
  return `${API_URL}/api/payments/thankyou?session_id=${sessionId}`;
};

/**
 * Create a Stripe checkout session (direct endpoint call)
 * This is an alternative to createStripeCheckout that calls the endpoint directly
 * @param {Object} data - Cart data including items, successUrl, cancelUrl, etc.
 * @returns {Promise<Object>} - Checkout session with URL
 */
export const createCheckoutSession = async (data) => {
  try {
    console.log('Creating checkout session with data:', JSON.stringify(data, null, 2));
    
    const response = await fetch(`${API_URL}/api/payments/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('Checkout session error response:', errorData);
      } catch (parseError) {
        const textError = await response.text();
        console.error('Response text:', textError);
        throw new Error(`Server returned ${response.status}: ${textError || 'No response body'}`);
      }
      throw new Error(errorData.error || `Failed to create checkout session: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log('Checkout session created successfully:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}; 