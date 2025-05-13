/**
 * Price Service
 * 
 * This service handles interactions with the price API endpoints
 * for retrieving and managing agent pricing information.
 */

import { API_URL } from '../api/core/apiConfig';
import { getAuthHeaders } from '../utils/auth';

/**
 * Get the price for a specific agent
 * @param {string} agentId - The ID of the agent to get the price for
 * @returns {Promise<Object>} - The agent's price data
 */
export const getAgentPrice = async (agentId) => {
  try {
    // Get auth headers
    const headers = getAuthHeaders();
    
    // Extract the base ID if it contains a cache-busting query
    const baseAgentId = agentId.split('?')[0];
    
    // Add cache-busting parameter to prevent browsers from using cached data
    const cacheBuster = agentId.includes('?') ? '' : `?_=${Date.now()}`;
    
    // Make request to fetch agent price
    const response = await fetch(`${API_URL}/api/agent/${baseAgentId}/price${cacheBuster}`, {
      method: 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    // Handle non-OK responses
    if (!response.ok) {
      throw new Error(`Failed to fetch price data. Status: ${response.status}`);
    }
    
    // Parse and return price data
    return await response.json();
  } catch (error) {
    console.error('Error fetching agent price:', error);
    
    // Return mock data for development
    return {
      id: agentId.split('?')[0], // Remove any query parameters
      price: 9.99,
      currency: 'USD',
      subscription: true,
      interval: 'month',
      mock: true
    };
  }
};

/**
 * Update the price for a specific agent
 * @param {string} agentId - The ID of the agent to update the price for
 * @param {Object} priceData - The new price data
 * @returns {Promise<Object>} - The updated agent's price data
 */
export const updateAgentPrice = async (agentId, priceData) => {
  try {
    // Get auth headers
    const headers = getAuthHeaders();
    
    // Extract the base ID if it contains any query parameters
    const baseAgentId = agentId.split('?')[0];
    
    // Add cache-busting parameter
    const cacheBuster = `?_=${Date.now()}`;
    
    // Normalize the price data to ensure it has expected properties
    const normalizedPriceData = {
      basePrice: parseFloat(priceData.basePrice) || 0,
      // IMPORTANT: If discountedPrice is provided, use it directly
      // This is crucial for manual price adjustments
      discountedPrice: priceData.discountedPrice !== undefined 
        ? parseFloat(priceData.discountedPrice) 
        : (parseFloat(priceData.basePrice) || 0),
      currency: priceData.currency || 'USD',
      isFree: priceData.isFree || parseFloat(priceData.basePrice) === 0,
      isSubscription: priceData.isSubscription || false,
      discountPercentage: calculateDiscountPercentage(
        parseFloat(priceData.basePrice) || 0, 
        priceData.discountedPrice !== undefined ? parseFloat(priceData.discountedPrice) : undefined
      )
    };
    
    // Ensure free agents have 0 prices
    if (normalizedPriceData.isFree) {
      normalizedPriceData.basePrice = 0;
      normalizedPriceData.discountedPrice = 0;
    }
    
    // Create the payload with priceDetails structure
    const payload = {
      // Only include price and isFree at root level for backward compatibility
      price: normalizedPriceData.discountedPrice, 
      isFree: normalizedPriceData.isFree,
      
      // Use nested priceDetails object for all price fields
      priceDetails: normalizedPriceData
    };
    
    console.log('Sending normalized price data to backend:', payload);
    
    // Make request to update agent price
    const response = await fetch(`${API_URL}/api/agent/${baseAgentId}/price${cacheBuster}`, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    
    // Handle non-OK responses
    if (!response.ok) {
      throw new Error(`Failed to update price data. Status: ${response.status}`);
    }
    
    // Parse and return updated price data
    const updatedPrice = await response.json();
    console.log('Received updated price from backend:', updatedPrice);
    return updatedPrice;
  } catch (error) {
    console.error('Error updating agent price:', error);
    
    // Return mock data for development
    return {
      ...priceData,
      id: agentId.split('?')[0],
      updated: new Date().toISOString(),
      mock: true
    };
  }
};

/**
 * Calculate discount percentage from base price and discounted price
 * @param {number} basePrice - The base price
 * @param {number} discountedPrice - The discounted price
 * @returns {number} - The discount percentage
 */
const calculateDiscountPercentage = (basePrice, discountedPrice) => {
  // If no base price or no discounted price, return 0
  if (!basePrice || !discountedPrice) return 0;
  
  // If they're the same, there's no discount
  if (basePrice === discountedPrice) return 0;
  
  // Calculate discount percentage
  const discount = ((basePrice - discountedPrice) / basePrice) * 100;
  
  // Return rounded to one decimal place
  return Math.round(discount * 10) / 10;
};

/**
 * Generate consistent mock price data for development
 * @param {string} agentId - ID of the agent
 * @param {Object} priceData - Optional price data to incorporate
 * @returns {Object} - Mock price data
 */
const getMockPriceData = (agentId, priceData = null) => {
  // Use provided price data or defaults
  const basePrice = priceData?.basePrice || 99.99;
  const discount = priceData?.discount || 0;
  const currency = priceData?.currency || 'USD';
  
  // Calculate final price with discount
  const finalPrice = basePrice * (1 - (discount / 100));
  
  return {
    id: `price-${agentId}`,
    agentId,
    basePrice,
    discount,
    finalPrice,
    currency,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mockData: true
  };
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

export default {
  getAgentPrice,
  updateAgentPrice
}; 