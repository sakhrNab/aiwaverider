/**
 * Recommendation Service
 * 
 * This service handles fetching personalized recommendations and tracking product views.
 * It has multiple fallback mechanisms to ensure users always get recommendations.
 * 
 * API Endpoints used:
 * - GET /api/recommendations - Get personalized recommendations
 * - POST /api/recommendations/track-view - Track when a user views a product
 * - GET /api-test/recommendations - Fallback endpoint for testing
 */

// API URL - adjust based on your environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
console.log('Recommendation Service initialized with API_URL:', API_URL);

// Import the product data utilities and agent utilities
import { getFeaturedProducts, getRelatedProducts } from '../utils/productData';
import { fetchAgents, fetchFeaturedAgents } from '../utils/api';

/**
 * Validate a recommendation object to ensure it has required fields
 * @param {Object} item - Recommendation item to validate
 * @returns {boolean} - Whether the item is valid
 */
const isValidRecommendation = (item) => {
  return (
    item && 
    typeof item === 'object' &&
    item.id && 
    typeof item.id === 'string' &&
    (item.title || item.name) // Must have a title or name
  );
};

/**
 * Ensure all recommendations have the required fields and proper URLs
 * @param {Array} recommendations - Array of recommendation objects
 * @returns {Array} - Array of validated and formatted recommendations
 */
const formatRecommendations = (recommendations) => {
  if (!Array.isArray(recommendations)) return [];
  
  return recommendations
    .filter(isValidRecommendation)
    .map(item => ({
      ...item,
      // Ensure consistent URL format
      detailUrl: `/agents/${item.id}`
    }));
};

/**
 * Fetch personalized product recommendations
 * 
 * @param {Object} options - Options for recommendation filtering
 * @param {number} options.limit - Maximum number of recommendations to return
 * @param {string} options.excludeProductId - Product ID to exclude from recommendations
 * @param {boolean} options.useHistory - Whether to use user's view/purchase history
 * @returns {Promise<Array>} - Array of recommended products
 */
export const getPersonalizedRecommendations = async (options = {}) => {
  try {
    const { 
      limit = 3, 
      excludeProductId = null,
      useHistory = true
    } = options;

    console.log('Getting personalized recommendations with options:', options);
    
    // Try first with the real-agents endpoint that guarantees real agents
    try {
      const realAgentsUrl = `${API_URL}/api/recommendations/real-agents?limit=${limit}`;
      console.log(`First attempting to fetch from real-agents endpoint: ${realAgentsUrl}`);
      
      const response = await fetch(realAgentsUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Received agents from real-agents endpoint:', data);
        
        if (data.recommendations && data.recommendations.length > 0) {
          // These should already be formatted correctly
          return data.recommendations;
        }
      }
      
      console.log('Real-agents endpoint failed or returned no data, trying standard endpoint');
    } catch (error) {
      console.warn('Real-agents endpoint failed:', error.message);
      // Continue to try other methods
    }
    
    // Try the API endpoint next with proper authentication
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit);
      
      if (excludeProductId) {
        queryParams.append('exclude', excludeProductId);
      }
      
      if (useHistory !== undefined) {
        queryParams.append('useHistory', useHistory);
      }

      console.log(`Fetching personalized recommendations from: ${API_URL}/api/recommendations?${queryParams}`);
      
      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Using authentication token for recommendations');
      } else {
        console.log('No authentication token available - fetching anonymous recommendations');
      }
      
      const response = await fetch(`${API_URL}/api/recommendations?${queryParams}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        console.warn(`Main recommendation API returned ${response.status}. Trying fallback endpoint.`);
        throw new Error(`Main API endpoint failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received recommendations from main API:', data);
      
      // Validate and format the recommendations
      if (data.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        const formattedRecommendations = formatRecommendations(data.recommendations);
        if (formattedRecommendations.length > 0) {
          return formattedRecommendations;
        }
      }
      
      console.warn('Main API returned empty or invalid recommendations');
      throw new Error('No valid recommendations in main API response');
    } catch (mainApiError) {
      // Log the error and try the test API endpoint next
      console.error('Error with main API endpoint:', mainApiError);
      throw mainApiError;
    }
  } catch (error) {
    console.warn('API recommendation attempt failed:', error.message);
    return getAgentRecommendations(options.limit);
  }
};

/**
 * Get recommendations from agents in the database - uses the same logic as Agents.jsx
 * This provides real agents rather than debug placeholder data
 * 
 * @param {number} limit - Maximum number of recommendations to return
 * @returns {Promise<Array>} - Array of recommended agents
 */
const getAgentRecommendations = async (limit = 3) => {
  console.log('Falling back to direct agent recommendations from database');
  try {
    // First try to get featured agents
    const featuredAgents = await fetchFeaturedAgents(limit);
    if (featuredAgents && featuredAgents.length > 0) {
      console.log('Using featured agents as recommendations:', featuredAgents.length);
      return formatRecommendations(featuredAgents);
    }
    
    // If no featured agents, try top rated
    const topRatedAgents = await fetchAgents('All', 'Top Rated', 1, limit);
    if (topRatedAgents && topRatedAgents.length > 0) {
      console.log('Using top rated agents as recommendations:', topRatedAgents.length);
      return formatRecommendations(topRatedAgents);
    }
    
    // Last resort, get any agents
    const anyAgents = await fetchAgents('All', 'All', 1, limit);
    if (anyAgents && anyAgents.length > 0) {
      console.log('Using any available agents as recommendations:', anyAgents.length);
      return formatRecommendations(anyAgents);
    }
    
    // If all else fails, use local fallback data
    throw new Error('No agents available from database');
  } catch (error) {
    console.error('Failed to get agent recommendations:', error);
    return formatRecommendations(getFallbackRecommendations(limit));
  }
};

/**
 * Fallback function to get recommendations if the API fails
 * Uses mock data based on the existing productData utility
 * 
 * @param {number} limit - Maximum number of recommendations
 * @param {string} excludeProductId - Product ID to exclude
 * @returns {Array} - Array of recommended products
 */
const getFallbackRecommendations = (limit = 3, excludeProductId = null) => {
  console.log('Using local fallback recommendations');
  
  // If we have a product ID to exclude, try to get related products
  let localRecommendations = [];
  if (excludeProductId) {
    localRecommendations = getRelatedProducts(excludeProductId, limit);
  } else {
    // Otherwise get featured products
    localRecommendations = getFeaturedProducts(limit);
  }
  
  // Ensure they all have valid IDs and fix detailUrl and remove any debug recommendations
  return localRecommendations
    .filter(product => !product.title?.includes('Debug Recommendation'))
    .map(product => ({
      ...product,
      // Ensure we're using the correct URL format (/agents/id)
      detailUrl: `/agents/${product.id}`
    }));
};

/**
 * Track a product view to improve future recommendations
 * 
 * @param {string} productId - ID of the product viewed
 * @returns {Promise<void>}
 */
export const trackProductView = async (productId) => {
  try {
    if (!productId) {
      console.warn('Cannot track view: No product ID provided');
      return;
    }
    
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log(`Tracking view for product ${productId} at ${API_URL}/api/recommendations/track-view`);
    
    // Fix the URL to use the correct endpoint
    const response = await fetch(`${API_URL}/api/recommendations/track-view`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId }),
    });
    
    if (!response.ok) {
      console.warn(`Track view API returned ${response.status}. View may not be tracked.`);
      // We don't throw here to avoid disrupting user experience
      return;
    }
    
    console.log(`Product view tracked: ${productId}`);
  } catch (error) {
    // Silently fail tracking to not disrupt user experience
    console.error('Error tracking product view:', error);
  }
};

/**
 * Get recently viewed products for the current user
 * 
 * @param {number} limit - Maximum number of products to return
 * @returns {Promise<Array>} - Array of recently viewed products
 */
export const getRecentlyViewedProducts = async (limit = 5) => {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      console.log('No auth token found for recent views');
      return [];
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    const response = await fetch(`${API_URL}/api/user/recent-views?limit=${limit}`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return formatRecommendations(data.products || []);
  } catch (error) {
    console.error('Error fetching recently viewed products:', error);
    return [];
  }
}; 