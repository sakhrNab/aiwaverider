import { fetchAITools, fetchAIToolById, createAITool, updateAITool as apiUpdateAITool, deleteAITool as apiDeleteAITool } from '../utils/api';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_KEY = 'ai_tools_cache';
const CACHE_TIMESTAMP_KEY = 'ai_tools_cache_timestamp';

/**
 * Get all AI tools with caching
 */
export const getAllAITools = async (forceRefresh = false) => {
  try {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedData = getCachedTools();
      if (cachedData) {
        console.log('[AIToolsService] Using cached AI tools data');
        return cachedData;
      }
    }

    // If no cache or refresh forced, fetch from API
    console.log('[AIToolsService] Fetching fresh AI tools data');
    const tools = await fetchAITools();

    // Cache the results
    cacheTools(tools);
    
    return tools;
  } catch (error) {
    console.error('[AIToolsService] Error fetching AI tools:', error);
    
    // For errors, try getting from cache
    const cachedData = getCachedTools();
    if (cachedData) {
      console.log('[AIToolsService] Error occurred, using cached data');
      return cachedData;
    }
    
    // If no cache, return empty array
    console.log('[AIToolsService] No cache available, returning empty array');
    return [];
  }
};

/**
 * Get a single AI tool by ID
 */
export const getAIToolById = async (id) => {
  try {
    // Check cache first
    const cachedTools = getCachedTools();
    if (cachedTools) {
      const cachedTool = cachedTools.find(tool => tool.id === id);
      if (cachedTool) {
        console.log(`[AIToolsService] Using cached data for tool ${id}`);
        return cachedTool;
      }
    }

    // If not in cache, fetch from API
    console.log(`[AIToolsService] Fetching fresh data for tool ${id}`);
    const tool = await fetchAIToolById(id);
    
    return tool;
  } catch (error) {
    console.error(`[AIToolsService] Error fetching AI tool ${id}:`, error);
    throw error; // Let the component handle the error
  }
};

/**
 * Add a new AI tool
 */
export const addAITool = async (toolData, imageFile) => {
  try {
    const createdTool = await createAITool(toolData, imageFile);

    // Invalidate cache
    invalidateCache();

    return createdTool;
  } catch (error) {
    console.error('[AIToolsService] Error adding AI tool:', error);
    throw error;
  }
};

/**
 * Update an existing AI tool
 */
export const updateAITool = async (id, toolData, imageFile) => {
  try {
    const updatedTool = await apiUpdateAITool(id, toolData, imageFile);

    // Invalidate cache
    invalidateCache();

    return updatedTool;
  } catch (error) {
    console.error(`[AIToolsService] Error updating AI tool ${id}:`, error);
    throw error;
  }
};

/**
 * Delete an AI tool
 */
export const deleteAITool = async (id) => {
  try {
    await apiDeleteAITool(id);
    
    // Invalidate cache
    invalidateCache();
    
    return true;
  } catch (error) {
    console.error(`[AIToolsService] Error deleting AI tool ${id}:`, error);
    throw error;
  }
};

/**
 * Cache tools data in localStorage
 */
const cacheTools = (tools) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(tools));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    console.log('[AIToolsService] Tools data cached successfully');
  } catch (error) {
    console.error('[AIToolsService] Error caching tools data:', error);
    // Clear any partial cache to prevent inconsistency
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  }
};

/**
 * Get cached tools if available and not expired
 */
const getCachedTools = () => {
  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const cachedData = localStorage.getItem(CACHE_KEY);
    
    if (!timestamp || !cachedData) {
      return null;
    }
    
    // Check if cache is still valid
    const now = Date.now();
    const cacheTime = parseInt(timestamp, 10);
    
    if (now - cacheTime > CACHE_DURATION) {
      console.log('[AIToolsService] Cache expired');
      return null;
    }
    
    return JSON.parse(cachedData);
  } catch (error) {
    console.error('[AIToolsService] Error reading cache:', error);
    return null;
  }
};

/**
 * Invalidate the cache
 */
const invalidateCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log('[AIToolsService] Cache invalidated');
  } catch (error) {
    console.error('[AIToolsService] Error invalidating cache:', error);
  }
}; 