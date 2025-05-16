/**
 * Authentication utility functions
 */

// Storage keys
const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

/**
 * Get authentication token from storage
 * @returns {string|null} The authentication token or null if not found
 */
export const getAuthToken = () => {
  // Try localStorage first
  let token = localStorage.getItem(TOKEN_KEY);
  
  // If not in localStorage, try sessionStorage
  if (!token) {
    token = sessionStorage.getItem(TOKEN_KEY);
  }
  
  // For development mode, generate a mock token if none exists
  if (!token && process.env.NODE_ENV === 'development') {
    console.log('Generating mock token for development');
    token = generateMockFirebaseToken();
    console.log('Generated token:', token.substring(0, 20) + '...');
    localStorage.setItem(TOKEN_KEY, token);
  }
  
  // Ensure token has Bearer prefix if it exists
  if (token && !token.startsWith('Bearer ')) {
    token = `Bearer ${token}`;
  }
  
  return token;
};

/**
 * Store authentication token in storage
 * @param {string} token - The authentication token to store
 * @param {boolean} rememberMe - Whether to store in localStorage (true) or sessionStorage (false)
 */
export const setAuthToken = (token, rememberMe = false) => {
  // Remove Bearer prefix if it exists for consistent storage
  const tokenValue = token.startsWith('Bearer ') ? token.substring(7) : token;
  
  // Clear any existing tokens
  clearAuthToken();
  
  // Store token in appropriate storage
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, tokenValue);
  } else {
    sessionStorage.setItem(TOKEN_KEY, tokenValue);
  }
};

/**
 * Clear authentication token from storage
 */
export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
};

/**
 * Get authenticated user data from storage
 * @returns {Object|null} The user data or null if not found
 */
export const getAuthUser = () => {
  // Try localStorage first
  let userJson = localStorage.getItem(USER_KEY);
  
  // If not in localStorage, try sessionStorage
  if (!userJson) {
    userJson = sessionStorage.getItem(USER_KEY);
  }
  
  // Parse and return user data
  try {
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    clearAuthUser();
    return null;
  }
};

/**
 * Store authenticated user data in storage
 * @param {Object} user - The user data to store
 * @param {boolean} rememberMe - Whether to store in localStorage (true) or sessionStorage (false)
 */
export const setAuthUser = (user, rememberMe = false) => {
  // Convert user object to JSON string
  const userJson = JSON.stringify(user);
  
  // Clear any existing user data
  clearAuthUser();
  
  // Store user data in appropriate storage
  if (rememberMe) {
    localStorage.setItem(USER_KEY, userJson);
  } else {
    sessionStorage.setItem(USER_KEY, userJson);
  }
};

/**
 * Clear authenticated user data from storage
 */
export const clearAuthUser = () => {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated, false otherwise
 */
export const isAuthenticated = () => {
  return !!getAuthToken() && !!getAuthUser();
};

/**
 * Check if user has admin role
 * @returns {boolean} True if user is an admin, false otherwise
 */
export const isAdmin = () => {
  const user = getAuthUser();
  return user && (user.role === 'admin' || user.isAdmin === true);
};

/**
 * Log out user
 */
export const logout = () => {
  clearAuthToken();
  clearAuthUser();
  // Additional cleanup can be done here, like redirecting to login page
};

/**
 * Get auth headers for API requests
 * @returns {Object} Headers object with authorization token
 */
export const getAuthHeaders = () => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = token;
  }
  
  console.log('Generated auth headers:', { 
    Authorization: token ? `${token.substring(0, 15)}...` : undefined 
  });
  
  return headers;
};

/**
 * Generate a mock Firebase token for development purposes
 * @returns {string} A mock JWT token
 */
export function generateMockFirebaseToken() {
  // Create a mock header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  // Create a mock payload with admin claims
  const payload = {
    sub: 'mock-user-' + Date.now(),
    name: 'Mock Admin',
    email: 'admin@example.com',
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
    admin: true,
    uid: 'mock-admin-uid'
  };
  
  // Create mock token parts
  const encodedHeader = encodeBase64(header);
  const encodedPayload = encodeBase64(payload);
  
  // Use a consistent signature for testing (in real JWT this would be encrypted)
  const signature = 'mock_signature_for_development_only';
  
  // Return the complete mock token
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Base64 encode an object
 * @param {Object} obj - Object to encode
 * @returns {string} - Base64 encoded string
 */
const encodeBase64 = (obj) => {
  const str = JSON.stringify(obj);
  let output = '';
  
  if (typeof btoa === 'function') {
    // Browser environment
    output = btoa(str);
  } else {
    // Node.js environment
    output = Buffer.from(str).toString('base64');
  }
  
  // Make the output URL-safe
  return output
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Validate and refresh token if needed
 */
export function validateAndRefreshToken() {
  const token = localStorage.getItem('authToken');
  if (!token) return false;
  
  try {
    // Parse the token payload
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    
    // Check if token is expired or about to expire (within 5 minutes)
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresInSeconds = payload.exp - nowSeconds;
    
    // If expired or about to expire, generate new token in development
    if (expiresInSeconds < 300 && process.env.NODE_ENV === 'development') {
      const mockToken = generateMockFirebaseToken();
      localStorage.setItem('authToken', mockToken);
      console.log('Token was expiring, refreshed with new mock token');
      return true;
    }
    
    return expiresInSeconds > 0; // Return true if token is still valid
  } catch (e) {
    console.error('Error validating token:', e);
    return false;
  }
} 