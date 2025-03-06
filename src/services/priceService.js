/**
 * Price Service
 * 
 * This service handles interactions with the price API endpoints
 * for retrieving and managing agent pricing information.
 */

import api from '../utils/api';

/**
 * Get price details for an agent
 * @param {string} agentId - The ID of the agent
 * @returns {Promise<Object>} - The price details
 */
export const getAgentPrice = async (agentId) => {
  try {
    const response = await api.get(`/api/agent-prices/${agentId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching agent price:', error);
    throw error;
  }
};

/**
 * Update the price for an agent
 * @param {string} agentId - The ID of the agent
 * @param {Object} priceData - The price data to update
 * @returns {Promise<Object>} - The updated price
 */
export const updateAgentPrice = async (agentId, priceData) => {
  try {
    const response = await api.post(`/api/agent-prices/${agentId}`, priceData);
    return response.data;
  } catch (error) {
    console.error('Error updating agent price:', error);
    throw error;
  }
};

/**
 * Apply a discount to an agent's price
 * @param {string} agentId - The ID of the agent
 * @param {Object} discountData - The discount data to apply
 * @returns {Promise<Object>} - The result of applying the discount
 */
export const applyAgentDiscount = async (agentId, discountData) => {
  try {
    const response = await api.patch(`/api/agent-prices/${agentId}/discount`, discountData);
    return response.data;
  } catch (error) {
    console.error('Error applying agent discount:', error);
    throw error;
  }
};

/**
 * Get price history for an agent
 * @param {string} agentId - The ID of the agent
 * @returns {Promise<Object>} - The price history
 */
export const getAgentPriceHistory = async (agentId) => {
  try {
    const response = await api.get(`/api/agent-prices/${agentId}/history`);
    return response.data;
  } catch (error) {
    console.error('Error fetching agent price history:', error);
    throw error;
  }
};

/**
 * Format price for display with currency
 * @param {number} price - The price value
 * @param {string} currency - The currency code (default: USD)
 * @returns {string} - Formatted price string
 */
export const formatPrice = (price, currency = 'USD') => {
  if (price === 0) return 'Free';
  if (!price) return 'Free';
  
  const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    // Add more currencies as needed
  };
  
  const symbol = currencySymbols[currency] || currency;
  
  return `${symbol}${parseFloat(price).toFixed(2)}`;
};

/**
 * Determine if a discount is currently valid
 * @param {Object} discount - The discount object
 * @returns {boolean} - Whether the discount is valid
 */
export const isDiscountValid = (discount) => {
  if (!discount) return false;
  
  const now = new Date();
  const validFrom = discount.validFrom ? new Date(discount.validFrom) : null;
  const validUntil = discount.validUntil ? new Date(discount.validUntil) : null;
  
  // Check if within valid date range
  if (validFrom && validFrom > now) return false;
  if (validUntil && validUntil < now) return false;
  
  // Ensure there's either an amount or percentage
  return (discount.amount > 0 || discount.percentage > 0);
};

/**
 * Calculate effective price with discount
 * @param {Object} priceData - The price data object
 * @returns {number} - The effective price
 */
export const calculateEffectivePrice = (priceData) => {
  if (!priceData) return 0;
  if (priceData.isFree) return 0;
  
  // If there's a valid discount, use finalPrice
  if (priceData.discount && isDiscountValid(priceData.discount)) {
    return priceData.finalPrice || priceData.basePrice;
  }
  
  // Otherwise use basePrice
  return priceData.basePrice || 0;
}; 