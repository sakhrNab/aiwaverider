// src/utils/api.jsx

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

export const createPost = async (postData, token) => {
  try {
    const response = await fetch(`${API_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(postData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating post:', error);
    return { error: 'An unexpected error occurred while creating the post.' };
  }
};

export const getAllPosts = async () => {
  try {
    const response = await fetch(`${API_URL}/api/posts`, {
      method: 'GET',
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
};

export const getComments = async (postId) => {
  try {
    const response = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
      method: 'GET',
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

export const addComment = async (postId, commentData, token) => {
  try {
    const response = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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

export const deletePost = async (postId, token) => {
  try {
    const response = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
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
