// API URL - adjust based on your environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Create a PayPal order
 * @param {Object} data - Cart data including cartTotal and items
 * @returns {Promise<Object>} - PayPal order details with order ID
 */
export const createPayPalOrder = async (data) => {
  try {
    const response = await fetch(`${API_URL}/payments/create-paypal-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create PayPal order');
    }
    
    return await response.json();
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
    const response = await fetch(`${API_URL}/payments/capture-paypal-payment`, {
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