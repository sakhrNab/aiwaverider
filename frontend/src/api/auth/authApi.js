import firebase from 'firebase/compat/app';
import { auth } from '../../utils/firebase';
import { api, API_URL, clearTokenCache } from '../core/apiConfig';

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