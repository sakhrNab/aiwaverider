// Helper functions for agent operations with proper authentication

import { API_URL } from '../api/core/apiConfig';
import { getAuthToken, getAuthHeaders } from './auth';

/**
 * Delete an agent from the system
 * @param {string} agentId - The ID of the agent to delete
 * @returns {Promise<Object>} - Response object with success status and message
 */
export const deleteAgent = async (agentId) => {
  try {
    // Validate agent ID to prevent Firestore errors
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      console.error('Invalid agent ID:', agentId);
      return {
        success: false,
        message: 'Cannot delete agent: Invalid agent ID'
      };
    }

    // Clean agent ID - remove any problematic characters that might cause Firestore errors
    const cleanAgentId = agentId.trim();
    
    // Debug log for agent ID format
    console.log('Agent ID debug info:', {
      original: agentId,
      cleaned: cleanAgentId,
      length: cleanAgentId.length,
      format: /^[a-zA-Z0-9-_]+$/.test(cleanAgentId) ? 'valid' : 'has-special-chars',
      hasSlashes: cleanAgentId.includes('/'),
      hasSpaces: /\s/.test(cleanAgentId)
    });
    
    console.log(`Attempting to delete agent: ${cleanAgentId}`);
    
    // Get raw token for debugging
    const token = getAuthToken();
    console.log('Token available:', !!token, 
                'Prefix:', token ? token.substring(0, 10) : 'none', 
                'Length:', token ? token.length : 0);
    
    // Get auth headers with proper token
    const headers = getAuthHeaders();
    console.log('Using headers:', headers);
    
    // Make DELETE request to API
    console.log(`Making DELETE request to: ${API_URL}/api/agent/${cleanAgentId}`);
    const response = await fetch(`${API_URL}/api/agent/${cleanAgentId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    
    console.log(`Delete response status: ${response.status}`);
    
    // Log the full response for debugging
    try {
      const responseClone = response.clone();
      const responseText = await responseClone.text();
      console.log('Full response:', responseText);
      try {
        const responseJson = JSON.parse(responseText);
        console.log('Response as JSON:', responseJson);
      } catch (e) {
        // Not JSON, that's fine
      }
    } catch (e) {
      console.log('Could not read response body:', e);
    }
    
    // For development, allow simulated success when backend is not available
    if (process.env.NODE_ENV === 'development' && (response.status === 401 || response.status === 404 || response.status === 500)) {
      console.warn('Development mode: Simulating successful delete despite server error');
      return {
        success: true,
        message: 'Agent deleted successfully (simulated)',
        simulated: true
      };
    }
    
    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `Failed to delete agent. Status: ${response.status}`;
      
      try {
        // Try to parse error JSON if available
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        // If can't parse JSON, try to get text
        try {
          const errorText = await response.text();
          if (errorText) errorMessage += ` - ${errorText}`;
        } catch (textError) {
          // If can't get text either, just use status code message
        }
      }
      
      throw new Error(errorMessage);
    }
    
    // Try to parse success response
    let successData = { message: 'Agent deleted successfully' };
    try {
      successData = await response.json();
    } catch (e) {
      // If can't parse JSON, just use default success message
    }
    
    // Return success response
    return {
      success: true,
      message: successData.message || 'Agent deleted successfully',
      data: successData
    };
  } catch (error) {
    console.error('Error deleting agent:', error);
    
    // Return error response
    return {
      success: false,
      message: error.message || 'An error occurred while deleting the agent'
    };
  }
};

// /**
//  * Create proper authentication headers
//  * @returns {Object} Headers with authentication
//  */
// export function getAuthHeaders() {
//   const headers = {
//     'Content-Type': 'application/json',
//   };
  
//   const token = localStorage.getItem('authToken');
//   if (token) {
//     // The server expects tokens in the format "Bearer <token>"
//     headers['Authorization'] = token.startsWith('Bearer ') ? 
//       token : `Bearer ${token}`;
//   }
  
//   return headers;
// }
