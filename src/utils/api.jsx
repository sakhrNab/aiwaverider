// src/utils/api.jsx

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Sign Up
export const signUp = async (userData) => {
  try {
    console.log('Attempting signup with:', { ...userData, password: '[REDACTED]' });
    
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      credentials: 'include', // Important for cookies
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Signup error response:', data);
      throw new Error(data.error || data.details || 'Sign up failed');
    }

    return data;
  } catch (error) {
    console.error('Error during sign up:', error);
    throw error;
  }
};

// Sign In
export const signIn = async (credentials) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include', // Important for cookies
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Sign in failed');
    }
    return data;
  } catch (error) {
    console.error('Error during sign in:', error);
    throw error;
  }
};

// Create Post with FormData
export const createPost = async (formData, token) => {
  try {
    const response = await fetch(`${API_URL}/api/posts`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Do NOT set 'Content-Type' header when sending FormData
      },
      body: formData, // FormData instance
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating post:', error);
    return { error: 'An unexpected error occurred while creating the post.' };
  }
};

// Get All Posts with Optional Parameters
export const getAllPosts = async (category = 'All', limit = 10, startAfter = null, token) => {
  try {
    let url = `${API_URL}/api/posts?limit=${limit}`;
    if (category && category !== 'All') {
      url += `&category=${encodeURIComponent(category)}`;
    }
    if (startAfter) {
      url += `&startAfter=${encodeURIComponent(startAfter)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch posts.');
    }

    const data = await response.json();
    return data; // Expected to be { posts: [...], lastPostCreatedAt: '...' }
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error; // Rethrow to be caught in components
  }
};

// Get Comments for a Post
export const getComments = async (postId) => {
  try {
    const response = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

// Add Comment to a Post
export const addComment = async (postId, commentData, token) => {
  try {
    const response = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(commentData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error adding comment:', error);
    return { error: 'An unexpected error occurred while adding the comment.' };
  }
};

// Delete Post
export const deletePost = async (postId, token) => {
  try {
    const response = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (response.ok) {
      return { success: true };
    } else {
      const data = await response.json();
      return { error: data.error || 'Failed to delete post.' };
    }
  } catch (error) {
    console.error('Error deleting post:', error);
    return { error: 'An unexpected error occurred while deleting the post.' };
  }
};

// Sign Out User
export const signOutUser = async () => {
  try {
    const response = await fetch(`${API_URL}/api/auth/signout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // First try to parse the response as JSON
    let data;
    try {
      data = await response.json();
    } catch (e) {
      // If parsing fails, create a default response
      data = { message: response.statusText };
    }

    // Always consider signout successful even if server returns error
    // This ensures client-side cleanup happens
    return { success: true, message: data.message || 'Signed out successfully' };
  } catch (error) {
    console.error('Error during sign out:', error);
    // Still return success to ensure client-side cleanup
    return { success: true, message: 'Signed out locally' };
  }
};

// Update Post
export const updatePost = async (postId, formData, token) => {
  try {
    const response = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Do NOT set 'Content-Type' header when sending FormData
      },
      body: formData, // FormData instance
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating post:', error);
    return { error: 'An unexpected error occurred while updating the post.' };
  }
};

// Get Post by ID
export const getPostById = async (postId) => {
  try {
    const response = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // Add Authorization header if the endpoint requires authentication
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch the post.');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    throw error;
  }
};

// Update Refresh Token
export const refreshToken = async () => {
  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    // If unauthorized, just return null without logging an error
    if (response.status === 401) {
      return { user: null };
    }

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Only log error if it's not an unauthorized error
    if (!error.message.includes('Unauthorized')) {
      console.error('Error refreshing token:', error);
    }
    return { user: null };
  }
};
