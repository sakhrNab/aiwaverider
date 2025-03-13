// API URL - adjust based on your environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Create a PayPal order
 * @param {Object} data - Cart data including cartTotal and items
 * @returns {Promise<Object>} - PayPal order details with order ID
 */
export const createPayPalOrder = async (data) => {
  try {
    console.log(`Attempting to create PayPal order at: ${API_URL}/api/payments/create-paypal-order`);
    console.log('Request data:', JSON.stringify(data, null, 2));
    
    const response = await fetch(`${API_URL}/api/payments/create-paypal-order`, {
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
    const response = await fetch(`${API_URL}/api/payments/create-stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create Stripe checkout session');
    }
    
    return await response.json();
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