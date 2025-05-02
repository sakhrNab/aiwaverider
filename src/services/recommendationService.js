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

// ======= SHARED UTILITY FUNCTIONS =======

/**
 * Generates a placeholder image when real images fail to load
 * 
 * @param {string} text - Text to display in the placeholder
 * @returns {string} - Data URI for the placeholder image
 */
export const getPlaceholderImage = (text = 'Product') => {
  // Generate a random color from a palette of blues and purples
  const colors = ['4a4de7', '3498db', '9b59b6', '2980b9', '8e44ad', '2c3e50', '7a75b1'];
  const bgColor = colors[Math.floor(Math.random() * colors.length)];
  
  // Create SVG with the product title embedded
  // Ensure any special characters like & are properly encoded
  const displayText = text.length > 15 ? text.substring(0, 15) + '...' : text;
  const encodedText = displayText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23${bgColor}'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='20' text-anchor='middle' dominant-baseline='middle' fill='%23ffffff'%3E${encodedText}%3C/text%3E%3C/svg%3E`;
};

/**
 * Creates an image error handler that sets a placeholder image
 * 
 * @param {string} fallbackText - Text to display in the placeholder
 * @returns {Function} - Error handler function for img elements
 */
export const createImageErrorHandler = (fallbackText) => (e) => {
  // Check if we've already tried to handle this error to prevent infinite loops
  if (e.target.dataset.errorHandled === 'true') {
    console.warn('Preventing infinite error loop for image:', e.target.alt || fallbackText);
    return;
  }
  
  console.log('Image loading error:', e.target.src);
  
  // Mark the image as having been handled
  e.target.dataset.errorHandled = 'true';
  
  // Get the product title from the alt text or use the provided fallback
  const productTitle = e.target.alt || fallbackText || 'Product';
  
  // Set the new source and clear the original error handler
  e.target.src = getPlaceholderImage(productTitle);
  e.target.onerror = null;
};

/**
 * Gets the appropriate image URL for a product with fallback logic
 * 
 * @param {Object} product - The product/agent data
 * @returns {string} - URL for the product image
 */
export const getProductImageUrl = (product) => {
  // Create a product title for use in placeholder
  const productTitle = product?.title || product?.name || 'Product';
  
  // First try local images from the assets directory
  if (product?.id) {
    try {
      // Try to use a local image based on the product ID
      return `/assets/agents/${product.id}.jpg`;
    } catch (e) {
      // Will fall through to next option
    }
  }
  
  // Check for direct imageUrl property
  if (product?.imageUrl) {
    return product.imageUrl;
  }
  
  // Check if image info exists in a nested structure
  if (product?.image) {
    if (typeof product.image === 'string') {
      return product.image;
    }
    if (product.image?.url) {
      return product.image.url;
    }
  }
  
  // Try to parse the data field if it's a string
  if (product?.data && typeof product.data === 'string') {
    try {
      const parsedData = JSON.parse(product.data);
      if (parsedData.imageUrl) {
        return parsedData.imageUrl;
      }
    } catch (e) {
      console.warn("Error parsing product.data:", e);
    }
  } else if (product?.data && typeof product.data === 'object') {
    if (product.data.imageUrl) {
      return product.data.imageUrl;
    }
  }
  
  // Return a data URI placeholder as last resort
  return getPlaceholderImage(productTitle);
};

/**
 * Format a rating to display with 1 decimal place
 * 
 * @param {number|Object} rating - Rating value or object with average property
 * @returns {string} - Formatted rating string
 */
export const formatRating = (rating) => {
  if (!rating) return "0.0";
  
  if (typeof rating === 'number') {
    return rating.toFixed(1);
  }
  
  if (rating.average) {
    return parseFloat(rating.average).toFixed(1);
  }
  
  return rating.toString();
};

/**
 * Format a price with proper currency
 * 
 * @param {number|string} price - The price value
 * @param {string} currency - The currency code (USD, EUR, etc.)
 * @returns {string} - Formatted price string
 */
export const formatPrice = (price, currency = 'USD') => {
  // Handle free products
  if (price === 0 || price === '0' || price === 'Free' || price === '$0') {
    return 'Free';
  }
  
  // Handle unavailable prices
  if (price === null || price === undefined) {
    return 'Price unavailable';
  }
  
  // Format numeric prices
  if (typeof price === 'number') {
    return `${currency} ${price.toFixed(2)}`;
  }
  
  // If it's already a string and doesn't have currency, add it
  if (typeof price === 'string' && !price.includes(currency)) {
    if (price.match(/^\d+(\.\d+)?$/)) {
      return `${currency} ${parseFloat(price).toFixed(2)}`;
    }
    return `${currency} ${price}`;
  }
  
  // Return as is if none of the above
  return price;
};

/**
 * Fetch recommendations for a product page.
 * This function has smart caching to prevent redundant API calls.
 * 
 * @param {Object} options - Configuration options
 * @param {Array} options.purchasedItems - Items that were purchased (to exclude)
 * @param {string} options.category - Product category to get recommendations for
 * @param {number} options.limit - Maximum number of recommendations to return
 * @returns {Promise<Array>} - Array of recommendation products
 */
export const getRecommendationsForPurchase = async (options = {}) => {
  try {
    const { 
      purchasedItems = [], 
      category = 'All', 
      limit = 3 
    } = options;
    
    console.log('Fetching recommendations for purchase with options:', options);
    
    // Try to get from cache first
    const cacheKey = 'recent_purchase_recommendations';
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        // Check if cache is fresh (less than 10 minutes old)
        if (parsedData.timestamp && (Date.now() - parsedData.timestamp) < 10 * 60 * 1000) {
          console.log('Using cached recommendations from session storage');
          return parsedData.recommendations;
        }
      } catch (e) {
        console.warn('Error parsing cached recommendations:', e);
      }
    }
    
    // Extract categories from purchased items and find the most common one
    const categories = purchasedItems
      .filter(item => item && item.category)
      .map(item => item.category);
    
    // If no categories found, use provided category or 'All' as default
    const targetCategory = categories.length > 0 ? 
      // Get most frequent category
      categories.sort((a, b) => 
        categories.filter(c => c === a).length - categories.filter(c => c === b).length
      ).pop() : 
      category;
    
    console.log('Fetching recommendations for category:', targetCategory);
    
    // Analyze purchased items for attributes to determine recommendation strategy
    const purchasedAttributes = {
      isBestseller: false,
      isNew: false,
      isFeatured: false,
      isTrending: false,
      priceTier: 'medium', // default price tier
      highestRating: 0
    };
    
    // Count items with each attribute
    purchasedItems.forEach(item => {
      if (!item) return;
      
      if (item.isBestseller) purchasedAttributes.isBestseller = true;
      if (item.isNew) purchasedAttributes.isNew = true;
      if (item.isFeatured) purchasedAttributes.isFeatured = true;
      if (item.isTrending) purchasedAttributes.isTrending = true;
      
      // Track highest rating
      const rating = typeof item.rating === 'number' ? 
        item.rating : 
        (item.rating?.average || 0);
      
      purchasedAttributes.highestRating = Math.max(purchasedAttributes.highestRating, rating);
      
      // Determine price tier
      const price = typeof item.price === 'number' ? item.price : 0;
      if (price > 50) purchasedAttributes.priceTier = 'high';
      else if (price < 10) purchasedAttributes.priceTier = 'low';
    });
    
    console.log('Analyzed purchased attributes:', purchasedAttributes);
    
    // Determine the best sort strategy based on purchased attributes
    let sortBy = 'Top Rated'; // default sort
    
    if (purchasedAttributes.isBestseller) {
      sortBy = 'Best Sellers';
    } else if (purchasedAttributes.isNew || purchasedAttributes.isTrending) {
      sortBy = 'Hot & New';
    } else if (purchasedAttributes.highestRating >= 4.5) {
      sortBy = 'Top Rated';
    } else if (purchasedAttributes.isFeatured) {
      sortBy = 'Featured';
    }
    
    console.log(`Using sort strategy: ${sortBy} for recommendations`);
    
    // Add cache busting to ensure fresh data
    const timestamp = new Date().getTime();
    const agentsData = await fetchAgents(targetCategory, sortBy, 1, { timestamp, limit: limit + 5 }); // Fetch extra to account for filtering
    
    if (!agentsData || agentsData.length === 0) {
      throw new Error('No recommendations found for category');
    }
    
    // Filter out any items that were just purchased
    const purchasedIds = new Set(purchasedItems
      .filter(item => item && item.id)
      .map(item => item.id));
    
    let filteredAgents = agentsData.filter(agent => 
      agent && agent.id && !purchasedIds.has(agent.id)
    );
    
    // Apply additional attribute-based filtering for better personalization
    
    // If user bought bestsellers, prioritize other bestsellers
    if (purchasedAttributes.isBestseller) {
      const bestsellers = filteredAgents.filter(agent => agent.isBestseller);
      if (bestsellers.length >= limit) {
        filteredAgents = bestsellers;
      }
    }
    
    // If user bought new items, prioritize other new items
    else if (purchasedAttributes.isNew) {
      const newItems = filteredAgents.filter(agent => agent.isNew);
      if (newItems.length >= limit) {
        filteredAgents = newItems;
      }
    }
    
    // If we don't have enough recommendations, fetch additional ones
    if (filteredAgents.length < limit) {
      console.log('Not enough recommendations, fetching more with different criteria');
      
      // Try a different sort strategy
      const backupSortBy = sortBy === 'Best Sellers' ? 'Hot & New' : 'Best Sellers';
      
      // Fetch some additional agents from all categories
      const additionalAgents = await fetchAgents('All', backupSortBy, 1, { 
        timestamp,
        limit: limit - filteredAgents.length + 3 // Add a few extra for filtering
      });
      
      // Combine and ensure no duplicates
      const existingIds = new Set(filteredAgents.map(a => a.id));
      const additionalFiltered = additionalAgents.filter(agent => 
        agent && agent.id && !existingIds.has(agent.id) && !purchasedIds.has(agent.id)
      );
      
      filteredAgents = [...filteredAgents, ...additionalFiltered];
    }
    
    // Sort recommendations by relevance
    filteredAgents.sort((a, b) => {
      // Give priority points based on matching attributes with purchased items
      let aPoints = 0;
      let bPoints = 0;
      
      // Bestseller status matching
      if (a.isBestseller === purchasedAttributes.isBestseller) aPoints += 2;
      if (b.isBestseller === purchasedAttributes.isBestseller) bPoints += 2;
      
      // New status matching
      if (a.isNew === purchasedAttributes.isNew) aPoints += 2;
      if (b.isNew === purchasedAttributes.isNew) bPoints += 2;
      
      // Featured status matching
      if (a.isFeatured === purchasedAttributes.isFeatured) aPoints += 1;
      if (b.isFeatured === purchasedAttributes.isFeatured) bPoints += 1;
      
      // Price tier matching (rough estimation)
      const aPrice = typeof a.price === 'number' ? a.price : 0;
      const bPrice = typeof b.price === 'number' ? b.price : 0;
      
      let aPriceTier = 'medium';
      if (aPrice > 50) aPriceTier = 'high';
      else if (aPrice < 10) aPriceTier = 'low';
      
      let bPriceTier = 'medium';
      if (bPrice > 50) bPriceTier = 'high';
      else if (bPrice < 10) bPriceTier = 'low';
      
      if (aPriceTier === purchasedAttributes.priceTier) aPoints += 1;
      if (bPriceTier === purchasedAttributes.priceTier) bPoints += 1;
      
      // Category matching is most important
      if (a.category === targetCategory) aPoints += 3;
      if (b.category === targetCategory) bPoints += 3;
      
      return bPoints - aPoints; // Higher points first
    });
    
    // Get the requested number of recommendations
    const recommendations = filteredAgents.slice(0, limit);
    
    // Cache the results to avoid redundant API calls
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        recommendations,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Failed to cache recommendations:', e);
    }
    
    return recommendations;
  } catch (err) {
    console.error('Error fetching recommendations:', err);
    
    // Try to use a fallback method if the primary API fails
    try {
      const fallbackAgents = await fetchAgents('All', 'Top Rated', 1, { limit: options.limit });
      if (fallbackAgents && fallbackAgents.length > 0) {
        return fallbackAgents.slice(0, options.limit);
      }
    } catch (fallbackErr) {
      console.error('Fallback recommendation fetch failed:', fallbackErr);
    }
    
    return [];
  }
}; 