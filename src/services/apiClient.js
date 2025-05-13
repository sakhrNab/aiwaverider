/**
 * Enhanced API Client for production
 * 
 * Features:
 * - Request timeouts
 * - Automatic retries for transient failures
 * - Comprehensive error handling
 * - Logging integration
 * - Caching for GET requests
 */

import { API } from '../config/config';
import { logError, logInfo } from './logService';

const SERVICE_NAME = 'apiClient';

// Default request options
const defaultOptions = {
  timeout: API.TIMEOUT, // Default timeout from config
  retries: API.RETRY_ATTEMPTS, // Default retry attempts from config
  retryDelay: 1000, // Base delay between retries in ms
  cache: false, // Cache GET requests by default
  tags: [] // Tags for categorizing requests in monitoring
};

/**
 * Creates a promise that rejects after specified timeout
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} - A promise that rejects after timeout
 */
const timeoutPromise = (ms) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
  });
};

/**
 * Handles API response errors
 * @param {Response} response - Fetch API response object
 * @returns {Promise<Object>} - Parsed error response
 */
const handleErrorResponse = async (response) => {
  let errorData = {};
  
  try {
    // Try to parse the error response as JSON
    errorData = await response.json();
  } catch (e) {
    // If parsing fails, create a basic error object
    errorData = {
      status: response.status,
      message: response.statusText || 'Unknown error'
    };
  }
  
  // Create enhanced error object
  const error = new Error(errorData.message || `Request failed with status ${response.status}`);
  error.status = response.status;
  error.statusText = response.statusText;
  error.data = errorData;
  error.isApiError = true;
  
  return Promise.reject(error);
};

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} - True if error is retryable
 */
const isRetryableError = (error) => {
  // Network errors are retryable
  if (!error.status) return true;
  
  // 5xx errors are server errors and may be retryable
  if (error.status >= 500 && error.status < 600) return true;
  
  // 429 Too Many Requests - retryable after a delay
  if (error.status === 429) return true;
  
  // Special case for timeout errors
  if (error.message && error.message.includes('timed out')) return true;
  
  return false;
};

/**
 * Calculate exponential backoff delay
 * @param {number} retryCount - Current retry attempt
 * @param {number} baseDelay - Base delay in ms
 * @returns {number} - Delay in ms with jitter
 */
const getRetryDelay = (retryCount, baseDelay) => {
  // Exponential backoff: 2^retryCount * baseDelay
  const delay = Math.pow(2, retryCount) * baseDelay;
  
  // Add jitter (random value between 0-30% of delay)
  const jitter = delay * 0.3 * Math.random();
  
  return delay + jitter;
};

/**
 * Simple in-memory cache
 */
const cache = {
  data: new Map(),
  
  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached item or null
   */
  get(key) {
    if (!this.data.has(key)) return null;
    
    const item = this.data.get(key);
    if (Date.now() > item.expiry) {
      this.data.delete(key);
      return null;
    }
    
    return item.value;
  },
  
  /**
   * Set item in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = 60000) {
    this.data.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  },
  
  /**
   * Create cache key from URL and options
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {string} - Cache key
   */
  createKey(url, options) {
    return `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || {})}`;
  }
};

/**
 * Enhanced fetch with retries, timeouts and error handling
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - Parsed response
 */
const fetchWithRetry = async (url, options = {}) => {
  const mergedOptions = { ...defaultOptions, ...options };
  const {
    timeout,
    retries,
    retryDelay,
    cache: useCache,
    tags,
    ...fetchOptions
  } = mergedOptions;
  
  // Add default headers
  fetchOptions.headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers
  };
  
  // Ensure method is set
  fetchOptions.method = fetchOptions.method || 'GET';
  
  // Check cache for GET requests if caching is enabled
  const cacheKey = cache.createKey(url, fetchOptions);
  if (useCache && fetchOptions.method === 'GET') {
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      logInfo('Cache hit', { url, method: fetchOptions.method }, SERVICE_NAME);
      return cachedResponse;
    }
  }
  
  // Log request start
  logInfo('API request', { 
    url, 
    method: fetchOptions.method,
    tags 
  }, SERVICE_NAME);
  
  let lastError = null;
  
  // Retry loop
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create a promise race between fetch and timeout
      const response = await Promise.race([
        fetch(url, fetchOptions),
        timeoutPromise(timeout)
      ]);
      
      // Handle error responses
      if (!response.ok) {
        throw await handleErrorResponse(response);
      }
      
      // Parse JSON response
      const data = await response.json();
      
      // Cache successful GET requests if caching is enabled
      if (useCache && fetchOptions.method === 'GET') {
        cache.set(cacheKey, data);
      }
      
      // Log success
      logInfo('API request successful', { 
        url, 
        method: fetchOptions.method,
        status: response.status,
        tags
      }, SERVICE_NAME);
      
      return data;
    } catch (error) {
      lastError = error;
      
      // Log each retry attempt
      logError(error, { 
        url, 
        method: fetchOptions.method, 
        attempt: attempt + 1,
        maxRetries: retries,
        tags
      }, SERVICE_NAME);
      
      // Check if error is retryable and we have attempts left
      if (isRetryableError(error) && attempt < retries) {
        // Calculate delay with exponential backoff
        const delay = getRetryDelay(attempt, retryDelay);
        
        // Log retry info
        logInfo('Retrying request', { 
          url, 
          method: fetchOptions.method,
          attempt: attempt + 1, 
          delay,
          tags
        }, SERVICE_NAME);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Continue to next retry attempt
        continue;
      }
      
      // Throw the last error if we exhausted retries or error is not retryable
      throw lastError;
    }
  }
};

/**
 * Make a GET request
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - Parsed response
 */
export const get = (url, options = {}) => {
  return fetchWithRetry(url, { ...options, cache: true, method: 'GET' });
};

/**
 * Make a POST request
 * @param {string} url - Request URL
 * @param {Object} data - Request body data
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - Parsed response
 */
export const post = (url, data, options = {}) => {
  return fetchWithRetry(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  });
};

/**
 * Make a PUT request
 * @param {string} url - Request URL
 * @param {Object} data - Request body data
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - Parsed response
 */
export const put = (url, data, options = {}) => {
  return fetchWithRetry(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

/**
 * Make a DELETE request
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - Parsed response
 */
export const del = (url, options = {}) => {
  return fetchWithRetry(url, {
    ...options,
    method: 'DELETE'
  });
};

/**
 * Make a PATCH request
 * @param {string} url - Request URL
 * @param {Object} data - Request body data
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - Parsed response
 */
export const patch = (url, data, options = {}) => {
  return fetchWithRetry(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data)
  });
};

/**
 * Check if API is reachable
 * @returns {Promise<Object>} - Status object {ok: boolean, message: string}
 */
export const checkApiConnectivity = async () => {
  try {
    // Use a short timeout for the health check
    const response = await fetchWithRetry(`${API.URL}/api/health`, {
      timeout: 5000,
      retries: 1,
      tags: ['health-check']
    });
    
    return {
      ok: true,
      message: response.message || 'API is reachable'
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || 'Could not reach API',
      status: error.status
    };
  }
};

// Export API object that contains all methods
export const api = {
  get,
  post,
  put,
  delete: del,
  patch,
  checkApiConnectivity
};

// Default export
export default api; 