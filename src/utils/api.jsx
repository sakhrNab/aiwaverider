// src/utils/api.jsx

import axios from 'axios';
import firebase from 'firebase/compat/app';
import { auth } from '../utils/firebase';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Add token caching
let cachedToken = null;
let tokenExpirationTime = null;

// Function to get token with caching
const getTokenWithCache = async (currentUser) => {
  console.log('getTokenWithCache called');
  const now = Date.now();
  
  // If we have a cached token that's not expired and not close to expiring, use it
  if (cachedToken && tokenExpirationTime && now < tokenExpirationTime - (5 * 60 * 1000)) {
    console.log('Using cached token, expires in:', Math.round((tokenExpirationTime - now) / 1000), 'seconds');
    return cachedToken;
  }

  try {
    console.log('Getting fresh token, old token expires in:', tokenExpirationTime ? Math.round((tokenExpirationTime - now) / 1000) : 'N/A', 'seconds');
    // Force refresh the token
    const token = await currentUser.getIdToken(true);
    
    // Cache the token and set expiration (5 minutes before actual expiration)
    cachedToken = token;
    // Firebase tokens expire in 1 hour, we'll refresh 5 minutes before
    tokenExpirationTime = now + (55 * 60 * 1000);
    
    console.log('New token obtained and cached, expires in:', Math.round((tokenExpirationTime - now) / 1000), 'seconds');
    return token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    console.error('Error stack:', error.stack);
    // Clear the cache on error
    cachedToken = null;
    tokenExpirationTime = null;
    throw error;
  }
};

// Create an Axios instance with the base URL and enable credentials
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Set up a request interceptor to attach the Firebase token automatically
api.interceptors.request.use(
  async (config) => {
    console.log('Interceptor running for:', config.url);
    console.log('Request method:', config.method);
    console.log('Request data type:', config.data instanceof FormData ? 'FormData' : typeof config.data);
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await getTokenWithCache(currentUser);
        console.log('Token obtained:', token ? 'yes' : 'no');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
          console.log('Authorization header set');
        } else {
          console.warn('No token obtained from getTokenWithCache');
        }
      } catch (error) {
        console.error('Error getting token in interceptor:', error);
        console.error('Error stack:', error.stack);
      }
    } else {
      console.warn('No currentUser found in Axios interceptor');
    }
    
    // For non-FormData payloads, set the Content-Type to application/json
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
      console.log('Content-Type set to application/json');
    } else {
      console.log('FormData detected, letting browser set Content-Type');
    }
    
    console.log('Final request headers:', config.headers);
    console.log('Final request config:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      withCredentials: config.withCredentials
    });
    
    return config;
  },
  (error) => {
    console.error('Interceptor error:', error);
    console.error('Error stack:', error.stack);
    return Promise.reject(error);
  }
);

// Helper function to get auth headers (if needed explicitly)
export const getAuthHeaders = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {};
  }
  const token = await getTokenWithCache(currentUser);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Clear token cache on sign out
export const clearTokenCache = () => {
  cachedToken = null;
  tokenExpirationTime = null;
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
    clearTokenCache(); // Clear token cache
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
    
    // Get profile image URL from Google
    const photoURL = result.user.photoURL;
    
    return { 
      firebaseUser: result.user,
      photoURL 
    };
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
    
    // Get profile image URL from Microsoft
    const photoURL = user.photoURL;
    
    const userData = {
      uid: user.uid,
      email: user.email,
      username: `user_${user.uid.slice(0, 8)}`,
      firstName: user.displayName?.split(' ')[0] || '',
      lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
      displayName: user.displayName,
      photoURL,
      provider: 'microsoft'
    };
    
    const response = await api.post('/api/auth/signup', userData);
    return { 
      firebaseUser: user,
      photoURL 
    };
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
    console.log('Sending profile update request:', profileData);
    const response = await api.put('/api/profile', profileData);
    console.log('Profile update response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.response) {
      console.error('Server response:', error.response.data);
      throw new Error(error.response.data.error || `Server error: ${error.response.status}`);
    }
    throw error;
  }
};

export const updateInterests = async (interests) => {
  try {
    // Ensure interests is an array
    if (!Array.isArray(interests)) {
      throw new Error('Interests must be an array');
    }

    // Log the request payload for debugging
    console.log('Sending interests update:', { interests });

    // Make the API call with properly formatted request body
    const response = await api.put('/api/profile/interests', { interests });
    
    // Log the response for debugging
    console.log('Interests update response:', response.data);

    // Return the response data directly
    return response.data;
  } catch (error) {
    console.error('Error updating interests:', error);
    if (error.response) {
      // If we have a response from the server, throw its error message
      throw new Error(error.response.data.error || 'Failed to update interests');
    }
    // Otherwise throw the original error
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
    console.log('Preparing to upload image:', file.name, file.type, file.size);
    const formData = new FormData();
    formData.append('avatar', file);
    
    // Call the backend endpoint for avatar upload (Firebase Storage based)
    const response = await api.put('/api/profile/upload-avatar', formData, {
      // Do not set Content-Type header manually for FormData.
    });
    console.log('Image upload response:', response.data);
    return response.data; // Expected to return { photoURL: "new_image_url" }
  } catch (error) {
    console.error('Error uploading profile image:', error);
    if (error.response) {
      console.error('Server response:', error.response.data);
      throw new Error(error.response.data.error || `Server error: ${error.response.status}`);
    }
    throw error;
  }
};


export default api;
