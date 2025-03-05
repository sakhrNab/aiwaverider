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
    // Check for cached profile data first
    const cacheKey = 'profile_data';
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        const cacheDuration = 30 * 60 * 1000; // 30 minutes
        
        if (cacheAge < cacheDuration) {
          console.log('[API] Using cached profile data', { cacheAge: Math.round(cacheAge/1000) + 's' });
          return data;
        } else {
          console.log('[API] Profile cache expired, fetching fresh data');
        }
      } catch (cacheError) {
        console.error('[API] Error parsing cached profile data:', cacheError);
        // Continue to fetch fresh data
      }
    } else {
      console.log('[API] No profile cache found, fetching fresh data');
    }
    
    // Fetch fresh data from API
    const response = await api.get('/api/profile');
    const profileData = response.data;
    
    // Cache the fresh data
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: profileData,
        timestamp: Date.now()
      }));
      console.log('[API] Profile data cached successfully');
    } catch (cacheError) {
      console.error('[API] Error caching profile data:', cacheError);
      // Continue even if caching fails
    }
    
    return profileData;
  } catch (error) {
    console.error('Error getting profile:', error);
    
    // Try to return cached data even if expired as fallback
    try {
      const cacheKey = 'profile_data';
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { data } = JSON.parse(cachedData);
        console.log('[API] Using expired cache as fallback after API error');
        return data;
      }
    } catch (fallbackError) {
      console.error('[API] Error reading fallback cache:', fallbackError);
    }
    
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
      console.error('[API] Invalid interests format:', interests);
      throw new Error('Interests must be an array');
    }

    console.log('[API] Updating interests:', interests);
    
    // Make the API call
    const response = await api.put('/api/profile/interests', { interests });
    console.log('[API] Update interests response:', response.data);
    
    // Clear caches after successful update
    try {
      localStorage.removeItem('profile_data');
      localStorage.removeItem('community_data');
      console.log('[API] Cleared profile and community caches after interests update');
    } catch (cacheError) {
      console.error('[API] Error clearing caches:', cacheError);
    }
    
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
    // Check for cached data
    const cacheKey = 'community_data';
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        const cacheDuration = 30 * 60 * 1000; // 30 minutes
        
        if (cacheAge < cacheDuration) {
          console.log('[API] Using cached community data', { cacheAge: Math.round(cacheAge/1000) + 's' });
          return data;
        } else {
          console.log('[API] Community cache expired, fetching fresh data');
        }
      } catch (cacheError) {
        console.error('[API] Error parsing cached community data:', cacheError);
        // Continue to fetch fresh data
      }
    } else {
      console.log('[API] No community cache found, fetching fresh data');
    }
    
    // Fetch fresh data from API
    const response = await api.get('/api/profile/community');
    const communityData = response.data;
    
    // Cache the fresh data
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: communityData,
        timestamp: Date.now()
      }));
      console.log('[API] Community data cached successfully');
    } catch (cacheError) {
      console.error('[API] Error caching community data:', cacheError);
      // Continue even if caching fails
    }
    
    return communityData;
  } catch (error) {
    console.error('Error getting community info:', error);
    
    // Try to return cached data even if expired as fallback
    try {
      const cacheKey = 'community_data';
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { data } = JSON.parse(cachedData);
        console.log('[API] Using expired community cache as fallback due to error');
        return data;
      }
    } catch (fallbackError) {
      console.error('[API] Error reading fallback community cache:', fallbackError);
    }
    
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

// Agent-related API functions
export const fetchAgents = async (category = 'All', filter = 'Hot & Now', page = 1, limit = 20) => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams({
      category: category !== 'All' ? category : '',
      filter,
      page,
      limit
    });
    
    const response = await fetch(`${API_URL}/api/agents?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader()
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching agents: ${response.status}`);
    }
    
    const data = await response.json();
    return data.agents || [];
  } catch (error) {
    console.error('Error fetching agents:', error);
    // Return mock data as fallback
    return generateMockAgents(limit);
  }
};

export const fetchFeaturedAgents = async (limit = 8) => {
  try {
    const response = await fetch(`${API_URL}/api/agents/featured?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching featured agents: ${response.status}`);
    }
    
    const data = await response.json();
    return data.agents || [];
  } catch (error) {
    console.error('Error fetching featured agents:', error);
    // Return fallback data for testing/display purposes
    return generateMockFeaturedAgents(limit);
  }
};

export const fetchWishlists = async () => {
  try {
    // In development environment, always use mock data to avoid 404 errors
    if (process.env.NODE_ENV === 'development') {
      console.log('Using mock wishlists data');
      return generateMockWishlists();
    }
    
    // In production, try to fetch from API first
    try {
      const response = await fetch(`${API_URL}/api/wishlists`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.log(`API fetch failed, falling back to mock data: ${error.message}`);
    }
    
    // Fallback to mock data if API fails
    return generateMockWishlists();
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    throw new Error(`Error fetching wishlists: ${error.message}`);
  }
};

export const toggleWishlist = async (agentId) => {
  try {
    const response = await fetch(`${API_URL}/api/wishlists/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader()
      },
      credentials: 'include',
      body: JSON.stringify({ agentId })
    });
    
    if (!response.ok) {
      throw new Error(`Error toggling wishlist: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    throw error;
  }
};

// Helper function to get auth header
const getAuthHeader = () => {
  const token = localStorage.getItem('authToken');
  return token ? `Bearer ${token}` : '';
};

// Mock data generators for development/testing
const generateMockFeaturedAgents = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `agent-${i}`,
    title: i === 0 ? 'CNC Discord Membership' : 
           i === 1 ? 'Leadership Training' : 
           i === 2 ? 'MDE.TV High-Roller Paywall' :
           i === 3 ? 'Trishonna\'s Worthy 30 Bundle' :
           i === 4 ? 'MacWhisper' :
           i === 5 ? 'Elite Traders Blueprint' :
           i === 6 ? 'Digital Marketing Suite' :
           `Agent ${i+1}`,
    price: i === 0 ? '$97 a month' : 
           i === 1 ? '$10 a month' : 
           i === 2 ? '$10+ a month' :
           i === 3 ? '$597' :
           i === 4 ? '$0' :
           i === 5 ? '$47' :
           `$${(Math.floor(Math.random() * 100) + 10)}`,
    image: `https://picsum.photos/300/200?random=${i+100}`,
    creator: {
      id: `creator-${i}`,
      name: i === 0 ? '168flyerchess' : 
            i === 1 ? 'Seth Hesh' : 
            i === 2 ? 'Seth Hesh' :
            i === 3 ? 'Trishonna' :
            i === 4 ? 'Jordi Bruin' :
            i === 5 ? 'Marketplace Creator' :
            `Creator ${i+1}`,
      avatar: `https://picsum.photos/50/50?random=${i+200}`
    },
    rating: {
      average: (4 + Math.random()).toFixed(1),
      count: Math.floor(Math.random() * 1000) + 10
    },
    description: `This is a description for agent ${i+1}. It showcases the agent's capabilities.`
  }));
};

const generateMockWishlists = () => {
  // Categories that might match user interests
  const categories = ['Design', 'Drawing & Painting', '3D', 'Self Improvement', 'Music & Sound Design', 'Software Development', 'Business'];
  
  // Create wishlists with more personalized names and items
  return [
    {
      id: 'wishlist-1',
      name: 'Essential Design Tools',
      category: 'Design',
      creator: {
        id: 'user-1',
        name: 'John Doe',
        avatar: 'https://picsum.photos/50/50?random=w1'
      },
      items: [
        {
          id: 'agent-101',
          name: 'Brand Designer Pro',
          imageUrl: 'https://picsum.photos/100/100?random=101'
        },
        {
          id: 'agent-102',
          name: 'UI Generator',
          imageUrl: 'https://picsum.photos/100/100?random=102'
        },
        {
          id: 'agent-103',
          name: 'Logo Creator',
          imageUrl: 'https://picsum.photos/100/100?random=103'
        }
      ]
    },
    {
      id: 'wishlist-2',
      name: 'AI Development Kit',
      category: 'Software Development',
      creator: {
        id: 'user-2',
        name: 'Jane Smith',
        avatar: 'https://picsum.photos/50/50?random=w2'
      },
      items: [
        {
          id: 'agent-201',
          name: 'Code Assistant',
          imageUrl: 'https://picsum.photos/100/100?random=201'
        },
        {
          id: 'agent-202',
          name: 'Bug Hunter',
          imageUrl: 'https://picsum.photos/100/100?random=202'
        },
        {
          id: 'agent-203',
          name: 'API Designer',
          imageUrl: 'https://picsum.photos/100/100?random=203'
        }
      ]
    },
    {
      id: 'wishlist-3',
      name: 'Creative Art Suite',
      category: 'Drawing & Painting',
      creator: {
        id: 'user-3',
        name: 'Alex Johnson',
        avatar: 'https://picsum.photos/50/50?random=w3'
      },
      items: [
        {
          id: 'agent-301',
          name: 'Digital Painter',
          imageUrl: 'https://picsum.photos/100/100?random=301'
        },
        {
          id: 'agent-302',
          name: 'Concept Art Generator',
          imageUrl: 'https://picsum.photos/100/100?random=302'
        },
        {
          id: 'agent-303',
          name: 'Character Designer',
          imageUrl: 'https://picsum.photos/100/100?random=303'
        }
      ]
    }
  ];
};

// Mock marketplace agents
const generateMockAgents = (count) => {
  const categories = ['Design', 'Drawing & Painting', '3D', 'Self Improvement', 'Music & Sound Design', 'Software Development', 'Business'];
  const agents = [
    {
      id: 'novabeast',
      title: 'Novabeast [VRChat Avatar]',
      price: '$25',
      image: 'https://via.placeholder.com/300x300?text=Novabeast',
      creator: {
        id: 'krittmatic',
        name: 'Krittmatic',
        avatar: 'https://via.placeholder.com/50x50?text=K'
      },
      rating: {
        average: 4.9,
        count: 141
      },
      category: '3D',
      isWishlisted: Math.random() > 0.5,
      isBestseller: true,
      description: 'A cybernetic avatar with stunning visuals and animations, perfect for VRChat.',
      name: 'Novabeast [VRChat Avatar]'
    },
    {
      id: 'consultations',
      title: 'Lifetime Consultations',
      price: '$2,500',
      image: 'https://via.placeholder.com/300x300?text=Consultations',
      creator: {
        id: 'daniel',
        name: 'Daniel Vassallo',
        avatar: 'https://via.placeholder.com/50x50?text=DV'
      },
      rating: {
        average: 5.0,
        count: 2
      },
      category: 'Business',
      isWishlisted: Math.random() > 0.5,
      description: 'Lifetime access to business consultations from an experienced entrepreneur.',
      name: 'Lifetime Consultations'
    },
    {
      id: 'resell',
      title: 'Exclusive All Suppliers Package + FREE Resell Guide!',
      price: '$29.99',
      image: 'https://via.placeholder.com/300x300?text=Resell',
      creator: {
        id: 'resell',
        name: 'ResellProVendors',
        avatar: 'https://via.placeholder.com/50x50?text=RP'
      },
      category: 'Business',
      isWishlisted: Math.random() > 0.5,
      isBestseller: true,
      description: 'Complete guide to finding suppliers and reselling products with high profit margins.',
      name: 'Exclusive All Suppliers Package'
    },
    {
      id: 'geoimgr',
      title: 'GeoImgr Pro Subscription',
      price: '$9.90 a month',
      image: 'https://via.placeholder.com/300x300?text=GeoImgr',
      creator: {
        id: 'geoimgr',
        name: 'GeoImgr',
        avatar: 'https://via.placeholder.com/50x50?text=GI'
      },
      rating: {
        average: 4.8,
        count: 141
      },
      category: 'Software Development',
      isWishlisted: Math.random() > 0.5,
      isNew: true,
      description: 'Professional image geotagging tool with advanced features for photographers.',
      name: 'GeoImgr Pro Subscription'
    }
  ];
  
  // Generate more agents if needed
  if (count > agents.length) {
    const more = Array.from({ length: count - agents.length }, (_, i) => {
      const title = `AI Agent ${i + agents.length + 1}`;
      const category = categories[Math.floor(Math.random() * categories.length)];
      return {
        id: `agent-${i + agents.length}`,
        title: title,
        name: title,
        price: `$${Math.floor(Math.random() * 100) + 10}${Math.random() > 0.7 ? ' a month' : ''}`,
        image: `https://via.placeholder.com/300x300?text=Agent+${i + agents.length + 1}`,
        creator: {
          id: `creator-${i + agents.length}`,
          name: `Creator ${i + agents.length + 1}`,
          avatar: `https://via.placeholder.com/50x50?text=C${i + agents.length + 1}`
        },
        rating: {
          average: (3 + Math.random() * 2).toFixed(1),
          count: Math.floor(Math.random() * 500) + 1
        },
        category: category,
        isWishlisted: Math.random() > 0.7,
        isBestseller: Math.random() > 0.8,
        isNew: Math.random() > 0.8,
        description: `This is a powerful AI agent that helps with ${category.toLowerCase()} tasks and projects.`
      };
    });
    
    return [...agents, ...more];
  }
  
  return agents.slice(0, count);
};

// Add agent to wishlist
export const addToWishlist = async (agentId) => {
  try {
    const response = await fetch(`${API_URL}/api/wishlists/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader()
      },
      credentials: 'include',
      body: JSON.stringify({ agentId })
    });
    
    if (!response.ok) {
      throw new Error(`Error adding to wishlist: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    // Simulate success for development
    return { success: true, message: 'Added to wishlist (mocked)' };
  }
};

// Remove agent from wishlist
export const removeFromWishlist = async (agentId) => {
  try {
    const response = await fetch(`${API_URL}/api/wishlists/remove/${agentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader()
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error removing from wishlist: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    // Simulate success for development
    return { success: true, message: 'Removed from wishlist (mocked)' };
  }
};

export default api;
