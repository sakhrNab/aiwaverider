// src/utils/api.jsx

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Sign Up
export const signUp = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error during sign up:', error);
    return { error: 'An unexpected error occurred during sign up.' };
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
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error during sign in:', error);
    return { error: 'An unexpected error occurred during sign in.' };
  }
};

// Create Post with FormData
export const createPost = async (formData, token) => {
  try {
    const response = await fetch(`${API_URL}/api/posts`, {
      method: 'POST',
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
export const signOutUser = async (token) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/signout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error during sign out:', error);
    return { error: 'An unexpected error occurred during sign out.' };
  }
};

// Update Post
export const updatePost = async (postId, formData, token) => {
  try {
    const response = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'PUT',
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
