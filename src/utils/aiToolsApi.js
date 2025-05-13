import { api } from './apiConfig';

/**
 * Fetch all AI tools
 * @param {Object} options - Optional parameters
 * @param {boolean} options.featured - Filter by featured tools
 * @param {string} options.category - Filter by category
 * @param {number} options.limit - Limit the number of results
 * @returns {Promise<Array>} - Array of AI tools
 */
export const fetchAITools = async (options = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add optional parameters if provided
    if (options.featured) {
      queryParams.append('featured', 'true');
    }
    if (options.category) {
      queryParams.append('category', options.category);
    }
    if (options.limit) {
      queryParams.append('limit', options.limit.toString());
    }
    
    const queryString = queryParams.toString();
    const url = `/api/ai-tools${queryString ? `?${queryString}` : ''}`;
    
    console.log(`[API] Fetching AI tools with options:`, options);
    const response = await api.get(url);
    return response.data?.tools || [];
  } catch (error) {
    console.error('Error fetching AI tools:', error);
    return [];
  }
};

/**
 * Fetch a single AI tool by ID
 * @param {string} id - ID of the AI tool to fetch
 * @returns {Promise<Object>} - AI tool data
 */
export const fetchAIToolById = async (id) => {
  try {
    console.log(`[API] Fetching AI tool with ID: ${id}`);
    const response = await api.get(`/api/ai-tools/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching AI tool ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new AI tool
 * @param {Object} toolData - Data for the new AI tool
 * @param {File} imageFile - Optional image file to upload
 * @returns {Promise<Object>} - Created AI tool data
 */
export const createAITool = async (toolData, imageFile = null) => {
  try {
    console.log('[API] Creating new AI tool:', toolData);
    
    // If we have an image file, use FormData
    if (imageFile) {
      const formData = new FormData();
      
      // Add all tool data to the form
      Object.keys(toolData).forEach(key => {
        formData.append(key, toolData[key]);
      });
      
      // Add the image file
      formData.append('image', imageFile);
      
      const response = await api.post('/api/ai-tools', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } else {
      // No image file, just send JSON
      const response = await api.post('/api/ai-tools', toolData);
      return response.data;
    }
  } catch (error) {
    console.error('Error creating AI tool:', error);
    throw error;
  }
};

/**
 * Update an existing AI tool
 * @param {string} id - ID of the AI tool to update
 * @param {Object} toolData - Updated data for the AI tool
 * @param {File} imageFile - Optional image file to upload
 * @returns {Promise<Object>} - Updated AI tool data
 */
export const updateAITool = async (id, toolData, imageFile = null) => {
  try {
    console.log(`[API] Updating AI tool ${id}:`, toolData);
    
    // If we have an image file, use FormData
    if (imageFile) {
      const formData = new FormData();
      
      // Add all tool data to the form
      Object.keys(toolData).forEach(key => {
        formData.append(key, toolData[key]);
      });
      
      // Add the image file
      formData.append('image', imageFile);
      
      const response = await api.put(`/api/ai-tools/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } else {
      // No image file, just send JSON
      const response = await api.put(`/api/ai-tools/${id}`, toolData);
      return response.data;
    }
  } catch (error) {
    console.error(`Error updating AI tool ${id}:`, error);
    throw error;
  }
};

/**
 * Delete an AI tool
 * @param {string} id - ID of the AI tool to delete
 * @returns {Promise<Object>} - Response with success status
 */
export const deleteAITool = async (id) => {
  try {
    console.log(`[API] Deleting AI tool ${id}`);
    const response = await api.delete(`/api/ai-tools/${id}`);
    return {
      success: true,
      message: 'AI tool deleted successfully',
      ...response.data
    };
  } catch (error) {
    console.error(`Error deleting AI tool ${id}:`, error);
    return {
      success: false,
      error: error.message || 'Failed to delete AI tool'
    };
  }
};

/**
 * Search for AI tools
 * @param {string} query - Search query
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} - Array of matching AI tools
 */
export const searchAITools = async (query, filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add search query
    queryParams.append('q', query);
    
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
    const url = `/api/ai-tools/search${queryString ? `?${queryString}` : ''}`;
    
    console.log(`[API] Searching AI tools with query "${query}" and filters:`, filters);
    const response = await api.get(url);
    return response.data?.tools || [];
  } catch (error) {
    console.error('Error searching AI tools:', error);
    return [];
  }
};

/**
 * Get featured AI tools
 * @param {number} limit - Maximum number of tools to return
 * @returns {Promise<Array>} - Array of featured AI tools
 */
export const getFeaturedAITools = async (limit = 6) => {
  try {
    return await fetchAITools({ featured: true, limit });
  } catch (error) {
    console.error('Error fetching featured AI tools:', error);
    return [];
  }
};

/**
 * Get AI tools by category
 * @param {string} category - Category to filter by
 * @param {number} limit - Maximum number of tools to return
 * @returns {Promise<Array>} - Array of AI tools in the category
 */
export const getAIToolsByCategory = async (category, limit = 10) => {
  try {
    return await fetchAITools({ category, limit });
  } catch (error) {
    console.error(`Error fetching AI tools for category ${category}:`, error);
    return [];
  }
};

/**
 * Rate an AI tool
 * @param {string} id - ID of the AI tool to rate
 * @param {number} rating - Rating value (1-5)
 * @param {string} comment - Optional comment with the rating
 * @returns {Promise<Object>} - Response with success status
 */
export const rateAITool = async (id, rating, comment = '') => {
  try {
    console.log(`[API] Rating AI tool ${id} with ${rating} stars`);
    const response = await api.post(`/api/ai-tools/${id}/rate`, { rating, comment });
    return {
      success: true,
      message: 'Rating submitted successfully',
      ...response.data
    };
  } catch (error) {
    console.error(`Error rating AI tool ${id}:`, error);
    return {
      success: false,
      error: error.message || 'Failed to submit rating'
    };
  }
}; 