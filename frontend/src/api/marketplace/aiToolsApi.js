import { api } from '../core/apiConfig';
import { createSvgDataUri } from '../../utils/imageUtils';
import { auth } from '../../utils/firebase';

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
    
    // Process the response to ensure we have valid image URLs
    // Check for both response.data.tools and response.data.data to handle different API response structures
    const tools = response.data?.data || response.data?.tools || [];
    
    // Replace external image URLs with SVG data URIs to prevent 404/403 errors
    return tools.map(tool => {
      // Create a new object to avoid modifying the original
      const processedTool = { ...tool };
      
      // Only replace image if it's not already set or if it's potentially problematic
      if (!processedTool.imageUrl || processedTool.imageUrl.includes('vecteezy') || processedTool.imageUrl.includes('placeholder')) {
        // Generate SVG data URI for the tool
        const bgColor = getToolColor(processedTool.title);
        const displayText = processedTool.title || 'AI Tool';
        
        // Replace potentially problematic image URLs with SVG data URIs
        processedTool.imageUrl = createSvgDataUri({
          text: displayText,
          width: 300,
          height: 200,
          bgColor,
          textColor: 'ffffff',
          fontSize: 24
        });
        
        // Also update the image property if it exists and is problematic
        if (processedTool.image && (processedTool.image.includes('vecteezy') || processedTool.image.includes('placeholder'))) {
          processedTool.image = processedTool.imageUrl;
        }
      }
      
      return processedTool;
    });
  } catch (error) {
    console.error('Error fetching AI tools:', error);
    return [];
  }
};

/**
 * Helper function to get a color based on the tool name
 * @param {string} toolName - The name of the tool
 * @returns {string} - Hex color code without the # prefix
 */
export const getToolColor = (toolName = '') => {
  if (!toolName) return '4a69bd'; // Default blue
  
  const name = toolName.toLowerCase();
  
  // Tool-specific colors (without #)
  if (name.includes('github') || name.includes('copilot')) {
    return '333333';
  } else if (name.includes('chatgpt') || name.includes('openai')) {
    return '10a37f';
  } else if (name.includes('midjourney')) {
    return '6b21ff';
  } else if (name.includes('notion')) {
    return '000000';
  } else if (name.includes('canva')) {
    return '00c4cc';
  } else if (name.includes('runway')) {
    return 'd14836';
  } else if (name.includes('dall-e') || name.includes('dalle')) {
    return '5436da';
  } else if (name.includes('jasper')) {
    return 'ff7a59';
  } else if (name.includes('copy.ai') || name.includes('copyai')) {
    return '3a86ff';
  } else if (name.includes('synthesia')) {
    return '7209b7';
  } else if (name.includes('descript')) {
    return '4361ee';
  } else if (name.includes('grammarly')) {
    return '15c39a';
  } else if (name.includes('stable') || name.includes('diffusion')) {
    return '0b7285';
  }
  
  return '4a69bd'; // Default blue
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
    
    // Process the tool to ensure it has a valid image URL
    // Check for both response.data and response.data.data to handle different API response structures
    const tool = response.data?.data || response.data;
    
    if (tool) {
      // Only generate SVG if image is missing or potentially problematic
      if (!tool.imageUrl || tool.imageUrl.includes('vecteezy') || tool.imageUrl.includes('placeholder')) {
        // Generate SVG data URI for the tool
        const bgColor = getToolColor(tool.title);
        const displayText = tool.title || 'AI Tool';
        
        // Replace potentially problematic image URLs with SVG data URIs
        tool.imageUrl = createSvgDataUri({
          text: displayText,
          width: 300,
          height: 200,
          bgColor,
          textColor: 'ffffff',
          fontSize: 24
        });
        
        // Also update the image property if it exists and is problematic
        if (tool.image && (tool.image.includes('vecteezy') || tool.image.includes('placeholder'))) {
          tool.image = tool.imageUrl;
        }
      }
      
      // Ensure imageUrl exists if only image is provided
      if (!tool.imageUrl && tool.image) {
        tool.imageUrl = tool.image;
      }
      
      return tool;
    }
    
    throw new Error('Tool data not found in response');
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
    
    // Check if user is logged in
    const user = auth.currentUser;
    if (!user) {
      console.error('[API] No authenticated user found');
      throw new Error('Authentication required. Please log in.');
    }
    
    console.log('[API] Current user:', user.email);
    
    // Get current auth token directly from Firebase with force refresh
    const token = await user.getIdToken(true);
    if (!token) {
      console.error('[API] Failed to get auth token');
      throw new Error('Authentication required. Please log in.');
    }
    
    // Process tags to ensure they're in the correct format
    const processedToolData = { ...toolData };
    if (Array.isArray(processedToolData.tags)) {
      // Ensure tags are strings
      processedToolData.tags = processedToolData.tags.map(tag => String(tag));
    } else {
      processedToolData.tags = [];
    }
    
    // If we have an image file, use FormData
    if (imageFile) {
      const formData = new FormData();
      
      // Add all tool data to the form
      Object.keys(processedToolData).forEach(key => {
        if (key === 'tags' && Array.isArray(processedToolData[key])) {
          // For tags array, append each item individually with the same key name
          processedToolData[key].forEach(tag => {
            formData.append('tags', tag);
          });
        } else {
          formData.append(key, processedToolData[key]);
        }
      });
      
      // Add the image file
      formData.append('image', imageFile);
      
      console.log('[API] Sending request with FormData and token:', token.substring(0, 10) + '...');
      const response = await api.post('/api/ai-tools', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[API] Response received:', response.status, response.data);
      
      // Extract the tool data from the response
      return response.data?.data || response.data;
    } else {
      // No image file, just send JSON
      console.log('[API] Sending JSON request with token:', token.substring(0, 10) + '...');
      const response = await api.post('/api/ai-tools', processedToolData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[API] Response received:', response.status, response.data);
      return response.data?.data || response.data;
    }
  } catch (error) {
    console.error('Error creating AI tool:', error);
    if (error.response) {
      console.error('Response error data:', error.response.data);
      console.error('Response error status:', error.response.status);
      console.error('Response error headers:', error.response.headers);
    }
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
    
    // Get current auth token directly from Firebase
    const token = await auth.currentUser?.getIdToken(true);
    if (!token) {
      throw new Error('Authentication required. Please log in as an admin.');
    }
    
    // Process tags to ensure they're in the correct format
    const processedToolData = { ...toolData };
    if (Array.isArray(processedToolData.tags)) {
      // Ensure tags are strings
      processedToolData.tags = processedToolData.tags.map(tag => String(tag));
    } else {
      processedToolData.tags = [];
    }
    
    // If we have an image file, use FormData
    if (imageFile) {
      const formData = new FormData();
      
      // Add all tool data to the form
      Object.keys(processedToolData).forEach(key => {
        if (key === 'tags' && Array.isArray(processedToolData[key])) {
          // For tags array, append each item individually with the same key name
          processedToolData[key].forEach(tag => {
            formData.append('tags', tag);
          });
        } else {
          formData.append(key, processedToolData[key]);
        }
      });
      
      // Add the image file
      formData.append('image', imageFile);
      
      const response = await api.put(`/api/ai-tools/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Extract the tool data from the response
      return response.data?.data || response.data;
    } else {
      // No image file, just send JSON
      const response = await api.put(`/api/ai-tools/${id}`, processedToolData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data?.data || response.data;
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
    
    // Get current auth token directly from Firebase
    const token = await auth.currentUser?.getIdToken(true);
    if (!token) {
      throw new Error('Authentication required. Please log in as an admin.');
    }
    
    const response = await api.delete(`/api/ai-tools/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
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