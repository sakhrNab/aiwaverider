import { api, API_URL } from '../core/apiConfig';
import { auth } from '../../utils/firebase';

// Add token caching
let cachedToken = null;
let tokenExpirationTime = null;
// Add a request cache
const requestCache = new Map();
const pendingRequests = new Map();
// Cache expiration time - 5 minutes (in milliseconds)
const CACHE_EXPIRY = 5 * 60 * 1000;
// Function to get token with caching
const getTokenWithCache = async (currentUser) => {
  console.log('getTokenWithCache called');
  const now = Date.now();
  
  // If we have a cached token that's not expired and not close to expiring, use it
  if (cachedToken && tokenExpirationTime && now < tokenExpirationTime - (5 * 60 * 1000)) {
    console.log('Using cached token, expires in:', Math.round((tokenExpirationTime - now) / 1000), 'seconds');
    return cachedToken;
  }

  try {
    console.log('Getting fresh token, old token expires in:', tokenExpirationTime ? Math.round((tokenExpirationTime - now) / 1000) : 'N/A', 'seconds');
    // Force refresh the token
    const token = await currentUser.getIdToken(true);
    
    // Cache the token and set expiration (5 minutes before actual expiration)
    cachedToken = token;
    // Firebase tokens expire in 1 hour, we'll refresh 5 minutes before
    tokenExpirationTime = now + (55 * 60 * 1000);
    
    console.log('New token obtained and cached, expires in:', Math.round((tokenExpirationTime - now) / 1000), 'seconds');
    return token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    console.error('Error stack:', error.stack);
    // Clear the cache on error
    cachedToken = null;
    tokenExpirationTime = null;
    throw error;
  }
};

// Helper function to get auth headers (if needed explicitly)
export const getAuthHeaders = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {};
  }
  const token = await getTokenWithCache(currentUser);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Get all agents
export const getAllAgents = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Apply filters if provided
    if (filters.category) {
      queryParams.append('category', filters.category);
    }
    if (filters.type) {
      queryParams.append('type', filters.type);
    }
    if (filters.featured) {
      queryParams.append('featured', 'true');
    }
    if (filters.limit) {
      queryParams.append('limit', filters.limit.toString());
    }
    if (filters.sortBy) {
      queryParams.append('sortBy', filters.sortBy);
    }
    
    const queryString = queryParams.toString();
    const url = `/api/agents${queryString ? `?${queryString}` : ''}`;
    
    console.log(`[API] Getting agents with filters:`, filters);
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching agents:', error);
    throw error;
  }
};

// Get public agents (no authentication required)
export const getPublicAgents = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Apply filters if provided
    if (filters.category) {
      queryParams.append('category', filters.category);
    }
    if (filters.featured) {
      queryParams.append('featured', 'true');
    }
    if (filters.limit) {
      queryParams.append('limit', filters.limit.toString());
    }
    
    const queryString = queryParams.toString();
    const url = `/api/agents/public${queryString ? `?${queryString}` : ''}`;
    
    console.log(`[API] Getting public agents with filters:`, filters);
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching public agents:', error);
    throw error;
  }
};

// Get agent by ID
export const getAgentById = async (agentId) => {
  try {
    const response = await api.get(`/api/agents/${agentId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching agent ${agentId}:`, error);
    throw error;
  }
};

// Create a new agent
export const createAgent = async (agentData) => {
  try {
    console.log('[API] Creating new agent:', agentData);
    const response = await api.post('/api/agents', agentData);
    return response.data;
  } catch (error) {
    console.error('Error creating agent:', error);
    throw error;
  }
};

// Update an agent
export const updateAgent = async (agentId, agentData) => {
  try {
    console.log(`[API] Updating agent ${agentId}:`, agentData);
    const response = await api.put(`/api/agents/${agentId}`, agentData);
    return response.data;
  } catch (error) {
    console.error(`Error updating agent ${agentId}:`, error);
    throw error;
  }
};

// Delete an agent
export const deleteAgent = async (agentId) => {
  try {
    console.log(`[API] Deleting agent ${agentId}`);
    const response = await api.delete(`/api/agents/${agentId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting agent ${agentId}:`, error);
    throw error;
  }
};

// Get agent reviews
export const getAgentReviews = async (agentId) => {
  try {
    const response = await api.get(`/api/agents/${agentId}/reviews`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching reviews for agent ${agentId}:`, error);
    throw error;
  }
};

// Add a review for an agent
export const addAgentReview = async (agentId, reviewData) => {
  try {
    console.log(`[API] Adding review for agent ${agentId}:`, reviewData);
    const response = await api.post(`/api/agents/${agentId}/reviews`, reviewData);
    return response.data;
  } catch (error) {
    console.error(`Error adding review for agent ${agentId}:`, error);
    throw error;
  }
};

// Get agent categories
export const getAgentCategories = async () => {
  try {
    const response = await api.get('/api/agents/categories');
    return response.data;
  } catch (error) {
    console.error('Error fetching agent categories:', error);
    throw error;
  }
};

// Subscribe to an agent
export const subscribeToAgent = async (agentId, planId) => {
  try {
    console.log(`[API] Subscribing to agent ${agentId} with plan ${planId}`);
    const response = await api.post(`/api/agents/${agentId}/subscribe`, { planId });
    return response.data;
  } catch (error) {
    console.error(`Error subscribing to agent ${agentId}:`, error);
    throw error;
  }
};

// Update agent price
export const updateAgentPrice = async (agentId, priceData) => {
  try {
    console.log(`[API] Updating price for agent ${agentId}:`, priceData);
    const response = await api.put(`/api/agents/${agentId}/price`, priceData);
    return response.data;
  } catch (error) {
    console.error(`Error updating price for agent ${agentId}:`, error);
    throw error;
  }
};

// Get featured agents
export const getFeaturedAgents = async (limit = 6) => {
  try {
    const response = await api.get(`/api/agents/featured?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching featured agents:', error);
    return []; // Return empty array as fallback
  }
};

// Get top-rated agents
export const getTopRatedAgents = async (limit = 6) => {
  try {
    const response = await api.get(`/api/agents/top-rated?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching top-rated agents:', error);
    return []; // Return empty array as fallback
  }
};

// Get newest agents
export const getNewestAgents = async (limit = 6) => {
  try {
    const response = await api.get(`/api/agents/newest?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching newest agents:', error);
    return []; // Return empty array as fallback
  }
};

// Search for agents
export const searchAgents = async (query, filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add search query
    queryParams.append('q', query);
    
    // Apply filters if provided
    if (filters.category) {
      queryParams.append('category', filters.category);
    }
    if (filters.minRating) {
      queryParams.append('minRating', filters.minRating.toString());
    }
    if (filters.maxPrice) {
      queryParams.append('maxPrice', filters.maxPrice.toString());
    }
    if (filters.sortBy) {
      queryParams.append('sortBy', filters.sortBy);
    }
    
    const queryString = queryParams.toString();
    const url = `/api/agents/search${queryString ? `?${queryString}` : ''}`;
    
    console.log(`[API] Searching agents with query "${query}" and filters:`, filters);
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error searching agents:', error);
    throw error;
  }
};

/**
 * Fetch agents from the API with caching and request deduplication
 */
export const fetchAgents = async (
  category = 'All',
  filter = 'Hot & Now',
  page = 1,
  options = {}
) => {
  try {
    // Extract options or use defaults
    const {
      limit = 20,
      priceRange = { min: 0, max: 1000 },
      rating = 0,
      tags = [],
      features = [],
      search = '',
      timestamp = Date.now(), // Add timestamp for cache busting
      bypassCache = false
    } = options;
    
    // Create query params for API
    const params = new URLSearchParams();
    params.append('category', category);
    params.append('filter', filter);
    params.append('page', page);
    params.append('limit', limit);
    
    // Add filter params
    if (priceRange?.min > 0) params.append('priceMin', priceRange.min);
    if (priceRange?.max < 1000) params.append('priceMax', priceRange.max);
    if (rating > 0) params.append('rating', rating);
    
    // Join arrays for API consumption
    if (tags && tags.length > 0) params.append('tags', tags.join(','));
    if (features && features.length > 0) params.append('features', features.join(','));
    if (search) params.append('search', search);
    
    // Add timestamp for cache busting only if bypassCache is true
    if (bypassCache) {
      params.append('_t', timestamp);
    }
    
    // Create a cache key from the params
    const cacheKey = createCacheKey(params);
    
    // Check if we already have a cached response that's not expired
    if (!bypassCache && requestCache.has(cacheKey)) {
      const { data, expiry } = requestCache.get(cacheKey);
      if (expiry > Date.now()) {
        console.log('Using cached agents data:', data.length, 'agents');
        return data;
      } else {
        // Remove expired cache entry
        requestCache.delete(cacheKey);
      }
    }
    
    // Check if there's already a request in flight for this exact query
    if (pendingRequests.has(cacheKey)) {
      console.log('Request already in flight, waiting for existing request to complete');
      return pendingRequests.get(cacheKey);
    }
    
    // Create the promise for this request
    console.log(`Fetching agents from API with params: ${params.toString()}`);
    
    // Create promise for the API request
    const requestPromise = (async () => {
      // Fetch from backend API
      const response = await api.get(`/api/agents?${params.toString()}`);
      console.log('Successfully fetched agents from API:', response.data.agents.length);
      
      // Validate agents to ensure they exist and have valid IDs
      // This removes any potentially corrupted data that could cause errors
      const validAgents = response.data.agents.filter(agent => {
        return agent && agent.id && typeof agent.id === 'string';
      });
      
      if (validAgents.length !== response.data.agents.length) {
        console.warn(`Filtered out ${response.data.agents.length - validAgents.length} invalid agents from results`);
      }
      
      // Cache the valid response data
      requestCache.set(cacheKey, {
        data: validAgents,
        expiry: Date.now() + CACHE_EXPIRY
      });
      
      // Remove from pending requests
      pendingRequests.delete(cacheKey);
      
      return validAgents;
    })();
    
    // Store the promise in pending requests map
    pendingRequests.set(cacheKey, requestPromise);
    
    // Return the promise
    return requestPromise;
  } catch (error) {
    console.error('Error fetching agents from API:', error);
    // Return empty array on error
    return [];
  }
};


/**
 * Fetch featured agents with options
 * @param {number} limit - Maximum number of agents to return
 * @param {Object} options - Additional options like forceRefresh
 * @returns {Promise<Array>} - Array of featured agents
 */
export const fetchFeaturedAgents = async (limit = 6, options = {}) => {
  try {
    const { forceRefresh = false } = options;
    
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    
    if (forceRefresh) {
      queryParams.append('refresh', 'true');
    }
    
    const url = `/api/agents/featured?${queryParams.toString()}`;
    console.log(`[API] Fetching featured agents with limit ${limit}`);
    
    const response = await api.get(url);
    return response.data?.agents || [];
  } catch (error) {
    console.error('Error fetching featured agents:', error);
    return [];
  }
};

/**
 * Fetch user wishlists
 * @returns {Promise<Array>} - Array of user wishlists
 */
export const fetchWishlists = async () => {
  try {
    console.log(`[API] Fetching user wishlists`);
    const response = await api.get('/api/user/wishlists');
    return response.data?.wishlists || [];
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    return [];
  }
};

/**
 * Toggle like for an agent
 * @param {string} agentId - The ID of the agent to toggle like for
 * @returns {Promise<Object>} Response object
 */
export const toggleAgentLike = async (agentId) => {
  try {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }

    // Optimistic UI update - store action in pending queue if offline
    const pendingKey = `pending_likes`;
    let pendingLikes = [];
    try {
      const pendingData = localStorage.getItem(pendingKey);
      if (pendingData) {
        pendingLikes = JSON.parse(pendingData);
      }
    } catch (e) {
      console.warn('Error reading pending likes', e);
    }

    // Attempt API call with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${API_URL}/api/agents/${agentId}/toggle-like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (fetchError) {
      clearTimeout(timeoutId);

      console.warn('Error toggling like, storing action for later sync:', fetchError);
      
      // Store action for later sync
      const isAlreadyPending = pendingLikes.some(item => item.agentId === agentId);
      
      if (!isAlreadyPending) {
        pendingLikes.push({
          agentId,
          action: 'toggle-like',
          timestamp: Date.now()
        });
        
        try {
          localStorage.setItem(pendingKey, JSON.stringify(pendingLikes));
        } catch (storageError) {
          console.warn('Failed to store pending like action:', storageError);
        }
      }
      
      // Provide offline feedback - optimistically toggle
      return { 
        success: true, 
        offline: true,
        liked: true, // optimistic assumption
        likesCount: -1 // indicates we don't know the actual count
      };
    }
  } catch (error) {
    console.error('Error in toggleAgentLike:', error);
    return { success: false, error: error.message };
  }
};


// Add agent to wishlist
export const addToWishlist = async (agentId) => {
  try {
    // We're now using the toggle endpoint for both adding and removing
    const response = await api.post('/api/wishlists/toggle', { agentId });
    return response.data;
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    throw error;
  }
};

// Remove agent from wishlist
export const removeFromWishlist = async (agentId) => {
  try {
    // We're now using the toggle endpoint for both adding and removing
    const response = await api.post('/api/wishlists/toggle', { agentId });
    return response.data;
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    throw error;
  }
};

// /**
//  * Toggle wishlist status for an agent (add or remove)
//  * @param {string} agentId - ID of the agent to toggle wishlist status for
//  * @returns {Promise<Object>} - Response with success status and updated wishlist information
//  */
export const toggleWishlist = async (agentId) => {
  try {
    const response = await api.post('/api/wishlists/toggle', { agentId });
    return response.data;
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    throw error;
  }
};

/**
 * Check if a user can review an agent
 * @param {string} agentId - ID of the agent to check review eligibility for
 * @returns {Promise<Object>} - Response with eligibility status and reason
 */
export const checkCanReviewAgent = async (agentId) => {
  try {
    console.log(`[API] Checking if user can review agent ${agentId}`);
    const response = await api.get(`/api/agents/${agentId}/can-review`);
    return response.data;
  } catch (error) {
    console.error(`Error checking review eligibility for agent ${agentId}:`, error);
    return {
      canReview: false,
      reason: error.message || 'Error checking eligibility'
    };
  }
};

/**
 * Check if the backend API is accessible
 * @returns {Promise<{isOnline: boolean, status: number, message: string}>} Status of the API
 */
export const checkApiStatus = async () => {
  try {
    console.log(`Checking API status at ${API_URL}/api/health`);
    
    // Make a simple GET request to the status endpoint
    const response = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`API status response: ${response.status}`);
    
    if (response.ok) {
      return {
        isOnline: true,
        status: response.status,
        message: 'API is online and working correctly'
      };
    }
    
    // If not OK, try to get more details
    let message = `API returned status ${response.status}`;
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch (e) {
      // Not JSON or couldn't parse
    }
    
    return {
      isOnline: false,
      status: response.status,
      message
    };
  } catch (error) {
    console.error('Error checking API status:', error);
    return {
      isOnline: false,
      status: 0,
      message: `API is unreachable: ${error.message}`
    };
  }
};

/**
 * Delete a post by ID
 * @param {string} postId - ID of the post to delete
 * @param {string} token - Authentication token (optional)
 * @returns {Promise<Object>} - Response with success status
 */
export const deletePost = async (postId, token) => {
  try {
    console.log(`[API] Deleting post ${postId}`);
    
    // Set up headers with authentication if token is provided
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await api.delete(`/api/posts/${postId}`, { headers });
    return {
      success: true,
      message: 'Post deleted successfully',
      ...response.data
    };
  } catch (error) {
    console.error(`Error deleting post ${postId}:`, error);
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred while deleting the post.' 
    };
  }
};

/**
 * Fetch detailed agent information by ID with options
 * @param {string} agentId - ID of the agent to fetch
 * @param {Object} options - Additional options like includeReviews, includePrice, etc.
 * @returns {Promise<Object>} - Agent data with requested details
 */
export const fetchAgentById = async (agentId, options = {}) => {
  try {
    const {
      includeReviews = false,
      includePrice = true,
      includeStats = true,
      forceRefresh = false
    } = options;

    const queryParams = new URLSearchParams();
    
    if (includeReviews) {
      queryParams.append('includeReviews', 'true');
    }
    
    if (includePrice) {
      queryParams.append('includePrice', 'true');
    }
    
    if (includeStats) {
      queryParams.append('includeStats', 'true');
    }
    
    if (forceRefresh) {
      queryParams.append('refresh', 'true');
    }
    
    const url = `/api/agents/${agentId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    console.log(`[API] Fetching agent by ID ${agentId} with options:`, options);
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching agent ${agentId}:`, error);
    throw error;
  }
};

/**
 * Check if the current user has liked a specific agent
 * @param {string} agentId - The ID of the agent to check
 * @returns {Promise<Object>} Object with liked status and likes count
 */
export const getUserLikeStatus = async (agentId) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        return { liked: false, likesCount: 0 };
      }
  
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/agents/${agentId}/user-like-status`, {
        method: 'GET',
        headers
      });
  
      if (!response.ok) {
        throw new Error(`Error fetching like status: ${response.statusText}`);
      }
  
      const data = await response.json();
      return {
        liked: data.liked || false,
        likesCount: data.likesCount || 0
      };
    } catch (error) {
      console.error("Error checking agent like status:", error);
      // Return default values on error
      return { liked: false, likesCount: 0 };
    }
  };
  
/**
 * Download a free agent
 * @param {string} agentId - ID of the agent to download
 * @returns {Promise<Object>} - Response with download URL and information
 */
export const downloadFreeAgent = async (agentId) => {
  try {
    console.log(`[API] Downloading free agent ${agentId}`);
    const response = await api.post(`/api/agents/${agentId}/download`);
    
    // Increment download count in the background
    incrementAgentDownloadCount(agentId).catch(err => 
      console.error(`Failed to increment download count for ${agentId}:`, err)
    );
    
    // Record download in user history
    recordAgentDownload(agentId).catch(err => 
      console.error(`Failed to record download for ${agentId}:`, err)
    );
    
    return {
      success: true,
      downloadUrl: response.data?.downloadUrl,
      ...response.data
    };
  } catch (error) {
    console.error(`Error downloading agent ${agentId}:`, error);
    return {
      success: false,
      error: error.message || 'Failed to download agent'
    };
  }
};

/**
 * Increment the download count for an agent
 * @param {string} agentId - ID of the agent to increment download count for
 * @returns {Promise<Object>} - Response with updated download count
 */
export const incrementAgentDownloadCount = async (agentId) => {
  try {
    console.log(`[API] Incrementing download count for agent ${agentId}`);
    const response = await api.post(`/api/agents/${agentId}/increment-downloads`);
    return {
      success: true,
      downloadCount: response.data?.downloadCount,
      ...response.data
    };
  } catch (error) {
    console.error(`Error incrementing download count for agent ${agentId}:`, error);
    return {
      success: false,
      error: error.message || 'Failed to increment download count'
    };
  }
};

/**
 * Record that user has downloaded an agent
 * @param {string} agentId - The ID of the agent
 * @returns {Promise<Object>} - The response indicating success/failure
 */
export const recordAgentDownload = async (agentId) => {
    try {
      // First increment the download count
      await incrementAgentDownloadCount(agentId);
      
      // Then record the download in user's history if authenticated
      const user = auth.currentUser;
      if (user) {
        try {
          const token = await user.getIdToken();
          
          const response = await fetch(`${API_URL}/api/agents/${agentId}/download`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            return await response.json();
          }
        } catch (apiError) {
          // Silently continue if API fails
          console.warn('Could not record download in user history:', apiError.message);
        }
      }
      
      return { success: true, message: 'Download count updated' };
    } catch (error) {
      console.error('Error in recordAgentDownload:', error);
      // Still return success to not interrupt the download flow for the user
      return { success: true, message: 'Download processed' };
    }
  };
  
  // Add this helper function before the fetchAgents export
const createCacheKey = (params) => {
  return params.toString();
};