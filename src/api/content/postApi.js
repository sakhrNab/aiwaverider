import { api } from '../core/apiConfig';
import { getAuthHeaders } from '../core/apiConfig';
import { auth } from '../../utils/firebase';

// Create Post
export const createPost = async (formData) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Authentication required');
    }

    console.log('Creating post with FormData');
    const response = await api.post('/api/posts', formData);
    console.log('Post created successfully:', response.data);

    return response.data;
  } catch (error) {
    console.error('Error creating post:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
      throw new Error(error.response.data.error || 'Failed to create post');
    }
    throw error;
  }
};

// Get All Posts
export const getAllPosts = async (category = 'All', limit = 10, startAfter = null) => {
  try {
    let url = `/api/posts?limit=${limit}`;
    if (category && category !== 'All') {
      url += `&category=${encodeURIComponent(category)}`;
    }
    if (startAfter) {
      url += `&startAfter=${encodeURIComponent(startAfter)}`;
    }
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};

// Get Comments for a Post
export const getComments = async (postId) => {
  try {
    const response = await api.get(`/api/posts/${postId}/comments`);
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

// Add Comment
export const addComment = async (postId, commentData) => {
  try {
    const response = await api.post(`/api/posts/${postId}/comments`, commentData);
    return response.data.comment;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// Delete Post
export const deletePost = async (postId) => {
  try {
    const response = await api.delete(`/api/posts/${postId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting post:', error);
    return { error: 'An unexpected error occurred while deleting the post.' };
  }
};

// Update Post
export const updatePost = async (postId, data) => {
  try {
    const headers = await getAuthHeaders();
    
    // Check if data is FormData (for backward compatibility)
    if (data instanceof FormData) {
      // FormData needs special handling
      if (headers['Content-Type']) {
        delete headers['Content-Type'];
      }
    } else {
      // For JSON data, ensure Content-Type is set
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await api.put(`/api/posts/${postId}`, data, { headers });
    return response.data;
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
};

// Get Post by ID
export const getPostById = async (postId, skipCache = false) => {
  try {
    // Add skipCache parameter to get fresh post data with latest view count
    const url = skipCache 
      ? `/api/posts/${postId}?skipCache=true` 
      : `/api/posts/${postId}`;
      
    console.log(`[API] Getting post ${postId}${skipCache ? ' (skipping cache)' : ''}`);
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    throw error;
  }
};

// Increment Post View - Simplified to avoid CORS issues
export const incrementPostView = async (postId) => {
  try {
    console.log(`[API] Sending view increment request for post ${postId}`);
    // Use the simplest request possible to avoid CORS issues
    const response = await api.post(`/api/posts/${postId}/view`);
    console.log(`[API] View increment successful:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[API] Error incrementing view for post ${postId}:`, error.message);
    // Don't throw the error - we don't want to break the user experience
    // for a non-critical feature like view counting
    return { success: false, error: error.message };
  }
};

// Like Comment
export const likeComment = async (postId, commentId) => {
  try {
    console.log(`[API] Sending request to like comment ${commentId} for post ${postId}`);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await api.post(`/api/posts/${postId}/comments/${commentId}/like`, {}, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log(`[API] Like comment response received:`, response.status);
    
    // Return in a consistent format, handling different response structures
    return {
      updatedComment: response.data.updatedComment || response.data
    };
  } catch (error) {
    // Enhanced error logging
    if (error.name === 'AbortError') {
      console.error(`[API] Request to like comment ${commentId} timed out`);
      throw new Error(`Request timed out. The server might be overloaded.`);
    } else if (error.response) {
      console.error(`[API] Error liking comment ${commentId}:`, 
        error.response.status, error.response.data);
      throw new Error(error.response.data.error || 'Failed to update like status');
    } else {
      console.error(`[API] Error liking comment ${commentId}:`, error.message);
      throw error;
    }
  }
};

// Unlike Comment
export const unlikeComment = async (postId, commentId) => {
  try {
    console.log(`[API] Sending request to unlike comment ${commentId} for post ${postId}`);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await api.post(`/api/posts/${postId}/comments/${commentId}/unlike`, {}, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log(`[API] Unlike comment response received:`, response.status);
    
    // Return the same format as likeComment for consistency
    return {
      updatedComment: response.data.updatedComment || response.data
    };
  } catch (error) {
    // Enhanced error logging
    if (error.name === 'AbortError') {
      console.error(`[API] Request to unlike comment ${commentId} timed out`);
      throw new Error(`Request timed out. The server might be overloaded.`);
    } else if (error.response) {
      console.error(`[API] Error unliking comment ${commentId}:`, 
        error.response.status, error.response.data);
      throw new Error(error.response.data.error || 'Failed to update like status');
    } else {
      console.error(`[API] Error unliking comment ${commentId}:`, error.message);
      throw error;
    }
  }
};

// Delete Comment
export const deleteComment = async (postId, commentId) => {
  try {
    const response = await api.delete(`/api/posts/${postId}/comments/${commentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

// Update Comment
export const updateComment = async (postId, commentId, commentData) => {
  try {
    const response = await api.put(`/api/posts/${postId}/comments/${commentId}`, commentData);
    return response.data.updatedComment;
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
};

// Toggle Like on a Post
export const toggleLike = async (postId) => {
  try {
    console.log(`[API] Sending request to toggle like for post ${postId}`);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await api.post(`/api/posts/${postId}/like`, {}, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log(`[API] Toggle like response received: ${response.status}`, response.data);
    
    // Check for various response formats to be backward compatible
    const updatedPost = response.data.updatedPost || response.data.post || response.data;
    
    // Return in a consistent format
    return {
      updatedPost: updatedPost,
      status: response.status,
      success: response.data.success
    };
  } catch (error) {
    // Enhanced error logging
    if (error.name === 'AbortError') {
      console.error(`[API] Request to toggle like for post ${postId} timed out`);
      throw new Error(`Request timed out. The server might be overloaded.`);
    } else if (error.response) {
      console.error(`[API] Error toggling like for post ${postId}:`, 
        error.response.status, error.response.data);
      throw new Error(error.response.data.error || 'Failed to update like status');
    } else {
      console.error(`[API] Error toggling like for post ${postId}:`, error.message);
      throw error;
    }
  }
}; 