/**
 * Profile Caching Utility
 * 
 * This utility provides robust caching for profile data to minimize API calls
 * and improve application performance.
 */

const CACHE_KEY = 'profile_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const LAST_FETCH_KEY = 'profile_last_fetch';
const THROTTLE_DURATION = 5000; // 5 seconds

/**
 * Get profile data from cache
 * @returns {Object|null} The cached profile data or null if not found/expired
 */
export const getProfileFromCache = () => {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (!cachedData) return null;
    
    const { data, timestamp } = JSON.parse(cachedData);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error reading profile cache:', error);
    return null;
  }
};

/**
 * Save profile data to cache
 * @param {Object} profileData - The profile data to cache
 */
export const saveProfileToCache = (profileData) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: profileData,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error saving profile cache:', error);
  }
};

/**
 * Update the last fetch timestamp without updating the cache
 * Used to prevent rapid successive API calls
 */
export const updateLastFetchTime = () => {
  try {
    localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
  } catch (error) {
    console.error('[ProfileCache] Error updating last fetch time:', error);
  }
};

/**
 * Clear the profile cache
 * Should be called when profile is updated
 */
export const clearProfileCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing profile cache:', error);
  }
};

/**
 * Check if we should fetch fresh profile data
 * @param {boolean} forceRefresh - Whether to force a refresh regardless of cache
 * @returns {boolean} Whether we should fetch fresh data
 */
export const shouldFetchProfile = (forceRefresh = false) => {
  if (forceRefresh) {
    console.log('[ProfileCache] Force refresh requested');
    return true;
  }
  
  try {
    // Check throttling
    const lastFetch = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0');
    if (Date.now() - lastFetch < THROTTLE_DURATION) {
      console.log('[ProfileCache] Throttling active, skipping fetch');
      return false;
    }
    
    // Check cache validity
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (!cachedData) return true;
    
    const { timestamp } = JSON.parse(cachedData);
    return (Date.now() - timestamp) >= CACHE_DURATION;
  } catch (error) {
    console.error('[ProfileCache] Error checking if should fetch:', error);
    return true; // Fetch on error to be safe
  }
};

/**
 * Get fallback profile data from cache even if expired
 * Used when API calls fail
 * @returns {Object|null} The cached profile data or null
 */
export const getFallbackProfileFromCache = () => {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (!cachedData) return null;
    
    const { data } = JSON.parse(cachedData);
    console.log('[ProfileCache] Using expired cache as fallback');
    return data;
  } catch (error) {
    console.error('[ProfileCache] Error getting fallback from cache:', error);
    return null;
  }
}; 