// src/api/marketplace/checkoutApi.js

import { api } from '../core/apiConfig';

// Initialize checkout session for an agent subscription
export const initializeCheckout = async (agentId, planId) => {
  try {
    console.log(`[API] Initializing checkout for agent ${agentId} with plan ${planId}`);
    const response = await api.post('/api/checkout/create-session', {
      agentId,
      planId
    });
    return response.data;
  } catch (error) {
    console.error('Error initializing checkout:', error);
    throw error;
  }
};

// Get customer's payment methods
export const getPaymentMethods = async () => {
  try {
    const response = await api.get('/api/checkout/payment-methods');
    return response.data;
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    throw error;
  }
};

// Add a new payment method
export const addPaymentMethod = async (paymentMethodData) => {
  try {
    console.log('[API] Adding new payment method');
    const response = await api.post('/api/checkout/payment-methods', paymentMethodData);
    return response.data;
  } catch (error) {
    console.error('Error adding payment method:', error);
    throw error;
  }
};

// Delete a payment method
export const deletePaymentMethod = async (paymentMethodId) => {
  try {
    console.log(`[API] Deleting payment method ${paymentMethodId}`);
    const response = await api.delete(`/api/checkout/payment-methods/${paymentMethodId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting payment method ${paymentMethodId}:`, error);
    throw error;
  }
};

// Set default payment method
export const setDefaultPaymentMethod = async (paymentMethodId) => {
  try {
    console.log(`[API] Setting default payment method ${paymentMethodId}`);
    const response = await api.post('/api/checkout/payment-methods/default', {
      paymentMethodId
    });
    return response.data;
  } catch (error) {
    console.error('Error setting default payment method:', error);
    throw error;
  }
};

// Get customer's subscriptions
export const getCustomerSubscriptions = async () => {
  try {
    const response = await api.get('/api/checkout/subscriptions');
    return response.data;
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }
};

// Cancel a subscription
export const cancelSubscription = async (subscriptionId) => {
  try {
    console.log(`[API] Canceling subscription ${subscriptionId}`);
    const response = await api.post(`/api/checkout/subscriptions/${subscriptionId}/cancel`);
    return response.data;
  } catch (error) {
    console.error(`Error canceling subscription ${subscriptionId}:`, error);
    throw error;
  }
};

// Reactivate a canceled subscription
export const reactivateSubscription = async (subscriptionId) => {
  try {
    console.log(`[API] Reactivating subscription ${subscriptionId}`);
    const response = await api.post(`/api/checkout/subscriptions/${subscriptionId}/reactivate`);
    return response.data;
  } catch (error) {
    console.error(`Error reactivating subscription ${subscriptionId}:`, error);
    throw error;
  }
};

// Update a subscription plan
export const updateSubscriptionPlan = async (subscriptionId, newPlanId) => {
  try {
    console.log(`[API] Updating subscription ${subscriptionId} to plan ${newPlanId}`);
    const response = await api.post(`/api/checkout/subscriptions/${subscriptionId}/update`, {
      planId: newPlanId
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating subscription ${subscriptionId}:`, error);
    throw error;
  }
};

// Get customer's invoices
export const getInvoices = async (limit = 10) => {
  try {
    const response = await api.get(`/api/checkout/invoices?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
};

// Get a specific invoice by ID
export const getInvoiceById = async (invoiceId) => {
  try {
    const response = await api.get(`/api/checkout/invoices/${invoiceId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching invoice ${invoiceId}:`, error);
    throw error;
  }
};

// Get available plans for an agent
export const getAgentPlans = async (agentId) => {
  try {
    const response = await api.get(`/api/agents/${agentId}/plans`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching plans for agent ${agentId}:`, error);
    throw error;
  }
};

// Create promo code
export const createPromoCode = async (promoCodeData) => {
  try {
    console.log('[API] Creating new promo code:', promoCodeData);
    const response = await api.post('/api/checkout/promo-codes', promoCodeData);
    return response.data;
  } catch (error) {
    console.error('Error creating promo code:', error);
    throw error;
  }
};

// Validate promo code
export const validatePromoCode = async (code) => {
  try {
    console.log(`[API] Validating promo code: ${code}`);
    const response = await api.get(`/api/checkout/promo-codes/${code}/validate`);
    return response.data;
  } catch (error) {
    console.error('Error validating promo code:', error);
    throw error;
  }
};

// Get checkout session status
export const getCheckoutSessionStatus = async (sessionId) => {
  try {
    const response = await api.get(`/api/checkout/sessions/${sessionId}/status`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching checkout session status for ${sessionId}:`, error);
    throw error;
  }
}; 