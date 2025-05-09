// src/utils/api.jsx

import axios from 'axios';
import firebase from 'firebase/compat/app';
import { auth } from '../utils/firebase';
import { toast as hotToast } from 'react-hot-toast'; // Import react-hot-toast
import { db } from '../utils/firebase';
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
// Remove import from agentUtils as it doesn't exist
// import { 
//   getAgentDownloadCount as getDownloadCountUtil,
//   incrementAgentDownloadCount as incrementDownloadCountUtil,
//   recordAgentDownload as recordDownloadUtil
// } from './agentUtils';
// import { debounce } from 'lodash';

// Remove direct import of useAgentStore to avoid React hooks usage outside of components
// import useAgentStore from '../store/agentStore';

// Set API base URL from environment variable or default to localhost:4000
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Add token caching
let cachedToken = null;
let tokenExpirationTime = null;

// Helper function to safely access agentStore
const refreshAgentStore = async () => {
  try {
    // Dynamically import to avoid hook usage outside of components
    const { default: agentStore } = await import('../store/agentStore');
    await agentStore.getState().refreshAfterMutation();
  } catch (error) {
    console.error('Error refreshing agent store:', error);
  }
};

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
    // Create user in Firebase Authentication
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
    
    console.log('Sending user data to backend:', backendUserData);
    
    // Send user data to backend and wait for response
    const response = await api.post('/api/auth/signup', backendUserData);
    
    console.log('Backend signup response:', response.data);
    
    // Wait a moment to ensure the data is saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Refresh the ID token to ensure server can properly authenticate subsequent requests
    const token = await firebaseUser.getIdToken(true);
    localStorage.setItem('authToken', token);
    
    return { user: firebaseUser, backendResponse: response.data };
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
    
    // Add this line to force account selection dialog
    provider.setCustomParameters({ prompt: 'select_account' });
    
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
      const verifyResponse = await fetch(`${API_URL}/api/auth/verify-user`, {
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
    const user = result.user;
    
    if (!user) {
      throw new Error('No user data returned from Google Sign-Up');
    }
    
    // Get profile image URL from Google
    const photoURL = user.photoURL;
    
    // Extract first and last name from displayName
    const firstName = user.displayName?.split(' ')[0] || '';
    const lastName = user.displayName?.split(' ').slice(1).join(' ') || '';
    
    // Prepare user data for backend
    const userData = {
      uid: user.uid,
      email: user.email,
      username: `user_${user.uid.slice(0, 8)}`,
      firstName: firstName,
      lastName: lastName,
      displayName: user.displayName,
      photoURL: photoURL,
      provider: 'google'
    };
    
    console.log('Sending Google user data to backend:', userData);
    
    // Send user data to backend and wait for response
    const response = await api.post('/api/auth/signup', userData);
    console.log('Backend signup response for Google user:', response.data);
    
    // Wait a moment to ensure the data is saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Refresh the ID token
    const token = await user.getIdToken(true);
    localStorage.setItem('authToken', token);
    
    return { 
      firebaseUser: user,
      photoURL,
      backendResponse: response.data
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
      const verifyResponse = await fetch(`${API_URL}/api/auth/verify-user`, {
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

// =================================================================
// Profile API Functions (Using '/api/profile' as the base path)
// =================================================================

export const getProfile = async () => {
  try {
    // Check for cached data
    const cacheKey = 'profile_data';
    const cachedData = localStorage.getItem(cacheKey);
    let cachedProfile = null;

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
          // Save the cached data for potential fallback
          cachedProfile = data;
        }
      } catch (cacheError) {
        console.error('[API] Error parsing cached profile data:', cacheError);
        // Continue to fetch fresh data
      }
    } else {
      console.log('[API] No profile cache found, fetching fresh data');
    }

    // Use direct fetch with timeout instead of axios for better control
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Authorization': localStorage.getItem('authToken') ? 
            `Bearer ${localStorage.getItem('authToken')}` : ''
        }
      });
      
      clearTimeout(timeoutId);
      
      // Check if response is valid JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Profile response is not JSON:', 
          contentType || 'no content-type header');
        
        // Fall back to cached data if available
        if (cachedProfile) {
          console.log('[API] Using expired cache as fallback due to non-JSON response');
          return cachedProfile;
        }
        
        // If no cached data, create a minimal profile from Firebase user
        const firebaseUser = firebase.auth().currentUser;
        if (firebaseUser) {
          const mockProfile = createMockProfileFromFirebase(firebaseUser);
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
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Handle timeout or network errors
      if (fetchError.name === 'AbortError') {
        console.warn('[API] Profile request timed out');
      } else {
        console.error('[API] Fetch error:', fetchError);
      }
      
      // Use cached data if available
      if (cachedProfile) {
        console.log('[API] Using cached profile as fallback');
        return cachedProfile;
      }
      
      // Try to create a profile from Firebase user
      const firebaseUser = firebase.auth().currentUser;
      if (firebaseUser) {
        console.warn('[API] Using Firebase user data as profile fallback');
        return createMockProfileFromFirebase(firebaseUser);
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Error getting profile:', error);

    // Try to return cached data as fallback
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

    // Create a minimal mock profile if all else fails
    return {
      uid: firebase.auth().currentUser?.uid || 'unknown',
      displayName: firebase.auth().currentUser?.displayName || 'Guest User',
      email: firebase.auth().currentUser?.email || 'guest@example.com',
      photoURL: firebase.auth().currentUser?.photoURL || '/default-avatar.png',
      createdAt: new Date().toISOString(),
      isOfflineProfile: true
    };
  }
};

// Helper function to create a mock profile from Firebase user
const createMockProfileFromFirebase = (firebaseUser) => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
    photoURL: firebaseUser.photoURL || '/default-avatar.png',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isOfflineProfile: true
  };
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

// Add this at the top of the file where other imports are
// import { debounce } from 'lodash';

// Add a request cache
const requestCache = new Map();
const pendingRequests = new Map();

// Cache expiration time - 5 minutes (in milliseconds)
const CACHE_EXPIRY = 5 * 60 * 1000;

// Add this helper function before the fetchAgents export
const createCacheKey = (params) => {
  return params.toString();
};

// These throttling mechanisms are redundant with our interceptors at the top
// Request throttling mechanism
const requestThrottleDelay = 2000; // 2 seconds minimum between requests
let lastRequestTime = 0;
let inProgressRequests = {};
const apiCache = new Map();
const cacheTTL = 30 * 60 * 1000; // 30 minutes cache

// Helper function to throttle requests
// const throttleRequest = async (key) => {
//   const now = Date.now();
//   const timeElapsed = now - lastRequestTime;
  
//   // If there's already an identical request in progress, wait for it to complete
//   if (inProgressRequests[key]) {
//     console.log(`Identical request in progress for ${key}, reusing the result`);
//     return inProgressRequests[key];
//   }
  
//   // Check cache first
//   if (apiCache.has(key)) {
//     const cacheEntry = apiCache.get(key);
//     if (now - cacheEntry.timestamp < cacheTTL) {
//       console.log(`Using cached response for ${key}`);
//       return cacheEntry.data;
//     } else {
//       console.log(`Cache expired for ${key}`);
//       apiCache.delete(key);
//     }
//   }
  
//   // If we need to throttle, wait
//   if (timeElapsed < requestThrottleDelay) {
//     const delayNeeded = requestThrottleDelay - timeElapsed;
//     console.log(`Throttling request for ${delayNeeded}ms`);
//     await new Promise(resolve => setTimeout(resolve, delayNeeded));
//   }
  
//   // Update the last request time
//   lastRequestTime = Date.now();
//   return null; // No cache hit, proceed with request
// };

// Helper function to store response in cache
// const cacheResponse = (key, data) => {
//   if (data && typeof data === 'object') {
//     console.log(`Caching response for ${key}`);
//     apiCache.set(key, {
//       data: structuredClone(data),
//       timestamp: Date.now()
//     });
//   }
// };

/**
 * Fetch agents from the API with caching and request deduplication
 */
export const fetchAgents = async (
  category = 'All',
  filter = 'Hot & Now',
  page = 1,
  options = {}
) => {
  try {
    // Extract options or use defaults
    const {
      limit = 20,
      priceRange = { min: 0, max: 1000 },
      rating = 0,
      tags = [],
      features = [],
      search = '',
      timestamp = Date.now(), // Add timestamp for cache busting
      bypassCache = false
    } = options;
    
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
    
    // Add timestamp for cache busting only if bypassCache is true
    if (bypassCache) {
      params.append('_t', timestamp);
    }
    
    // Create a cache key from the params
    const cacheKey = createCacheKey(params);
    
    // Check if we already have a cached response that's not expired
    if (!bypassCache && requestCache.has(cacheKey)) {
      const { data, expiry } = requestCache.get(cacheKey);
      if (expiry > Date.now()) {
        console.log('Using cached agents data:', data.length, 'agents');
        return data;
      } else {
        // Remove expired cache entry
        requestCache.delete(cacheKey);
      }
    }
    
    // Check if there's already a request in flight for this exact query
    if (pendingRequests.has(cacheKey)) {
      console.log('Request already in flight, waiting for existing request to complete');
      return pendingRequests.get(cacheKey);
    }
    
    // Create the promise for this request
    console.log(`Fetching agents from API with params: ${params.toString()}`);
    
    // Create promise for the API request
    const requestPromise = (async () => {
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
      
      // Cache the valid response data
      requestCache.set(cacheKey, {
        data: validAgents,
        expiry: Date.now() + CACHE_EXPIRY
      });
      
      // Remove from pending requests
      pendingRequests.delete(cacheKey);
      
      return validAgents;
    })();
    
    // Store the promise in pending requests map
    pendingRequests.set(cacheKey, requestPromise);
    
    // Return the promise
    return requestPromise;
  } catch (error) {
    console.error('Error fetching agents from API:', error);
    // Return empty array on error
    return [];
  }
};

/**
 * Fetch featured agents from the API
 * @param {number} limit - Number of featured agents to return
 * @param {object} options - Additional options including timestamp for cache busting
 */
export const fetchFeaturedAgents = async (limit = 8, options = {}) => {
  try {
    const { forceRefresh = false } = options;
    
    // Always use the store data instead of making an API call
    try {
      // Dynamically import to avoid circular dependencies
      const { default: agentStore } = await import('../store/agentStore');
      const store = agentStore.getState();
      
      // If the store doesn't have data yet or we need a refresh, load it
      if (forceRefresh || !store.lastLoadTime || store.allAgents.length === 0) {
        console.log('Store data not available or refresh requested, loading data...');
        await store.loadInitialData(forceRefresh);
        
        // Get updated store state after loading
        const updatedStore = agentStore.getState();
        console.log('Using featured agents from freshly loaded store data');
        return updatedStore.getFeaturedAgents(limit);
      }
      
      // Use the store's method to get featured agents
      console.log('Using featured agents from store');
      return store.getFeaturedAgents(limit);
    } catch (storeError) {
      console.error('Failed to get featured agents from store:', storeError);
      // Return empty array rather than making a direct API call
      // This ensures we aren't making redundant calls bypassing the store
      console.warn('Returning empty array instead of making direct API call');
      return [];
    }
  } catch (error) {
    console.error('Error in fetchFeaturedAgents:', error);
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

// export const checkWishlistStatus = async (agentId) => {
//   try {
//     const response = await api.get(`/api/wishlists/check/${agentId}`);
//     return response.data.isWishlisted;
//   } catch (error) {
//     console.error('Error checking wishlist status:', error);
//     return false;
//   }
// };

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
 * Fetch a single agent by its ID
 * @param {string} agentId - The ID of the agent to fetch
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} The agent data
 */
export const fetchAgentById = async (agentId, options = {}) => {
  const { skipCache = false, signal, forceCache = false } = options;
  console.log(`Fetching agent by ID: ${agentId}, skipCache: ${skipCache}, forceCache: ${forceCache}`);
  
  // Generate a cache key for this specific agent
  const cacheKey = `agent_${agentId}`;
  
  // Force cache option for fallback scenarios
  if (forceCache) {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const { data } = JSON.parse(cachedData);
        console.log(`Using cached agent data for ${agentId} with forceCache option`);
        return data;
      } catch (err) {
        console.warn('Error parsing forced cached agent data:', err);
        throw new Error('No valid cached data available');
      }
    } else {
      throw new Error('No cached data available');
    }
  }
  
  // Return from cache if available and not skipping cache
  if (!skipCache) {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        
        // Use cache if it's less than 30 minutes old (1800000 ms)
        if (cacheAge < 1800000) {
          console.log(`Using cached agent data for ${agentId}, cache age: ${Math.round(cacheAge / 1000)} seconds`);
          return data;
        } else {
          console.log(`Cached agent data for ${agentId} is too old (${Math.round(cacheAge / 1000)} seconds), fetching fresh data`);
        }
      } catch (err) {
        console.warn('Error parsing cached agent data:', err);
        // Continue to fetch from API if cache parsing fails
      }
    }
  }

  try {
    // Create a custom AbortController if one wasn't provided
    const abortController = signal ? null : new AbortController();
    const requestSignal = signal || (abortController?.signal);
    
    // Set a timeout for the request (20 seconds)
    const timeoutId = abortController ? 
      setTimeout(() => {
        abortController.abort('Request timeout after 20s');
      }, 20000) : null;
    
    console.log(`Making API request for agent ${agentId}`, { hasSignal: !!requestSignal });
    
    // Make the API request with the abort signal
    const response = await api.get(`/api/agents/${agentId}`, { 
      signal: requestSignal,
      timeout: 20000,  // Add direct timeout option
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });
    
    // Clear the timeout
    if (timeoutId) clearTimeout(timeoutId);
    
    if (!response || !response.data) {
      throw new Error('Invalid response from API - no data returned');
    }
    
    // Handle successful response
    const agentData = response.data;
    
    // Process image URLs
    const processedData = processAgentImageUrls(agentData);
    
    // Cache the fresh data
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: processedData,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn('Error caching agent data:', err);
      // Continue even if caching fails
    }
    
    return processedData;
  } catch (error) {
    // Handle different types of errors
    if (error.code === 'ERR_CANCELED' || error.name === 'AbortError' || 
        (error.message && (error.message.includes('aborted') || error.message.includes('canceled')))) {
      console.warn(`API fetch aborted for agent ${agentId}: ${error.message || 'Request was canceled'}`);
      
      // If aborted, try to use cache regardless of age
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const { data } = JSON.parse(cachedData);
          console.log(`Using cached data as fallback for aborted request: ${agentId}`);
          return processAgentImageUrls(data);
        } catch (parseErr) {
          console.error('Error parsing cached agent data during abort fallback:', parseErr);
        }
      }
      
      // Create a minimal agent object if no cache is available
      return {
        id: agentId,
        title: `Agent ${agentId}`,
        description: 'Agent data temporarily unavailable. Please try again later.',
        price: 0,
        isFree: true,
        imageUrl: `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"%3E%3Crect width="300" height="200" fill="%233498db"/%3E%3Ctext x="150" y="100" font-family="Arial" font-size="16" text-anchor="middle" dominant-baseline="middle" fill="white"%3EAgent ${agentId}%3C/text%3E%3C/svg%3E`,
        _fromCacheFailure: true
      };
    }
    
    // Handle 404 errors
    if (error.response && error.response.status === 404) {
      console.error(`Agent with ID ${agentId} not found`);
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Handle network errors
    if (error.code === 'ERR_NETWORK' || !error.response) {
      console.error(`Network error fetching agent ${agentId}:`, error);
      
      // Check for cached data
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const { data } = JSON.parse(cachedData);
          console.log(`Using cached data as fallback for network error: ${agentId}`);
          return processAgentImageUrls(data);
        } catch (parseErr) {
          console.error('Error parsing cached agent data during network error fallback:', parseErr);
        }
      }
      
      throw new Error(`Network error: ${error.message || 'Unable to connect to the server'}`);
    }
    
    // Handle other errors
    console.error(`Error fetching agent with ID ${agentId}:`, error);
    throw error;
  }
};

// Helper function to process and ensure all image URLs are properly extracted
const processAgentImageUrls = (agent) => {
  if (!agent) return agent;
  
  const processedAgent = { ...agent };
  
  // Extract main image URL if not already present
  if (!processedAgent.imageUrl) {
    console.log('Processing image URLs for agent');
    
    // Check if image is in the image object
    if (processedAgent.image && processedAgent.image.url) {
      console.log('Adding image.url');
      processedAgent.imageUrl = processedAgent.image.url;
    }
    
    // Check if image is in images array
    if (!processedAgent.imageUrl && processedAgent.images && processedAgent.images.length > 0) {
      console.log('Adding from images array');
      processedAgent.imageUrl = processedAgent.images[0];
    }
    
    // Check if image is in gallery
    if (!processedAgent.imageUrl && processedAgent.gallery && processedAgent.gallery.length > 0) {
      console.log('Adding from gallery');
      const galleryItem = processedAgent.gallery[0];
      if (typeof galleryItem === 'string') {
        processedAgent.imageUrl = galleryItem;
      } else if (galleryItem && galleryItem.url) {
        processedAgent.imageUrl = galleryItem.url;
      }
    }
    
    // Check for iconUrl as fallback
    if (!processedAgent.imageUrl && processedAgent.iconUrl) {
      console.log('Adding iconUrl as fallback');
      processedAgent.imageUrl = processedAgent.iconUrl;
    }
    
    // Create a placeholder if no image is found
    if (!processedAgent.imageUrl) {
      console.log('Creating placeholder image');
      const title = processedAgent.title || processedAgent.name || 'Agent';
      processedAgent.imageUrl = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"%3E%3Crect width="300" height="200" fill="%233498db"/%3E%3Ctext x="150" y="100" font-family="Arial" font-size="16" text-anchor="middle" dominant-baseline="middle" fill="white"%3E${encodeURIComponent(title)}%3C/text%3E%3C/svg%3E`;
    }
  }
  
  // Ensure we have an images array
  if (!processedAgent.images || !Array.isArray(processedAgent.images)) {
    processedAgent.images = [];
  }
  
  // Add the main image to the images array if it's not already there
  if (processedAgent.imageUrl && !processedAgent.images.includes(processedAgent.imageUrl)) {
    processedAgent.images.unshift(processedAgent.imageUrl);
  }
  
  // Add gallery images to the images array if available
  if (processedAgent.gallery && Array.isArray(processedAgent.gallery)) {
    processedAgent.gallery.forEach(item => {
      const galleryUrl = typeof item === 'string' ? item : (item && item.url);
      if (galleryUrl && !processedAgent.images.includes(galleryUrl)) {
        processedAgent.images.push(galleryUrl);
      }
    });
  }
  
  // Add icon to the images array if available
  if (processedAgent.iconUrl && !processedAgent.images.includes(processedAgent.iconUrl)) {
    processedAgent.images.push(processedAgent.iconUrl);
  }
  
  return processedAgent;
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
 * Get download count for an agent with optimized fallback strategy
 * @param {string} agentId - The ID of the agent
 * @param {Object} [agentData] - Optional agent data if already available
 * @returns {Promise<number>} The download count
 */
export const getAgentDownloadCount = async (agentId, agentData = null) => {
  try {
    // Step 1: Use provided data if available (most efficient)
    if (agentData && typeof agentData.downloadCount === 'number') {
      return agentData.downloadCount;
    }
    
    // Step 2: Attempt API call
    try {
      const response = await fetch(`${API_URL}/api/agents/${agentId}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.downloadCount || 0;
      }
    } catch (apiError) {
      // Continue to fallback - no need to log warning as this is expected sometimes
    }
    
    // Step 3: Firebase fallback for authenticated users
    const user = auth.currentUser;
    if (user) {
      try {
        const agentRef = doc(db, 'agents', agentId);
        const agentSnap = await getDoc(agentRef);
        
        if (agentSnap.exists()) {
          return agentSnap.data().downloadCount || 0;
        }
      } catch (firebaseError) {
        // Silently continue to final fallback
      }
    }
    
    // Final fallback
    return 0;
  } catch (error) {
    console.error('Error in getAgentDownloadCount:', error);
    return 0;
  }
};

/**
 * Increment download count for an agent with fallback strategy
 * @param {string} agentId - The ID of the agent
 * @returns {Promise<Object>} Response object with success status
 */
export const incrementAgentDownloadCount = async (agentId) => {
  try {
    // Step 1: Try REST API first (preferred method)
    try {
      let headers = { 'Content-Type': 'application/json' };
      const user = auth.currentUser;
      
      if (user) {
        const idToken = await user.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      }
      
      const response = await fetch(`${API_URL}/api/agents/${agentId}/increment-downloads`, {
        method: 'POST',
        headers
      });
      
      if (response.ok) {
        return { success: true, source: 'api' };
      }
    } catch (apiError) {
      // Continue to fallback - no need to log warning
    }
    
    // Step 2: Firebase fallback for authenticated users
    const user = auth.currentUser;
    if (user) {
      try {
        const agentRef = doc(db, 'agents', agentId);
        await updateDoc(agentRef, {
          downloadCount: increment(1)
        });
        
        return { success: true, source: 'firebase' };
      } catch (firebaseError) {
        console.warn('Firebase fallback failed:', firebaseError.message);
        // Continue to final fallback
      }
    }
    
    // Step 3: Final fallback (silent success for unauthenticated users)
    return { success: true, source: 'none' };
  } catch (error) {
    console.error('Error in incrementAgentDownloadCount:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Record that user has downloaded an agent
 * @param {string} agentId - The ID of the agent
 * @returns {Promise<Object>} - The response indicating success/failure
 */
export const recordAgentDownload = async (agentId) => {
  try {
    // First increment the download count
    await incrementAgentDownloadCount(agentId);
    
    // Then record the download in user's history if authenticated
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        
        const response = await fetch(`${API_URL}/api/agents/${agentId}/download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (apiError) {
        // Silently continue if API fails
        console.warn('Could not record download in user history:', apiError.message);
      }
    }
    
    return { success: true, message: 'Download count updated' };
  } catch (error) {
    console.error('Error in recordAgentDownload:', error);
    // Still return success to not interrupt the download flow for the user
    return { success: true, message: 'Download processed' };
  }
};

// AI Tools API Functions
export const fetchAITools = async () => {
  try {
    const response = await api.get('/api/ai-tools');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching AI tools:', error);
    throw error;
  }
};

export const fetchAIToolById = async (id) => {
  try {
    const response = await api.get(`/api/ai-tools/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching AI tool ${id}:`, error);
    throw error;
  }
};

export const createAITool = async (toolData, imageFile) => {
  try {
    let formData = new FormData();
    
    // Add tool data as JSON
    formData.append('data', JSON.stringify(toolData));
    
    // Add image file if present
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    const response = await api.post('/api/ai-tools', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Error creating AI tool:', error);
    throw error;
  }
};

export const updateAITool = async (id, toolData, imageFile) => {
  try {
    let formData = new FormData();
    
    // Add tool data as JSON
    formData.append('data', JSON.stringify(toolData));
    
    // Add image file if present
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    const response = await api.put(`/api/ai-tools/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error(`Error updating AI tool ${id}:`, error);
    throw error;
  }
};

export const deleteAITool = async (id) => {
  try {
    const response = await api.delete(`/api/ai-tools/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting AI tool:', error);
    throw error;
  }
};

/**
 * Create a new agent
 * @param {Object} agentData - The agent data to create
 * @returns {Promise<Object>} - Created agent data
 */
export const createAgent = async (agentData) => {
  try {
    console.log('Creating new agent:', agentData);
    
    // Check for file uploads
    const hasImageFile = agentData._imageFile && 
      (agentData._imageFile instanceof File || 
       (typeof agentData._imageFile === 'object' && Object.keys(agentData._imageFile).length > 0));
       
    const hasIconFile = agentData._iconFile && 
      (agentData._iconFile instanceof File || 
       (typeof agentData._iconFile === 'object' && Object.keys(agentData._iconFile).length > 0));
    
    const hasJsonFile = agentData.jsonFile && 
      (agentData.jsonFile instanceof File || 
       (typeof agentData.jsonFile === 'object' && Object.keys(agentData.jsonFile).length > 0));
    
    const hasBlobImageUrl = agentData.imageUrl && typeof agentData.imageUrl === 'string' && agentData.imageUrl.startsWith('blob:');
    const hasBlobIconUrl = agentData.iconUrl && typeof agentData.iconUrl === 'string' && agentData.iconUrl.startsWith('blob:');
    const hasBlobJsonFileUrl = agentData.jsonFileUrl && typeof agentData.jsonFileUrl === 'string' && agentData.jsonFileUrl.startsWith('blob:');
    
    // Extract and normalize price information
    const priceDetails = {
      basePrice: agentData.priceDetails?.basePrice ?? 0,
      discountedPrice: agentData.priceDetails?.discountedPrice ?? 0,
      currency: agentData.priceDetails?.currency ?? 'USD',
      isFree: agentData.priceDetails?.isFree ?? false,
      isSubscription: agentData.priceDetails?.isSubscription ?? false,
      discountPercentage: agentData.priceDetails?.discountPercentage ?? 0
    };
    
    // Create a clean payload with all required fields
    const payload = {
      name: agentData.name || '',
      title: agentData.title || '',
      description: agentData.description || '',
      category: agentData.category || '',
      status: agentData.status || 'active',
      features: agentData.features || [],
      tags: agentData.tags || [],
      creator: agentData.creator || {},
      isFeatured: agentData.isFeatured || false,
      isVerified: agentData.isVerified || false,
      isPopular: agentData.isPopular || false,
      isTrending: agentData.isTrending || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Only include priceDetails, not duplicate fields
      priceDetails: priceDetails,
      
      // Include only price field as a reference for backward compatibility
      price: priceDetails.discountedPrice,
      
      // Include just isFree for backward compatibility
      isFree: priceDetails.isFree
    };
    
    // If we have files to upload, use FormData
    if (hasImageFile || hasIconFile || hasJsonFile || hasBlobImageUrl || hasBlobIconUrl || hasBlobJsonFileUrl) {
      const formData = new FormData();
      
      // Instead of adding entire payload as JSON string, add each field individually
      // This prevents nesting everything under a "data" property
      Object.entries(payload).forEach(([key, value]) => {
        // Skip file fields that will be handled separately
        if (key !== '_imageFile' && key !== '_iconFile' && key !== 'jsonFile') {
          // Handle nested objects by stringifying them
          if (typeof value === 'object' && value !== null) {
            formData.append(key, JSON.stringify(value));
          } else {
          formData.append(key, value);
          }
        }
      });
      
      // Add files if present
      if (hasImageFile && agentData._imageFile instanceof File) {
        formData.append('image', agentData._imageFile);
        console.log('Appending image file:', agentData._imageFile.name);
      } else if (hasImageFile) {
        formData.append('imageData', JSON.stringify(agentData._imageFile));
      }
      
      if (hasIconFile && agentData._iconFile instanceof File) {
        formData.append('icon', agentData._iconFile);
        console.log('Appending icon file:', agentData._iconFile.name);
      } else if (hasIconFile) {
        formData.append('iconData', JSON.stringify(agentData._iconFile));
      }
      
      if (hasJsonFile && agentData.jsonFile instanceof File) {
        formData.append('jsonFile', agentData.jsonFile);
        console.log('Appending JSON file:', agentData.jsonFile.name);
      } else if (hasJsonFile) {
        formData.append('jsonFileData', JSON.stringify(agentData.jsonFile));
      }
    } else {
      // No files to upload, use regular JSON request
      const response = await api.post('/api/agents', payload);
      console.log('Successfully created agent:', response.data);
      await refreshAgentStore();
      return response.data;
    }
  } catch (error) {
    console.error('Error creating agent:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
};

// Update Email Preferences
export const updateEmailPreferences = async (preferences) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const response = await api.put(`/api/email/preferences/${currentUser.uid}`, preferences);
    return response.data;
  } catch (error) {
    console.error('Error updating email preferences:', error);
    throw error;
  }
};

/**
 * Fetch the latest agents for email notifications
 * @param {number} limit - Number of latest agents to return (default 5)
 * @returns {Promise<Array>} - Array of latest agents
 */
export const fetchLatestAgents = async (limit = 5) => {
  try {
    console.log(`Fetching latest ${limit} agents from API`);
    const response = await api.get(`/api/agents/latest?limit=${limit}`);
    console.log('Successfully fetched latest agents from API:', response.data.agents.length);
    
    // Validate agents to ensure they exist and have valid IDs
    const validAgents = response.data.agents.filter(agent => {
      return agent && agent.id && typeof agent.id === 'string';
    });
    
    if (validAgents.length !== response.data.agents.length) {
      console.warn(`Filtered out ${response.data.agents.length - validAgents.length} invalid latest agents`);
    }
    
    return validAgents;
  } catch (error) {
    console.error('Error fetching latest agents from API:', error);
    // Return empty array on error
    return [];
  }
};

/**
 * Update an existing agent
 * @param {string} id - The ID of the agent to update
 * @param {Object} agentData - The updated agent data
 * @returns {Promise<Object>} - Updated agent data
 */
export const updateAgent = async (id, agentData) => {
  try {
    console.log(`Updating agent ${id}:`, agentData);
    
    // Check for file uploads
    const hasImageFile = agentData._imageFile && 
      (agentData._imageFile instanceof File || 
       (typeof agentData._imageFile === 'object' && Object.keys(agentData._imageFile).length > 0));
       
    const hasIconFile = agentData._iconFile && 
      (agentData._iconFile instanceof File || 
       (typeof agentData._iconFile === 'object' && Object.keys(agentData._iconFile).length > 0));
    
    const hasJsonFile = agentData.jsonFile && 
      (agentData.jsonFile instanceof File || 
       (typeof agentData.jsonFile === 'object' && Object.keys(agentData.jsonFile).length > 0));
    
    const hasBlobImageUrl = agentData._hasBlobImageUrl && agentData.imageUrl;
    const hasBlobIconUrl = agentData._hasBlobIconUrl && agentData.iconUrl;
    const hasBlobJsonFileUrl = agentData._hasBlobJsonFileUrl && agentData.fileUrl;
    
    // Create a clean payload without the file properties that will be handled separately
    const payload = { ...agentData };
    delete payload._imageFile;
    delete payload._iconFile;
    delete payload._hasBlobImageUrl;
    delete payload._hasBlobIconUrl;
    delete payload._hasBlobJsonFileUrl;
    
    // If we have files to upload, use FormData
    if (hasImageFile || hasIconFile || hasJsonFile || hasBlobImageUrl || hasBlobIconUrl || hasBlobJsonFileUrl) {
      const formData = new FormData();
      
      // Add core fields individually to the FormData
      Object.entries(payload).forEach(([key, value]) => {
        // Skip file fields that will be handled separately
        if (key !== 'jsonFile') {
          // Handle nested objects by stringifying them
          if (typeof value === 'object' && value !== null) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value);
          }
        }
      });
      
      // Add files if present
      if (hasImageFile && agentData._imageFile instanceof File) {
        formData.append('image', agentData._imageFile);
        console.log('Appending image file:', agentData._imageFile.name);
      } else if (hasImageFile) {
        formData.append('imageData', JSON.stringify(agentData._imageFile));
      }
      
      if (hasIconFile && agentData._iconFile instanceof File) {
        formData.append('icon', agentData._iconFile);
        console.log('Appending icon file:', agentData._iconFile.name);
      } else if (hasIconFile) {
        formData.append('iconData', JSON.stringify(agentData._iconFile));
      }
      
      if (hasJsonFile && agentData.jsonFile instanceof File) {
        formData.append('jsonFile', agentData.jsonFile);
        console.log('Appending JSON file:', agentData.jsonFile.name);
      } else if (hasJsonFile) {
        formData.append('jsonFileData', JSON.stringify(agentData.jsonFile));
      }
      
      // Try singular endpoint first
      try {
        const response = await fetch(`${API_URL}/api/agent/${id}`, {
          method: 'PUT',
          body: formData,
          credentials: 'include',
          headers: {
            'Authorization': localStorage.getItem('authToken') ? 
              `Bearer ${localStorage.getItem('authToken')}` : ''
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response from /api/agent:', errorText);
          throw new Error(`Agent update failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error with single agent endpoint, trying agents endpoint:', error);
        
        // Fall back to agents endpoint
        const response = await fetch(`${API_URL}/api/agents/${id}`, {
          method: 'PATCH',
          body: formData,
          credentials: 'include',
          headers: {
            'Authorization': localStorage.getItem('authToken') ? 
              `Bearer ${localStorage.getItem('authToken')}` : ''
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response from /api/agents:', errorText);
          throw new Error(`Agent update failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      }
    } else {
      // No files to upload, use regular JSON
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('authToken') ? 
          `Bearer ${localStorage.getItem('authToken')}` : ''
      };
      
      // Try singular endpoint first
      try {
        const response = await fetch(`${API_URL}/api/agent/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response from /api/agent:', errorText);
          throw new Error(`Agent update failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
  } catch (error) {
        console.error('Error with single agent endpoint, trying agents endpoint:', error);
        
        // Fall back to agents endpoint
        const response = await fetch(`${API_URL}/api/agents/${id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response from /api/agents:', errorText);
          throw new Error(`Agent update failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      }
    }
  } catch (error) {
    console.error('Error updating agent:', error);
    throw error;
  }
};

export default api;

/**
 * Test file upload directly
 * @param {File} file - The file to upload
 * @returns {Promise<Object>} - Upload result
 */
export const testFileUpload = async (file) => {
  try {
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file object');
    }
    
    console.log('Testing direct file upload:', file.name, file.type, file.size);
    
    // Create simple FormData with just the file
    const formData = new FormData();
    formData.append('testFile', file);
    
    // Log all form data entries
    console.log('FormData entries for test:');
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1] instanceof File ? `[File: ${pair[1].name}, ${pair[1].size} bytes]` : pair[1]);
    }
    
    // Send without any extra options
    const response = await fetch(`${API_URL}/api/test/upload`, {
      method: 'POST',
      body: formData,
      // No headers - let browser set them
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Test upload result:', result);
    return result;
  } catch (error) {
    console.error('Test file upload error:', error);
    throw error;
  }
};

// =================================================================
// Agent API Functions 
// =================================================================

/**
 * Fetch agent by ID from the database
 * @param {string} agentId - The ID of the agent to fetch
 * @returns {Promise<Object>} The agent data
 */
export const fetchAgentByIdWithFirebase = async (agentId) => {
  try {
    console.log(`Fetching agent with ID: ${agentId}`);
    
    // Check if the ID exists
    if (!agentId) {
      throw new Error('Agent ID is required');
    }
    
    const agentRef = doc(db, 'agents', agentId);
    const agentSnap = await getDoc(agentRef);
    
    if (!agentSnap.exists()) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    const agentData = { id: agentSnap.id, ...agentSnap.data() };
    
    // Check if the user has wishlisted this agent
    const user = auth.currentUser;
    if (user) {
      const wishlistQuery = query(
        collection(db, 'wishlists'),
        where('userId', '==', user.uid),
        where('agentId', '==', agentId)
      );
      
      const wishlistSnapshot = await getDocs(wishlistQuery);
      agentData.isWishlisted = !wishlistSnapshot.empty;
    }
    
    return agentData;
  } catch (error) {
    console.error('Error fetching agent:', error);
    throw error;
  }
};

/**
 * Toggle like for an agent
 * @param {string} agentId - The ID of the agent to toggle like for
 * @returns {Promise<Object>} Response object
 */
export const toggleAgentLike = async (agentId) => {
  try {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }

    // Optimistic UI update - store action in pending queue if offline
    const pendingKey = `pending_likes`;
    let pendingLikes = [];
    try {
      const pendingData = localStorage.getItem(pendingKey);
      if (pendingData) {
        pendingLikes = JSON.parse(pendingData);
      }
    } catch (e) {
      console.warn('Error reading pending likes', e);
    }

    // Attempt API call with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${API_URL}/api/agents/${agentId}/toggle-like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (fetchError) {
      clearTimeout(timeoutId);

      console.warn('Error toggling like, storing action for later sync:', fetchError);
      
      // Store action for later sync
      const isAlreadyPending = pendingLikes.some(item => item.agentId === agentId);
      
      if (!isAlreadyPending) {
        pendingLikes.push({
          agentId,
          action: 'toggle-like',
          timestamp: Date.now()
        });
        
        try {
          localStorage.setItem(pendingKey, JSON.stringify(pendingLikes));
        } catch (storageError) {
          console.warn('Failed to store pending like action:', storageError);
        }
      }
      
      // Provide offline feedback - optimistically toggle
      return { 
        success: true, 
        offline: true,
        liked: true, // optimistic assumption
        likesCount: -1 // indicates we don't know the actual count
      };
    }
  } catch (error) {
    console.error('Error in toggleAgentLike:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get comments/reviews for an agent
 * @param {string} agentId - The ID of the agent to get comments for
 * @returns {Promise<Array>} Array of comments
 */
export const getAgentReviews = async (agentId) => {
  try {
    // Try to get from local storage cache first
    const cacheKey = `agent_reviews_${agentId}`;
    const cachedData = localStorage.getItem(cacheKey);
    let cachedReviews = null;
    
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        // Use cache for up to 1 hour
        if (cacheAge < 60 * 60 * 1000) {
          console.log(`Using cached reviews for agent ${agentId}, ${Math.round(cacheAge/1000)}s old`);
          return data;
        }
        // Still parse the data for potential fallback
        cachedReviews = data;
      } catch (cacheError) {
        console.error('Error parsing cached reviews:', cacheError);
      }
    }
    
    // Attempt to fetch from API with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
    
    try {
      const response = await fetch(`${API_URL}/api/agents/${agentId}/reviews`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.status}`);
      }
      
      const reviews = await response.json();
      
      // Cache the fresh data
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: reviews,
          timestamp: Date.now()
        }));
      } catch (storageError) {
        console.warn('Failed to cache reviews:', storageError);
      }
      
      return reviews;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // If we have cached reviews, use them as fallback
      if (cachedReviews) {
        console.log(`Using cached reviews as fallback due to network error: ${fetchError.message}`);
        return cachedReviews;
      }
      
      // If it's a timeout or network error, throw a more specific error
      if (fetchError.name === 'AbortError') {
        console.warn('API request for reviews timed out');
        return []; // Return empty array instead of throwing
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Error getting agent reviews:', error);
    return []; // Return empty array for a better user experience
  }
};

/**
 * Add a review/comment to an agent
 * @param {string} agentId - The ID of the agent to add comment to
 * @param {Object} commentData - The comment data object
 * @returns {Promise<Object>} Response object
 */
export const addAgentReview = async (agentId, reviewData) => {
  try {
    // Only allow authenticated users
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'You must be logged in to post a review' };
    }
    
    // Use token auth with Firebase
    const token = await user.getIdToken();
    
    // Make the API request to add review
    const response = await fetch(`${API_URL}/api/agents/${agentId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content: reviewData.content,
        rating: reviewData.rating,
        verificationStatus: reviewData.verificationStatus || 'unverified'
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding agent review:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get download count for an agent
 * @param {string} agentId - The ID of the agent
 * @returns {Promise<number>} The download count
 */
// NOTE: Duplicate functions (getAgentDownloadCount, incrementAgentDownloadCount, recordAgentDownload) removed.
// These functions are already defined around lines 2120-2205.

/**
 * Check if a user can review an agent
 * @param {string} agentId - The ID of the agent
 * @returns {Promise<Object>} - Object with canReview and reason properties
 */
export const checkCanReviewAgent = async (agentId) => {
  try {
    // Cache key for this check
    const cacheKey = `review_eligibility_${agentId}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    // For very short-term caching (1 minute)
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < 60 * 1000) { // 1 minute cache
          return data;
        }
      } catch (e) {
        // Ignore cache errors
      }
    }
    
    // Attempt API call with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(`${API_URL}/api/agents/${agentId}/can-review`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Cache the result briefly
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: result,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Ignore storage errors
      }
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Fallback for offline - assume eligible but notify user it's offline mode
      return {
        canReview: true,
        reason: 'Offline mode - review will be saved when connectivity is restored'
      };
    }
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    return { canReview: false, reason: 'Error checking eligibility' };
  }
};

export async function downloadFreeAgent(agentId) {
  try {
    // Ensure user is authenticated
    if (!auth.currentUser) {
      throw new Error('You must be signed in to download agents');
    }

    const token = await auth.currentUser.getIdToken();
    const response = await axios.post(
      `/api/agents/${agentId}/free-download`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error downloading free agent:', error);
    throw error;
  }
}

// Add this after the imports
// Rate limit handling
let isRateLimited = false;
let rateLimitResetTime = null;
const RATE_LIMIT_BACKOFF = 60000; // 1 minute default backoff

// Create an axios instance with interceptors for rate limiting
// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000'
// });

// Add a request interceptor to prevent requests when rate limited
api.interceptors.request.use(
  (config) => {
    // Check if we're currently rate limited
    if (isRateLimited) {
      const now = Date.now();
      
      // If the rate limit hasn't expired yet, reject the request
      if (rateLimitResetTime && now < rateLimitResetTime) {
        const timeRemaining = Math.ceil((rateLimitResetTime - now) / 1000);
        console.warn(`Request blocked due to rate limiting. Try again in ${timeRemaining} seconds.`);
        
        // Create a custom error
        const error = new Error(`Too many requests. Please try again in ${timeRemaining} seconds.`);
        error.isRateLimited = true;
        error.retryAfter = timeRemaining;
        
        // Reject the promise
        return Promise.reject(error);
      } else {
        // Rate limit has expired, clear the flag
        isRateLimited = false;
        rateLimitResetTime = null;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle rate limit responses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Check if this is a rate limit error
    if (error.response && error.response.status === 429) {
      // Set the rate limited flag
      isRateLimited = true;
      
      // Get the retry-after header if it exists
      let retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        retryAfter = parseInt(retryAfter, 10) * 1000; // Convert to milliseconds
      } else {
        // Use default backoff time if no header is present
        retryAfter = RATE_LIMIT_BACKOFF;
      }
      
      // Set the reset time
      rateLimitResetTime = Date.now() + retryAfter;
      
      console.warn(`Rate limited by server. Requests blocked for ${retryAfter / 1000} seconds.`);
      
      // Create a more user-friendly error
      const timeInMinutes = Math.ceil(retryAfter / 60000);
      error.message = `Too many requests, please try again in ${timeInMinutes} minute${timeInMinutes > 1 ? 's' : ''}.`;
      error.isRateLimited = true;
      error.retryAfter = retryAfter / 1000; // in seconds
    }
    
    // Log error response for debugging
    if (error.response) {
      console.error(' API Response Error:', {
        url: error.config?.url,
        status: error.response.status,
        data: error.response.data
      });
    }
    
    return Promise.reject(error);
  }
);

/**
 * Handle syncing pending offline actions when connectivity is restored
 * This function should be called when the app detects online status
 */
export const syncPendingActions = async () => {
  if (!navigator.onLine) return;
  
  try {
    // Process pending likes
    const pendingLikesKey = 'pending_likes';
    let pendingLikes = [];
    
    try {
      const pendingData = localStorage.getItem(pendingLikesKey);
      if (pendingData) {
        pendingLikes = JSON.parse(pendingData);
      }
    } catch (e) {
      console.warn('Error reading pending likes', e);
    }
    
    if (pendingLikes.length > 0) {
      console.log(`Syncing ${pendingLikes.length} pending like actions`);
      
      // Process each pending like
      const successfulSyncs = [];
      
      for (const pendingLike of pendingLikes) {
        try {
          await toggleAgentLike(pendingLike.agentId);
          successfulSyncs.push(pendingLike);
        } catch (e) {
          console.error('Failed to sync pending like:', e);
        }
      }
      
      // Remove successful syncs from the pending list
      if (successfulSyncs.length > 0) {
        const remainingPending = pendingLikes.filter(item => 
          !successfulSyncs.some(sync => sync.agentId === item.agentId));
        
        localStorage.setItem(pendingLikesKey, JSON.stringify(remainingPending));
      }
    }
    
    // Add more pending action types here as needed
    
  } catch (error) {
    console.error('Error syncing pending actions:', error);
  }
};

/**
 * Update both agent and price data in a single request to avoid inconsistencies
 * @param {string} id - Agent ID
 * @param {Object} agentData - Agent data to update
 * @param {Object} priceData - Price data to update
 * @returns {Promise<Object>} Updated agent with price data
 */
export const updateAgentWithPrice = async (id, agentData, priceData) => {
  try {
    console.log(`Updating agent ${id} with combined price data:`, { agentData, priceData });
    
    // Normalize price data if provided
    const normalizedPriceData = priceData ? {
      basePrice: parseFloat(priceData.basePrice) || 0,
      discountedPrice: parseFloat(priceData.discountedPrice) || parseFloat(priceData.basePrice) || 0,
      currency: priceData.currency || 'USD',
      isFree: priceData.isFree || parseFloat(priceData.basePrice) === 0 || false,
      isSubscription: priceData.isSubscription || false
    } : null;
    
    // Create payload with both agent and price data
    const payload = {
      ...agentData,
      ...(normalizedPriceData ? { priceData: normalizedPriceData } : {})
    };
    
    // Try combined-update endpoint first
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/agent/${id}/combined-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Combined update failed (${response.status}):`, errorText);
        throw new Error('Combined update failed');
      }
      
      const data = await response.json();
      console.log('Combined update successful:', data);
      
      // Refresh the agent store
      await refreshAgentStore();
      
      return data.data || data;
    } catch (combinedError) {
      console.warn('Combined update failed, falling back to separate calls:', combinedError);
      
      // Fall back to separate calls
      const updatedAgent = await updateAgent(id, agentData);
      
      if (normalizedPriceData) {
        // Use imported updateAgentPrice from priceService
        const { updateAgentPrice } = await import('../services/priceService');
        await updateAgentPrice(id, normalizedPriceData);
      }
      
      // Re-fetch the agent to get the latest data with both updates
      return await fetchAgentById(id, { skipCache: true });
    }
  } catch (error) {
    console.error(`Error in updateAgentWithPrice:`, error);
    throw error;
  }
};

/**
 * Check if the current user has liked a specific agent
 * @param {string} agentId - The ID of the agent to check
 * @returns {Promise<Object>} Object with liked status and likes count
 */
export const getUserLikeStatus = async (agentId) => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { liked: false, likesCount: 0 };
    }

    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/agents/${agentId}/user-like-status`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Error fetching like status: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      liked: data.liked || false,
      likesCount: data.likesCount || 0
    };
  } catch (error) {
    console.error("Error checking agent like status:", error);
    // Return default values on error
    return { liked: false, likesCount: 0 };
  }
};

