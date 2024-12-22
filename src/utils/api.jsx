// src/utils/api.jsx

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

// Create Post
export const createPost = async (postData, token) => {
  try {
    const response = await fetch(`${API_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
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

// Get All Posts
// src/utils/api.jsx

export const getAllPosts = async (token) => {
  try {
    const response = await fetch(`${API_URL}/api/posts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Include the JWT token
      },
      credentials: 'include', // Include cookies if using them
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch posts.');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error; // Rethrow to be caught in PostList.jsx
  }
};


// Get Comments for a Post
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
// src/utils/api.jsx

// const API_URL = 'http://localhost:4000'; // Ensure this is correct

// Sign Out User
export const signOutUser = async (token) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/signout`, {
      method: 'POST',
      credentials: 'include', // Include cookies if needed
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Include the JWT token
      },
      // body: JSON.stringify({}), // Typically no body is needed for signout
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error during sign out:', error);
    return { error: 'An unexpected error occurred during sign out.' };
  }
};

