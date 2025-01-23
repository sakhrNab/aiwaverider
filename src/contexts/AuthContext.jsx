// src/contexts/AuthContext.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth } from '../utils/firebase';
import { API_URL, signOutUser as apiSignOutUser } from '../utils/api'; // Import the backend signOutUser

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null); // Firebase User object
  const [userData, setUserData] = useState(null); // Backend user data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setLoading(true);
      try {
        if (user) {
          setFirebaseUser(user);
          const token = await user.getIdToken(true);

          // Fetch additional user data from backend
          const response = await fetch(`${API_URL}/api/auth/session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({ idToken: token })
          });

          if (response.ok) {
            const data = await response.json();
            setUserData(data.user);
          } else {
            console.warn('Failed to fetch user data from backend, using Firebase user data');
            setUserData(null);
          }
        } else {
          setFirebaseUser(null);
          setUserData(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signInUser = useCallback(async (firebaseUserObj) => {
    try {
      // Ensure firebaseUserObj is a Firebase User
      if (!firebaseUserObj || typeof firebaseUserObj.getIdToken !== 'function') {
        throw new Error('Invalid Firebase user object');
      }

      // Get fresh token
      const token = await firebaseUserObj.getIdToken(true);

      // Create session in backend
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data = await response.json();
      setUserData(data.user);
      setFirebaseUser(firebaseUserObj);
    } catch (error) {
      console.error('Error creating session:', error);
      // Still set the Firebase user data if backend fails
      setFirebaseUser(firebaseUserObj);
      setUserData(null);
      // Don't throw error to prevent login failure
    }
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      // Sign out from Firebase
      await auth.signOut();

      // Sign out from backend
      await apiSignOutUser(); // Ensure this does NOT call auth.signOut() again

      // Reset state
      setFirebaseUser(null);
      setUserData(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  const contextValue = useMemo(() => ({
    user: firebaseUser ? { firebaseUser, ...userData } : null, // Set to null when not authenticated
    loading,
    error,
    signInUser,
    signOutUser,
  }), [firebaseUser, userData, loading, error, signInUser, signOutUser]);

  if (loading) {
    return <div>Loading...</div>; // Or your loading component
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
