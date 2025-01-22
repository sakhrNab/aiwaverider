// src/contexts/AuthContext.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth } from '../utils/firebase';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get the user's ID token
          const token = await firebaseUser.getIdToken();
          
          // Optionally fetch additional user data from your backend
          const response = await fetch('/api/auth/session', {
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
            setUser({ ...firebaseUser, ...data.user });
          } else {
            // Handle error but keep the basic Firebase user info
            setUser(firebaseUser);
          }
        } else {
          setUser(null);
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

  const signInUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  const contextValue = useMemo(() => ({
    user,
    loading,
    error,
    signInUser,
    signOutUser,
  }), [user, loading, error, signInUser, signOutUser]);

  if (loading) {
    return <div>Loading...</div>; // Or your loading component
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
