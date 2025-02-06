// src/utils/api.jsx

import firebase from 'firebase/compat/app';
// import 'firebase/compat/auth';
import { auth } from '../utils/firebase';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Update this helper function to use Firebase token
const getAuthHeaders = async () => {
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

// Add this helper function
export const createSession = async (user) => {
  try {
    const token = await user.getIdToken(true);
    const response = await fetch(`${API_URL}/api/auth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ idToken: token })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create session');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

// Sign Out User
export const signOutUser = async () => {
  try {
    // Only sign out from your backend
    const response = await fetch(`${API_URL}/api/auth/signout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { message: response.statusText };
    }

    return { success: true, message: data.message || 'Signed out successfully' };
  } catch (error) {
    console.error('Error during sign out:', error);
    // Still return success to ensure client-side cleanup
    return { success: true, message: 'Signed out locally' };
  }
};

// Sign Up with Email and Password
export const signUp = async (userData) => {
  try {
    // Extract password and create user in Firebase first
    const { email, password } = userData;
    const firebaseResult = await auth.createUserWithEmailAndPassword(email, password);
    
    // Get the Firebase user
    const firebaseUser = firebaseResult.user;

    // Update Firebase profile with display name
    await firebaseUser.updateProfile({
      displayName: `${userData.firstName} ${userData.lastName}`
    });

    // Prepare user data for backend (excluding password and including Firebase UID)
    const backendUserData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
      displayName: firebaseUser.displayName
    };

    // Create user in backend database
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendUserData),
      credentials: 'include',
    });

    const data = await response.json();
    
    if (!response.ok) {
      // If backend fails, delete Firebase user and throw error
      await firebaseUser.delete();
      throw new Error(data.error || 'Failed to create user in database');
    }

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
    // Determine if input is email or username
    const isEmail = usernameOrEmail.includes('@');
    let email = usernameOrEmail;

    // If it's not an email, fetch the email from your backend
    if (!isEmail) {
      const response = await fetch(`${API_URL}/api/auth/get-email/${usernameOrEmail}`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Username not found');
      email = data.email;
    }

    // Sign in with Firebase
    const result = await auth.signInWithEmailAndPassword(email, password);

    if (!result.user) {
      throw new Error('No user data returned from Firebase');
    }

    // No need to call createSession here; AuthContext handles it via onAuthStateChanged

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
    
    // First check if user exists in backend
    const result = await auth.signInWithPopup(provider);
    
    if (!result.user) {
      throw new Error('No user data returned from Google Sign-In');
    }

    // After Firebase auth, verify user exists in backend
    try {
      const token = await result.user.getIdToken();
      const response = await fetch(`${API_URL}/api/auth/verify-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        // If user doesn't exist, sign out from Firebase and redirect to sign up
        if (data.errorType === 'NO_ACCOUNT') {
          await auth.signOut();
          throw new Error('NO_ACCOUNT');
        }
        throw new Error(data.error || 'Failed to verify user');
      }

      return { firebaseUser: result.user };
    } catch (error) {
      if (error.message === 'NO_ACCOUNT') {
        throw { code: 'auth/no-account', message: 'No account found. Please sign up first.' };
      }
      throw error;
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// -- Google Sign-Up (just signInWithPopup, let AuthContext create user) --
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

export const signUpWithMicrosoft = async () => {
  try {
    const provider = new firebase.auth.OAuthProvider('microsoft.com');
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Sign in via popup
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    
    // Grab the user's ID token so we can call our backend
    const token = await user.getIdToken();

    // Prepare user data for the backend
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

    // Create/Update user in the backend
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData),
      credentials: 'include'
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create user in database');
    }

    // If successful, return the Firebase user object in the same format
    const data = await response.json();
    return { firebaseUser: user };
  } catch (error) {
    console.error('Error in Microsoft sign up:', error);
    throw error;
  }
};
// -- Microsoft Sign-In (POPUP approach, consistent with sign-up) --
export const signInWithMicrosoft = async () => {
  try {
    const provider = new firebase.auth.OAuthProvider('microsoft.com');
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const result = await auth.signInWithPopup(provider);
    
    if (!result.user) {
      throw new Error('No user data returned from Microsoft Sign-In');
    }

    // Verify user exists in backend
    try {
      const token = await result.user.getIdToken();
      const response = await fetch(`${API_URL}/api/auth/verify-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.errorType === 'NO_ACCOUNT') {
          await auth.signOut();
          throw new Error('NO_ACCOUNT');
        }
        throw new Error(data.error || 'Failed to verify user');
      }

      return { firebaseUser: result.user };
    } catch (error) {
      if (error.message === 'NO_ACCOUNT') {
        throw { code: 'auth/no-account', message: 'No account found. Please sign up first.' };
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in Microsoft sign in:', error);
    throw error;
  }
};

// Update createPost to use Firebase token
export const createPost = async (formData) => {
  try {
    const headers = await getAuthHeaders();
    
    // Remove Content-Type from headers when sending FormData
    delete headers['Content-Type'];
    
    const response = await fetch(`${API_URL}/api/posts`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include'
    });

    // First check the response type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error('Server returned non-JSON response');
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('Error response:', data);
      throw new Error(data.error || data.details || 'Failed to create post');
    }

    return data;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

// Update getAllPosts to use Firebase token
export const getAllPosts = async (category = 'All', limit = 10, startAfter = null) => {
  try {
    const headers = await getAuthHeaders();

    let url = `${API_URL}/api/posts?limit=${limit}`;
    if (category && category !== 'All') {
      url += `&category=${encodeURIComponent(category)}`;
    }
    if (startAfter) {
      url += `&startAfter=${encodeURIComponent(startAfter)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers
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
      credentials: 'include',
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

// Update addComment to use Firebase token
export const addComment = async (postId, commentData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(commentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add comment');
    }

    const data = await response.json();
    return data.comment;  // Return only the comment object
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};


// Update deletePost to use Firebase token
export const deletePost = async (postId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers
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

// Update updatePost to use Firebase token
export const updatePost = async (postId, formData) => {
  try {
    const headers = await getAuthHeaders();
    // Remove Content-Type when sending FormData
    delete headers['Content-Type'];
    
    const response = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: formData
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
      credentials: 'include',
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

export const likeComment = async (postId, commentId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/posts/${postId}/comments/${commentId}/like`, {
    method: 'POST',
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to like comment');
  }
  const data = await response.json();
  return data.updatedComment; // Assumes the backend returns the updated comment
};

export const unlikeComment = async (postId, commentId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/posts/${postId}/comments/${commentId}/like`, {
    method: 'DELETE',
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to unlike comment');
  }
  const data = await response.json();
  return data.updatedComment;
};

export const deleteComment = async (postId, commentId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete comment');
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

export const updateComment = async (postId, commentId, commentData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/posts/${postId}/comments/${commentId}`, {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify(commentData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update comment');
  }
  const data = await response.json();
  return data.updatedComment;
};

