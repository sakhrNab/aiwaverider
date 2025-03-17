// src/utils/api.jsx

import axios from 'axios';
import firebase from 'firebase/compat/app';
import { auth } from '../utils/firebase';
import { toast as hotToast } from 'react-hot-toast'; // Import react-hot-toast

// Set API base URL from environment variable or default to localhost:4000
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

// Create axios instance with base URL and credentials
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Request interceptor for API calls
api.interceptors.request.use(
  async (config) => {
    // Log the request in a collapsed group for better console readability
    console.groupCollapsed(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    console.log('Request URL:', `${config.baseURL}${config.url}`);
    console.log('Request method:', config.method.toUpperCase());
    
    // Get the authentication token from localStorage or sessionStorage
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    // Set headers based on request type
    if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
      config.headers['Content-Type'] = 'application/json';
    }

    // If token exists, add it to headers
    if (token) {
      // Check if token already has Bearer prefix
      if (token.startsWith('Bearer ')) {
        config.headers['Authorization'] = token;
      } else {
        // Some APIs expect just the token, others expect "Bearer token"
        // Try with "Bearer " prefix - the backend should handle either format
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      console.log('Auth header set:', `${config.headers['Authorization'].substring(0, 15)}...`);
      
      // Add token debug info
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token exp:', new Date(tokenPayload.exp * 1000).toLocaleString());
        console.log('Token iat:', new Date(tokenPayload.iat * 1000).toLocaleString());
        const nowSeconds = Math.floor(Date.now() / 1000);
        const expiresInSeconds = tokenPayload.exp - nowSeconds;
        console.log(`Token expires in: ${expiresInSeconds}s (${Math.floor(expiresInSeconds / 60)}m ${expiresInSeconds % 60}s)`);
      } catch (e) {
        console.warn('Could not decode token for debug info');
      }
    } else {
      console.warn('No auth token found for request');
    }
    
    console.log('Request headers:', config.headers);
    if (config.data) {
      console.log('Request data:', config.data);
    }
    console.groupEnd();

    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check for token validation errors
    const isAuthError = error.response && (
      error.response.status === 401 || 
      (error.response.status === 400 && 
        (error.response.data?.message?.includes('token') || 
         error.response.data?.error?.includes('token') ||
         error.response.data?.message?.includes('Firebase ID token has no "kid" claim') ||
         (typeof error.response.data === 'string' && error.response.data.includes('token'))
        )
      )
    );
    
    // Handle authentication errors
    if (isAuthError && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.warn('Authentication error detected:', error.response?.data);
      
      // Clear token cache
      clearTokenCache();
      
      // Clear stored tokens
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      
      // Show notification to user
      try {
        // Use react-hot-toast for notification
        hotToast.error('Your session has expired. Please sign in again.', {
          duration: 6000,
          id: 'auth-error-toast', // Prevent duplicate toasts
        });
      } catch (notificationError) {
        console.error('Error showing notification:', notificationError);
        // Fallback to alert
        try {
          alert('Your session has expired. Please sign in again.');
        } catch (e) {
          // Silent fail if even alert doesn't work
          console.error('Failed to show authentication error alert:', e);
        }
      }
      
      // Sign out the user
      try {
        await auth.signOut();
        
        // Redirect to login page
        if (typeof window !== 'undefined') {
          // Small delay to allow notification to be seen
          setTimeout(() => {
            window.location.href = '/sign-in';
          }, 1500);
        }
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
        // Force redirect to login anyway
        if (typeof window !== 'undefined') {
          window.location.href = '/sign-in';
        }
      }
    }
    
    // For development: log error details
    if (process.env.NODE_ENV === 'development') {
      console.error('API Response Error:', {
        url: originalRequest.url,
        status: error.response?.status,
        data: error.response?.data
      });
    }
    
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

// Check network connectivity
const checkNetworkConnectivity = async () => {
  // First check if navigator.onLine is false, which is a quick but not always reliable check
  if (!navigator.onLine) {
    console.error('Network is offline according to navigator.onLine');
    return {
      online: false,
      error: 'Your device appears to be offline. Please check your internet connection.'
    };
  }
  
  // Try to fetch a small resource from Google to verify Google services are accessible
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return { online: true };
  } catch (error) {
    console.error('Network connectivity check failed:', error);
    
    // Determine the type of network error
    let errorMessage = 'Unable to connect to authentication services. ';
    
    if (error.name === 'AbortError') {
      errorMessage += 'The connection timed out. ';
    } else if (error.message && error.message.includes('ECONNREFUSED')) {
      errorMessage += 'Connection was refused. ';
    } else if (error.message && error.message.includes('ENOTFOUND')) {
      errorMessage += 'DNS lookup failed. ';
    }
    
    errorMessage += 'Please check your internet connection, firewall settings, or try using a different network.';
    
    return {
      online: false,
      error: errorMessage
    };
  }
};

// Sign In with Google
export const signInWithGoogle = async () => {
  try {
    console.log('Starting Google sign-in process');
    
    // Check network connectivity first
    const networkStatus = await checkNetworkConnectivity();
    if (!networkStatus.online) {
      console.error('Network connectivity issue detected before Google sign-in');
      return { 
        canceled: false,
        error: true,
        network: false,
        message: networkStatus.error
      };
    }
    
    const auth = firebase.auth();
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Add additional scopes as needed
    provider.addScope('profile');
    provider.addScope('email');
    
    // Sign in with popup
    const result = await auth.signInWithPopup(provider);
    
    // Get the user from the result
    const { user } = result;
    console.log('Google sign-in successful for user:', user.email);
    
    // Get the raw ID token directly from Firebase
    const idToken = await user.getIdToken(true);
    console.log('Got fresh ID token');
    
    // Store the token in localStorage for subsequent requests
    localStorage.setItem('authToken', idToken);
    console.log('Token stored in localStorage');
    
    // Send the token to your backend to verify and create/update the user
    try {
      // Use a direct fetch to avoid the axios interceptor for this initial verification
      const verifyResponse = await fetch('http://localhost:4000/api/auth/verify-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}` // Add the Bearer prefix
        },
        body: JSON.stringify({
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
          providerData: user.providerData
        })
      });
      
      // Log the request for debugging
      console.log('Sending verification request with auth header:', `Bearer ${idToken.substring(0, 10)}...`);
      
      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        let errorData;
        try {
          // Try to parse as JSON
          errorData = JSON.parse(errorText);
        } catch (e) {
          // If not JSON, use the text
          errorData = errorText;
        }
        console.error('Backend verification failed:', errorData);
        throw new Error(`Backend verification failed: ${verifyResponse.status} ${typeof errorData === 'object' ? JSON.stringify(errorData) : errorData}`);
      }
      
      const userData = await verifyResponse.json();
      console.log('User verified with backend:', userData);
      
      // Store user data to local storage for UI purposes
      localStorage.setItem('userProfile', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        ...userData
      }));
      
      return userData;
    } catch (verifyError) {
      console.error('Error verifying user with backend:', verifyError);
      
      // Even if backend verification fails, return the Firebase user
      // so the UI can show something
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isVerified: false,
        error: verifyError.message
      };
    }
  } catch (error) {
    // Check if the user closed the popup
    if (error.code === 'auth/popup-closed-by-user') {
      console.log('User closed the Google sign-in popup - this is a normal user action');
      // Return a specific object instead of throwing an error
      return { 
        canceled: true,
        code: 'auth/popup-closed-by-user',
        message: 'Sign-in canceled by user'
      };
    }
    
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
    console.log('Starting Microsoft sign-in process');
    
    // Check network connectivity first
    const networkStatus = await checkNetworkConnectivity();
    if (!networkStatus.online) {
      console.error('Network connectivity issue detected before Microsoft sign-in');
      return { 
        canceled: false,
        error: true,
        network: false,
        message: networkStatus.error
      };
    }
    
    const auth = firebase.auth();
    const provider = new firebase.auth.OAuthProvider('microsoft.com');
    
    // Sign in with popup
    const result = await auth.signInWithPopup(provider);
    
    // Get the user from the result
    const { user } = result;
    console.log('Microsoft sign-in successful for user:', user.email);
    
    // Get the raw ID token directly from Firebase
    const idToken = await user.getIdToken(true);
    console.log('Got fresh ID token');
    
    // Store the token in localStorage for subsequent requests
    localStorage.setItem('authToken', idToken);
    console.log('Token stored in localStorage');
    
    // Send the token to your backend to verify and create/update the user
    try {
      // Use a direct fetch to avoid the axios interceptor for this initial verification
      const verifyResponse = await fetch('http://localhost:4000/api/auth/verify-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}` // Add the Bearer prefix
        },
        body: JSON.stringify({
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
          providerData: user.providerData
        })
      });
      
      // Log the request for debugging
      console.log('Sending verification request with auth header:', `Bearer ${idToken.substring(0, 10)}...`);
      
      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        let errorData;
        try {
          // Try to parse as JSON
          errorData = JSON.parse(errorText);
        } catch (e) {
          // If not JSON, use the text
          errorData = errorText;
        }
        console.error('Backend verification failed:', errorData);
        throw new Error(`Backend verification failed: ${verifyResponse.status} ${typeof errorData === 'object' ? JSON.stringify(errorData) : errorData}`);
      }
      
      const userData = await verifyResponse.json();
      console.log('User verified with backend:', userData);
      
      // Store user data to local storage for UI purposes
      localStorage.setItem('userProfile', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        ...userData
      }));
      
      return userData;
    } catch (verifyError) {
      console.error('Error verifying user with backend:', verifyError);
      
      // Even if backend verification fails, return the Firebase user
      // so the UI can show something
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isVerified: false,
        error: verifyError.message
      };
    }
  } catch (error) {
    // Check if the user closed the popup
    if (error.code === 'auth/popup-closed-by-user') {
      console.log('User closed the Microsoft sign-in popup - this is a normal user action');
      // Return a specific object instead of throwing an error
      return { 
        canceled: true,
        code: 'auth/popup-closed-by-user',
        message: 'Sign-in canceled by user'
      };
    }
    
    console.error('Error signing in with Microsoft:', error);
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
    // Check for cached data
    const cacheKey = 'profile_data';
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        const cacheDuration = 30 * 60 * 1000; // 30 minutes
        
        if (cacheAge < cacheDuration) {
          console.log('[API] Using cached profile data', Math.round(cacheAge/1000) + 's old');
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

    // Use direct fetch instead of axios for better control
    const response = await fetch(`${API_URL}/api/profile`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': localStorage.getItem('authToken') ? 
          `Bearer ${localStorage.getItem('authToken')}` : ''
      }
    });
    
    // Check if response is valid JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Profile response is not JSON:', 
        contentType || 'no content-type header');
      
      // Get response text for debugging
      const responseText = await response.text();
      console.error('Response text (first 100 chars):', 
        responseText.substring(0, 100) + '...');
      
      // Try to return cached data even if expired as fallback
      if (cachedData) {
        try {
          const { data } = JSON.parse(cachedData);
          console.log('[API] Using expired cache as fallback due to non-JSON response');
          return data;
        } catch (fallbackError) {
          console.error('[API] Error reading fallback profile cache:', fallbackError);
        }
      }
      
      // If no cached data, create a minimal profile from Firebase user
      const firebaseUser = firebase.auth().currentUser;
      if (firebaseUser) {
        const mockProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        console.warn('[API] Using Firebase user data as profile fallback');
        return mockProfile;
      }
      
      // If all else fails, throw an error
      throw new Error('Could not get profile data');
    }
    
    // If we have a valid JSON response
    if (response.ok) {
      const profileData = await response.json();
      
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
    } else {
      throw new Error(`Failed to get profile: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error getting profile:', error);

    // Try to return cached data even if expired as fallback
    try {
      const cacheKey = 'profile_data';
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { data } = JSON.parse(cachedData);
        console.log('[API] Using expired profile cache as fallback due to error');
        return data;
      }
    } catch (fallbackError) {
      console.error('[API] Error reading fallback profile cache:', fallbackError);
    }

    throw error;
  }
};

export const updateProfile = async (profileData) => {
  try {
    console.log('Sending profile update request:', profileData);
    
    // Use direct fetch instead of api.put to have more control over the request
    const response = await fetch(`${API_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('authToken') ? 
          `Bearer ${localStorage.getItem('authToken')}` : ''
      },
      body: JSON.stringify(profileData)
    });
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Profile update response is not JSON:', 
        contentType || 'no content-type header');
      
      // Get the response text for debugging
      const responseText = await response.text();
      console.error('Response text (first 100 chars):', 
        responseText.substring(0, 100) + '...');
      
      // Return a mock success response for development
      console.warn('Using mock profile update response');
      return {
        ...profileData,
        updatedAt: new Date().toISOString()
      };
    }
    
    const data = await response.json();
    console.log('Profile update response:', data);
    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    
    // Return the original data as fallback
    return {
      ...profileData,
      updatedAt: new Date().toISOString(),
      error: error.message
    };
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

/**
 * Fetch agents with optional filtering
 * @param {string} category - Category filter
 * @param {string} filter - Sort filter (Hot & New, Top Rated, etc.)
 * @param {number} page - Page number for pagination
 * @param {number} limit - Number of items per page
 * @param {object} priceRange - Min and max price range
 * @param {number} rating - Minimum rating filter
 * @param {array} tags - Tags to filter by
 * @param {array} features - Features to filter by
 * @param {string} search - Search query
 */
export const fetchAgents = async (
  category = 'All',
  filter = 'Hot & Now',
  page = 1,
  limit = 20,
  priceRange = { min: 0, max: 1000 },
  rating = 0,
  tags = [],
  features = [],
  search = ''
) => {
  try {
    // Create query params for API
    const params = new URLSearchParams();
    params.append('category', category);
    params.append('filter', filter);
    params.append('page', page);
    params.append('limit', limit);
    
    // Add filter params
    if (priceRange?.min > 0) params.append('priceMin', priceRange.min);
    if (priceRange?.max < 1000) params.append('priceMax', priceRange.max);
    if (rating > 0) params.append('rating', rating);
    
    // Join arrays for API consumption
    if (tags && tags.length > 0) params.append('tags', tags.join(','));
    if (features && features.length > 0) params.append('features', features.join(','));
    if (search) params.append('search', search);
    
    console.log(`Fetching agents from API with params: ${params.toString()}`);
    
    // Fetch from backend API
    const response = await api.get(`/api/agents?${params.toString()}`);
    console.log('Successfully fetched agents from API:', response.data.agents.length);
    
    // Validate agents to ensure they exist and have valid IDs
    // This removes any potentially corrupted data that could cause errors
    const validAgents = response.data.agents.filter(agent => {
      return agent && agent.id && typeof agent.id === 'string';
    });
    
    if (validAgents.length !== response.data.agents.length) {
      console.warn(`Filtered out ${response.data.agents.length - validAgents.length} invalid agents from results`);
    }
    
    return validAgents;
  } catch (error) {
    console.error('Error fetching agents from API:', error);
    // Return empty array on error
    return [];
  }
};

/**
 * Fetch featured agents from the API
 */
export const fetchFeaturedAgents = async (limit = 8) => {
  try {
    console.log(`Fetching featured agents from API with limit: ${limit}`);
    const response = await api.get(`/api/agents/featured?limit=${limit}`);
    console.log('Successfully fetched featured agents from API:', response.data.agents.length);
    
    // Validate agents to ensure they exist and have valid IDs
    const validAgents = response.data.agents.filter(agent => {
      return agent && agent.id && typeof agent.id === 'string';
    });
    
    if (validAgents.length !== response.data.agents.length) {
      console.warn(`Filtered out ${response.data.agents.length - validAgents.length} invalid featured agents`);
    }
    
    return validAgents;
  } catch (error) {
    console.error('Error fetching featured agents from API:', error);
    // Return empty array on error
    return [];
  }
};

export const fetchWishlists = async () => {
  try {
    // Always attempt to fetch from the API
    console.log('Attempting to fetch wishlists from API');
    const response = await api.get('/api/wishlists');
    console.log('Successfully fetched wishlists from API:', response.data);
    return response.data.wishlists || [];
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    // Return empty array instead of falling back to mock data
    return [];
  }
};

export const fetchUserWishlists = async () => {
  try {
    const response = await api.get('/api/wishlists/user');
    return response.data.wishlists || [];
  } catch (error) {
    console.error('Error fetching user wishlists:', error);
    return [];
  }
};

export const fetchWishlistById = async (wishlistId) => {
  try {
    const response = await api.get(`/api/wishlists/${wishlistId}`);
    return response.data.wishlist;
  } catch (error) {
    console.error(`Error fetching wishlist ${wishlistId}:`, error);
    return null;
  }
};

export const toggleWishlist = async (agentId) => {
  try {
    const response = await api.post('/api/wishlists/toggle', { agentId });
    return response.data;
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    throw error;
  }
};

export const checkWishlistStatus = async (agentId) => {
  try {
    const response = await api.get(`/api/wishlists/check/${agentId}`);
    return response.data.isWishlisted;
  } catch (error) {
    console.error('Error checking wishlist status:', error);
    return false;
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
  // Categories that might match the ones in the filter
  const categories = ['All', 'Design', 'Drawing & Painting', '3D', 'Self Improvement', 
    'Music & Sound Design', 'Software Development', 'Business'];
  
  // Create consistent price formats - either numbers or properly formatted strings
  const createPrice = (index) => {
    // Make 20% of agents free
    if (index % 5 === 0) {
      return 0; // Numeric 0 for free agents
    }
    
    // Subscription agents (10%)
    if (index % 10 === 3) {
      const price = 5 + Math.floor(Math.random() * 20); // $5-$25 range
      return `$${price}/month`;
    }
    
    // Regular priced agents (70%)
    const price = 5 + Math.floor(Math.random() * 95); // $5-$100 range
    return price; // Return as a number for consistency
  };

  return Array(count).fill().map((_, i) => {
    // Generate the price first so we can use it for isFree
    const price = createPrice(i);
    const isFree = price === 0 || price === '0' || price === 'Free' || price === '$0';
    const isNew = Math.random() > 0.9;
    const isBestseller = Math.random() > 0.85;
    
    // Generate random dates for sorting and filtering
    const monthsAgo = Math.floor(Math.random() * 18);
    const createdDate = new Date(Date.now() - (monthsAgo * 30 * 24 * 60 * 60 * 1000));
    
    // Features and tags
    const features = ['API Access', 'Customizable', 'Mobile Compatible'].slice(0, Math.floor(Math.random() * 3) + 1);
    const tags = ['AI', 'Productivity', 'Assistant'].slice(0, Math.floor(Math.random() * 3) + 1);
    
    // Calculate popularity for "Hot & Now" filter
    const basePopularity = Math.floor(Math.random() * 70) + 1;
    const newBonus = isNew ? 15 : 0;
    const bestsellerBonus = isBestseller ? 20 : 0;
    const popularity = Math.min(100, basePopularity + newBonus + bestsellerBonus);
    
    return {
      id: `agent-${i+1}`,
      title: `AI Agent ${i+1}`,
      name: `Agent ${i+1}`,
      price: price,
      isFree: isFree, // Explicit property for filtering
      imageUrl: `https://picsum.photos/300/200?random=${i+100}`,
      isWishlisted: Math.random() > 0.8,
      isBestseller: isBestseller,
      isNew: isNew,
      category: categories[Math.floor(Math.random() * categories.length)],
      // Optional popularity score for trending sort (1-100)
      popularity: popularity,
      // Tags and features for filtering
      tags: tags,
      features: features,
      // Dates for filtering by newest
      createdAt: createdDate,
      dateCreated: createdDate.toISOString(),
      updatedAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
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
    };
  });
};

// Add agent to wishlist
export const addToWishlist = async (agentId) => {
  try {
    // We're now using the toggle endpoint for both adding and removing
    const response = await api.post('/api/wishlists/toggle', { agentId });
    return response.data;
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    throw error;
  }
};

// Remove agent from wishlist
export const removeFromWishlist = async (agentId) => {
  try {
    // We're now using the toggle endpoint for both adding and removing
    const response = await api.post('/api/wishlists/toggle', { agentId });
    return response.data;
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    throw error;
  }
};

// Create a new wishlist
export const createWishlist = async (wishlistData) => {
  try {
    const response = await api.post('/api/wishlists', wishlistData);
    return response.data;
  } catch (error) {
    console.error('Error creating wishlist:', error);
    throw error;
  }
};

// Update a wishlist
export const updateWishlist = async (wishlistId, wishlistData) => {
  try {
    const response = await api.put(`/api/wishlists/${wishlistId}`, wishlistData);
    return response.data;
  } catch (error) {
    console.error('Error updating wishlist:', error);
    throw error;
  }
};

// Delete a wishlist
export const deleteWishlist = async (wishlistId) => {
  try {
    const response = await api.delete(`/api/wishlists/${wishlistId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting wishlist:', error);
    throw error;
  }
};

/**
 * Check if the backend API is accessible
 * @returns {Promise<{isOnline: boolean, status: number, message: string}>} Status of the API
 */
export const checkApiStatus = async () => {
  try {
    console.log(`Checking API status at ${API_URL}/api/health`);
    
    // Make a simple GET request to the status endpoint
    const response = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`API status response: ${response.status}`);
    
    if (response.ok) {
      return {
        isOnline: true,
        status: response.status,
        message: 'API is online and working correctly'
      };
    }
    
    // If not OK, try to get more details
    let message = `API returned status ${response.status}`;
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch (e) {
      // Not JSON or couldn't parse
    }
    
    return {
      isOnline: false,
      status: response.status,
      message
    };
  } catch (error) {
    console.error('Error checking API status:', error);
    return {
      isOnline: false,
      status: 0,
      message: `API is unreachable: ${error.message}`
    };
  }
};

/**
 * Fetch a single agent by ID from the backend API
 * @param {string} agentId - The ID of the agent to fetch
 * @returns {Promise<Object>} - Agent data
 */
export const fetchAgentById = async (agentId) => {
  try {
    console.log(`Attempting to fetch agent with ID: ${agentId}`);
    
    // Validate agent ID format
    if (!agentId || typeof agentId !== 'string') {
      console.error('Invalid agent ID format:', agentId);
      throw new Error('Invalid agent ID format');
    }
    
    // Special handling for different ID formats
    
    // 1. Detect Firebase-style document IDs (typically 20+ chars, alphanumeric)
    const isFirebaseId = /^[a-zA-Z0-9]{20,}$/.test(agentId);
    
    // 2. Detect standard agent-XX format
    const isStandardAgentId = /^agent-\d+$/.test(agentId);
    
    // Default endpoint uses the ID directly
    let endpoint = `/api/agents/${agentId}`;
    
    if (isFirebaseId) {
      console.log('Detected Firebase-style document ID, using doc endpoint');
      endpoint = `/api/agents/doc/${agentId}`;
    } else if (isStandardAgentId) {
      console.log('Detected standard agent-XX format ID, using specific route');
      // For agent-XX format, just use it directly
      // The backend has a special route to handle this format
      // No need to modify the endpoint
    }
    
    try {
      // Make the API request
      console.log(`Making request to: ${endpoint}`);
      const response = await api.get(endpoint);
      console.log('Successfully fetched agent from API');
      
      if (response.data && response.data.data) {
        // Format and return the agent data
        return {
          ...response.data.data,
          // Ensure the rating is formatted correctly
          rating: {
            average: response.data.data.averageRating || 0,
            count: response.data.data.reviewCount || 0
          }
        };
      } else if (response.data) {
        // Some APIs might return the data directly
        return response.data;
      }
      
      throw new Error('Invalid response structure from API');
    } catch (apiError) {
      // Handle specific error cases
      if (apiError.response && apiError.response.status === 400) {
        console.error(`API returned 400 Bad Request for agent ID: ${agentId}`);
        console.error('Error response:', apiError.response.data);
        throw new Error(`Agent with ID "${agentId}" not found. It may have been removed or doesn't exist.`);
      }
      
      // Handle 404 errors specifically for product paths
      if (apiError.response && apiError.response.status === 404) {
        console.error(`API returned 404 Not Found for agent ID: ${agentId}`);
        console.log('Attempting fallback route for product ID...');
        
        // Try the alternate endpoint to see if it works
        try {
          const fallbackResponse = await api.get(`/api/product/${agentId}`);
          if (fallbackResponse.data) {
            console.log('Successfully fetched agent from fallback product endpoint');
            return fallbackResponse.data;
          }
        } catch (fallbackError) {
          console.error('Fallback route also failed:', fallbackError);
          // Continue with original error
        }
      }
      
      // Re-throw other errors
      throw apiError;
    }
  } catch (error) {
    console.error('Error fetching agent from API:', error);
    
    // Throw the error to be handled by the component
    throw error;
  }
};

// =================================================================
// User Management API Functions
// =================================================================

/**
 * Fetch users with pagination
 * @param {number} page - Page number (starts from 1)
 * @param {number} limit - Number of users per page
 * @param {string} search - Search query for filtering users
 * @param {string} sortBy - Field to sort by
 * @param {string} sortDirection - Sort direction (asc or desc)
 * @returns {Promise<Object>} - Users data with pagination info
 */
export const fetchUsers = async (page = 1, limit = 10, search = '', sortBy = 'createdAt', sortDirection = 'desc') => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    
    if (search) params.append('search', search);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortDirection) params.append('sortDirection', sortDirection);
    
    console.log(`[API] Fetching users with params: ${params.toString()}`);
    
    const response = await api.get(`/api/users?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Get a single user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User data
 */
export const getUserById = async (userId) => {
  try {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting user with ID ${userId}:`, error);
    throw error;
  }
};

/**
 * Create a new user
 * @param {Object} userData - User data to create
 * @returns {Promise<Object>} - Created user data
 */
export const createUser = async (userData) => {
  try {
    const response = await api.post('/api/users', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update an existing user
 * @param {string} userId - User ID
 * @param {Object} userData - User data to update
 * @returns {Promise<Object>} - Updated user data
 */
export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`/api/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error(`Error updating user with ID ${userId}:`, error);
    throw error;
  }
};

/**
 * Delete a user
 * @param {string} userId - User ID to delete
 * @returns {Promise<Object>} - Response data
 */
export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting user with ID ${userId}:`, error);
    throw error;
  }
};

/**
 * Get download count for an agent
 */
export const getDownloadCount = async (agentId) => {
  try {
    const response = await api.get(`/api/agents/${agentId}/downloads`);
    return response.data.downloads;
  } catch (error) {
    console.error('Error getting download count:', error);
    // Fallback to a default to prevent UI breaking
    return 0;
  }
};

/**
 * Increment download count for an agent
 */
export const incrementDownloadCount = async (agentId) => {
  try {
    const response = await api.post(`/api/agents/${agentId}/downloads`);
    return response.data;
  } catch (error) {
    console.error('Error incrementing download count:', error);
    throw error;
  }
};

export default api;
