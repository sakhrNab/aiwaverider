// src/utils/apiConfig.js

import axios from 'axios';
import { toast as hotToast } from 'react-hot-toast';
import { auth } from '../../utils/firebase';
// Set API base URL from environment variable or default to localhost:4000
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Token cache for performance optimization
let cachedToken = null;
let tokenExpirationTime = null;

// Helper function to safely access agentStore
export const refreshAgentStore = async () => {
  try {
    // Dynamically import to avoid hook usage outside of components
    const { default: agentStore } = await import('../../store/agentStore');
    await agentStore.getState().refreshAfterMutation();
  } catch (error) {
    console.error('Error refreshing agent store:', error);
  }
};

// Function to clear token cache
export const clearTokenCache = () => {
  cachedToken = null;
  tokenExpirationTime = null;
  console.log('[API] Token cache cleared');
};

// Get auth token with caching to reduce Firebase API calls
export const getAuthToken = async () => {
  // Check for cached token that's still valid
  if (cachedToken && tokenExpirationTime && Date.now() < tokenExpirationTime) {
    console.log('[API] Using cached token');
    return cachedToken;
  }

  try {
    // Current user from Firebase
    const user = auth.currentUser;
    if (!user) {
      console.warn('[API] No current user, returning null token');
      return null;
    }

    // Get fresh token
    console.log('[API] Getting fresh token from Firebase');
    const token = await user.getIdToken(true);
    
    // Cache token with 55 minute expiration (just under Firebase's 60 minute limit)
    cachedToken = token;
    tokenExpirationTime = Date.now() + (55 * 60 * 1000);
    
    return token;
  } catch (error) {
    console.error('[API] Error getting auth token:', error);
    return null;
  }
};

// Get auth headers for requests
export const getAuthHeaders = async () => {
  const token = await getAuthToken();
  return token ? {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };
};

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  try {
    // Skip token for public endpoints
    const publicEndpoints = [
      '/api/agents/public',
      '/api/checkout/public'
    ];
    
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      config.url && config.url.startsWith(endpoint)
    );
    
    if (isPublicEndpoint) {
      return config;
    }
    
    // For all other endpoints, add token if available
    const token = await getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  } catch (error) {
    console.error('Request interceptor error:', error);
    return config;
  }
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Default error message
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response) {
      // Server responded with an error status
      const { status, data } = error.response;
      
      // Handle specific status codes
      switch (status) {
        case 401:
          errorMessage = 'Authentication required. Please log in again.';
          // Clear token cache on auth error
          clearTokenCache();
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'The requested resource was not found.';
          break;
        case 429:
          errorMessage = 'Too many requests. Please try again later.';
          break;
        case 500:
          errorMessage = 'Server error. Our team has been notified.';
          break;
        default:
          // Use error message from the server if available
          errorMessage = (data && (data.error || data.message)) || errorMessage;
      }
      
      // Only show toast for non-network errors if the error has a message
      if (errorMessage && errorMessage !== 'Network Error') {
        hotToast.error(errorMessage, {
          duration: 4000,
          style: { maxWidth: '500px' }
        });
      }
    } else if (error.request) {
      // Request was made but no response received (network error)
      errorMessage = 'Unable to connect to server. Please check your internet connection.';
      
      hotToast.error(errorMessage, {
        duration: 4000,
        style: { maxWidth: '500px' }
      });
    }
    
    return Promise.reject(error);
  }
);

// Rate limit handling
let isRateLimited = false;
let rateLimitResetTime = null;
const RATE_LIMIT_BACKOFF = 60000; // 1 minute default backoff

// Add a request interceptor to prevent requests when rate limited
api.interceptors.request.use(
  (config) => {
    // Check if we're currently rate limited
    if (isRateLimited) {
      const now = Date.now();
      
      // If the rate limit hasn't expired yet, reject the request
      if (rateLimitResetTime && now < rateLimitResetTime) {
        const timeRemaining = Math.ceil((rateLimitResetTime - now) / 1000);
        console.warn(`Request blocked due to rate limiting. Try again in ${timeRemaining} seconds.`);
        
        // Create a custom error
        const error = new Error(`Too many requests. Please try again in ${timeRemaining} seconds.`);
        error.isRateLimited = true;
        error.retryAfter = timeRemaining;
        
        // Reject the promise
        return Promise.reject(error);
      } else {
        // Rate limit has expired, clear the flag
        isRateLimited = false;
        rateLimitResetTime = null;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle rate limit responses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Check if this is a rate limit error
    if (error.response && error.response.status === 429) {
      // Set the rate limited flag
      isRateLimited = true;
      
      // Get the retry-after header if it exists
      let retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        retryAfter = parseInt(retryAfter, 10) * 1000; // Convert to milliseconds
      } else {
        // Use default backoff time if no header is present
        retryAfter = RATE_LIMIT_BACKOFF;
      }
      
      // Set the reset time
      rateLimitResetTime = Date.now() + retryAfter;
      
      console.warn(`Rate limited by server. Requests blocked for ${retryAfter / 1000} seconds.`);
      
      // Create a more user-friendly error
      const timeInMinutes = Math.ceil(retryAfter / 60000);
      error.message = `Too many requests, please try again in ${timeInMinutes} minute${timeInMinutes > 1 ? 's' : ''}.`;
      error.isRateLimited = true;
      error.retryAfter = retryAfter / 1000; // in seconds
    }
    
    // Log error response for debugging
    if (error.response) {
      console.error(' API Response Error:', {
        url: error.config?.url,
        status: error.response.status,
        data: error.response.data
      });
    }
    
    return Promise.reject(error);
  }
); 