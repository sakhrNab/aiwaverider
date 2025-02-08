// src/utils/api.jsx

import axios from 'axios';
import firebase from 'firebase/compat/app';
import { auth } from '../utils/firebase';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Create an Axios instance with the base URL and enable credentials
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Set up a request interceptor to attach the Firebase token automatically
api.interceptors.request.use(
  async (config) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken(true);
        config.headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting token:', error);
      }
    } else {
      console.warn('No currentUser found in Axios interceptor');
    }
    // For non-FormData payloads, set the Content-Type to application/json
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper function to get auth headers (if needed explicitly)
export const getAuthHeaders = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {};
  }
  const token = await currentUser.getIdToken(true);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Create Session using Axios
export const createSession = async (user) => {
  try {
    const token = await user.getIdToken(true);
    const response = await api.post('/api/auth/session', { idToken: token });
    return response.data;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

// Sign Out User
export const signOutUser = async () => {
  try {
    const response = await api.post('/api/auth/signout');
    return { success: true, message: response.data.message || 'Signed out successfully' };
  } catch (error) {
    console.error('Error during sign out:', error);
    return { success: true, message: 'Signed out locally' };
  }
};

// Sign Up with Email and Password
export const signUp = async (userData) => {
  try {
    const { email, password } = userData;
    const firebaseResult = await auth.createUserWithEmailAndPassword(email, password);
    const firebaseUser = firebaseResult.user;
    // Update Firebase profile with display name
    await firebaseUser.updateProfile({
      displayName: `${userData.firstName} ${userData.lastName}`
    });
    // Prepare user data for the backend (excluding password)
    const backendUserData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
      displayName: firebaseUser.displayName
    };
    const response = await api.post('/api/auth/signup', backendUserData);
    return { user: firebaseUser };
  } catch (error) {
    console.error('Error during sign up:', error);
    throw error;
  }
};

// Sign In with Email and Password
export const signIn = async (credentials) => {
  try {
    const { usernameOrEmail, password } = credentials;
    let email = usernameOrEmail;
    const isEmail = usernameOrEmail.includes('@');
    if (!isEmail) {
      const response = await api.get(`/api/auth/get-email/${usernameOrEmail}`);
      email = response.data.email;
    }
    const result = await auth.signInWithEmailAndPassword(email, password);
    if (!result.user) {
      throw new Error('No user data returned from Firebase');
    }
    // AuthContext handles session creation on auth state change.
    return { firebaseUser: result.user };
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

// Sign In with Google
export const signInWithGoogle = async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await auth.signInWithPopup(provider);
    if (!result.user) {
      throw new Error('No user data returned from Google Sign-In');
    }
    try {
      // Verify user exists in backend
      await api.post('/api/auth/verify-user');
      return { firebaseUser: result.user };
    } catch (error) {
      if (error.response && error.response.data.errorType === 'NO_ACCOUNT') {
        await auth.signOut();
        throw new Error('NO_ACCOUNT');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Google Sign-Up (using signInWithPopup; let AuthContext create user)
export const signUpWithGoogle = async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await auth.signInWithPopup(provider);
    if (!result.user) {
      throw new Error('No user data returned from Google Sign-Up');
    }
    return { firebaseUser: result.user };
  } catch (error) {
    console.error('Error in Google sign up:', error);
    throw error;
  }
};

// Sign Up with Microsoft
export const signUpWithMicrosoft = async () => {
  try {
    const provider = new firebase.auth.OAuthProvider('microsoft.com');
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    const token = await user.getIdToken();
    const userData = {
      uid: user.uid,
      email: user.email,
      username: `user_${user.uid.slice(0, 8)}`,
      firstName: user.displayName?.split(' ')[0] || '',
      lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
      displayName: user.displayName,
      photoURL: user.photoURL,
      provider: 'microsoft'
    };
    const response = await api.post('/api/auth/signup', userData);
    return { firebaseUser: user };
  } catch (error) {
    console.error('Error in Microsoft sign up:', error);
    throw error;
  }
};

// Sign In with Microsoft
export const signInWithMicrosoft = async () => {
  try {
    const provider = new firebase.auth.OAuthProvider('microsoft.com');
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await auth.signInWithPopup(provider);
    if (!result.user) {
      throw new Error('No user data returned from Microsoft Sign-In');
    }
    try {
      await api.post('/api/auth/verify-user');
      return { firebaseUser: result.user };
    } catch (error) {
      if (error.response && error.response.data.errorType === 'NO_ACCOUNT') {
        await auth.signOut();
        throw new Error('NO_ACCOUNT');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in Microsoft sign in:', error);
    throw error;
  }
};

// Create Post
export const createPost = async (formData) => {
  try {
    const headers = await getAuthHeaders();
    if (headers['Content-Type']) {
      delete headers['Content-Type'];
    }
    const response = await api.post('/api/posts', formData, { headers });
    return response.data;
  } catch (error) {
    console.error('Error creating post:', error);
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
export const updatePost = async (postId, formData) => {
  try {
    const headers = await getAuthHeaders();
    if (headers['Content-Type']) {
      delete headers['Content-Type'];
    }
    const response = await api.put(`/api/posts/${postId}`, formData, { headers });
    return response.data;
  } catch (error) {
    console.error('Error updating post:', error);
    return { error: 'An unexpected error occurred while updating the post.' };
  }
};

// Get Post by ID
export const getPostById = async (postId) => {
  try {
    const response = await api.get(`/api/posts/${postId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    throw error;
  }
};

// Like Comment
export const likeComment = async (postId, commentId) => {
  try {
    const response = await api.post(`/api/posts/${postId}/comments/${commentId}/like`);
    return response.data.updatedComment;
  } catch (error) {
    console.error('Error liking comment:', error);
    throw error;
  }
};

// Unlike Comment
export const unlikeComment = async (postId, commentId) => {
  try {
    const response = await api.delete(`/api/posts/${postId}/comments/${commentId}/like`);
    return response.data.updatedComment;
  } catch (error) {
    console.error('Error unliking comment:', error);
    throw error;
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

// =================================================================
// Profile API Functions (Using '/api/profile' as the base path)
// =================================================================

export const getProfile = async () => {
  try {
    const response = await api.get('/api/profile');
    return response.data;
  } catch (error) {
    console.error('Error getting profile:', error);
    throw error;
  }
};

export const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/api/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export const updateInterests = async (interests) => {
  try {
    const response = await api.put('/api/profile/interests', { interests });
    return response.data;
  } catch (error) {
    console.error('Error updating interests:', error);
    throw error;
  }
};

export const getNotifications = async () => {
  try {
    const response = await api.get('/api/profile/notifications');
    return response.data;
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
};

export const updateNotifications = async (notifications) => {
  try {
    const response = await api.put('/api/profile/notifications', { notifications });
    return response.data;
  } catch (error) {
    console.error('Error updating notifications:', error);
    throw error;
  }
};

export const getSubscriptions = async () => {
  try {
    const response = await api.get('/api/profile/subscriptions');
    return response.data;
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    throw error;
  }
};

export const getFavorites = async () => {
  try {
    const response = await api.get('/api/profile/favorites');
    return response.data;
  } catch (error) {
    console.error('Error getting favorites:', error);
    throw error;
  }
};

export const addFavorite = async (favoriteId) => {
  try {
    const response = await api.post('/api/profile/favorites', { favoriteId });
    return response.data;
  } catch (error) {
    console.error('Error adding favorite:', error);
    throw error;
  }
};

export const removeFavorite = async (favoriteId) => {
  try {
    const response = await api.delete(`/api/profile/favorites/${favoriteId}`);
    return response.data;
  } catch (error) {
    console.error('Error removing favorite:', error);
    throw error;
  }
};

export const getCommunityInfo = async () => {
  try {
    const response = await api.get('/api/profile/community');
    return response.data;
  } catch (error) {
    console.error('Error getting community info:', error);
    throw error;
  }
};

// Upload Profile Avatar using Firebase Storage
export const uploadProfileImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    // Call the backend endpoint for avatar upload (Firebase Storage based)
    const response = await api.put('/api/profile/upload-avatar', formData, {
      // Do not set Content-Type header manually for FormData.
    });
    return response.data; // Expected to return { photoURL: "new_image_url" }
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
};


export default api;
