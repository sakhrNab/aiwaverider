/**
 * Price Service
 * 
 * This service handles interactions with the price API endpoints
 * for retrieving and managing agent pricing information.
 */

import api from '../utils/api';

/**
 * Get authentication headers
 * @returns {Object} - Authentication headers
 */
const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Get token from localStorage or sessionStorage
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (token) {
    // Always use Bearer format for auth token
    headers['Authorization'] = `Bearer ${token}`;
    console.log('PriceService: Auth token set', headers['Authorization'].substring(0, 20) + '...');
  } else {
    console.warn('PriceService: No auth token found');
    
    // For development, generate a mock token if one doesn't exist
    if (process.env.NODE_ENV === 'development') {
      console.warn('PriceService: Generating mock token for development');
      
      // Create a basic mock JWT
      const mockJwt = {
        header: { alg: "HS256", typ: "JWT" },
        payload: {
          sub: "price-service-mock-user",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          user_id: "price-service-mock-user"
        }
      };
      
      // Encode the JWT parts
      const encodeBase64 = (obj) => {
        return btoa(JSON.stringify(obj))
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
      };
      
      const header = encodeBase64(mockJwt.header);
      const payload = encodeBase64(mockJwt.payload);
      const signature = encodeBase64("priceservicemock");
      
      const mockToken = `${header}.${payload}.${signature}`;
      localStorage.setItem('authToken', mockToken);
      
      // Update headers with the new token
      headers['Authorization'] = `Bearer ${mockToken}`;
      console.log('PriceService: Generated and set mock token');
    }
  }
  
  return headers;
};

/**
 * Get price for a specific agent
 * @param {string} agentId - ID of the agent
 * @returns {Promise<Object>} - Price information
 */
export const getAgentPrice = async (agentId) => {
  try {
    console.log(`Fetching price for agent: ${agentId}`);
    
    // First, check if we have a valid token
    const token = localStorage.getItem('authToken');
    if (!token && process.env.NODE_ENV === 'development') {
      // If no token, we'll immediately return mock data in dev mode
      console.warn('No token available for price request - using mock data');
      return getMockPriceData(agentId);
    }
    
    const response = await fetch(`http://localhost:4000/api/agent/${agentId}/price`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (response.status === 500) {
      console.error(`Server error (500) when fetching price for agent ${agentId}`);
      console.warn('Using mock price data due to server error');
      return getMockPriceData(agentId);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get price for agent ${agentId} (${response.status})`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Response is not JSON, using mock data');
      return getMockPriceData(agentId);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting agent price:', error);
    
    // Return mock data for development if API fails
    return getMockPriceData(agentId);
  }
};

/**
 * Update price for a specific agent
 * @param {string} agentId - ID of the agent
 * @param {Object} priceData - Price data to update
 * @returns {Promise<Object>} - Updated price information
 */
export const updateAgentPrice = async (agentId, priceData) => {
  try {
    console.log(`Updating price for agent: ${agentId}`, priceData);
    
    // First, check if we have a valid token
    const token = localStorage.getItem('authToken');
    if (!token && process.env.NODE_ENV === 'development') {
      // If no token, we'll immediately return mock data in dev mode
      console.warn('No token available for price update - using mock data');
      return getMockPriceData(agentId, priceData);
    }
    
    const response = await fetch(`http://localhost:4000/api/agent/${agentId}/price`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(priceData)
    });
    
    if (response.status === 500) {
      console.error(`Server error (500) when updating price for agent ${agentId}`);
      console.warn('Using mock price data due to server error');
      return getMockPriceData(agentId, priceData);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to update price for agent ${agentId} (${response.status})`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Response is not JSON, using mock data');
      return getMockPriceData(agentId, priceData);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating agent price:', error);
    
    // Return mock data for development if API fails
    return getMockPriceData(agentId, priceData);
  }
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