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
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const createSession = useCallback(async (user) => {
    if (!user || isNewUser) return null;
    
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Session creation error:', error);
      return null;
    }
  }, [isNewUser]);

  // Auth state change handler
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        setLoading(true);
        if (user) {
          console.log('Auth state changed:', { isSigningUp, isNewUser, sessionInitialized });
          setFirebaseUser(user);
          
          // Skip session creation if we're signing up or it's a new user
          if (!isSigningUp && !isNewUser && !sessionInitialized) {
            const backendUser = await createSession(user);
            if (backendUser) {
              setUserData(backendUser);
              setSessionInitialized(true);
            }
          }
        } else {
          setFirebaseUser(null);
          setUserData(null);
          setSessionInitialized(false);
          setIsNewUser(false);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [sessionInitialized, createSession, isSigningUp, isNewUser]);

  const signInUser = useCallback(async (firebaseUserObj, isSignup = false) => {
    try {
      if (!firebaseUserObj || typeof firebaseUserObj.getIdToken !== 'function') {
        throw new Error('Invalid Firebase user object');
      }

      setFirebaseUser(firebaseUserObj);
      
      if (isSignup) {
        setIsSigningUp(true);
        setIsNewUser(true);
        const token = await firebaseUserObj.getIdToken(true);
        const response = await fetch(`${API_URL}/api/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify({
            uid: firebaseUserObj.uid,
            email: firebaseUserObj.email,
            displayName: firebaseUserObj.displayName,
            username: firebaseUserObj.email.split('@')[0],
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create user account');
        }

        const data = await response.json();
        setUserData(data.user);
        setSessionInitialized(true);
        
        // Reset flags after successful signup
        setIsSigningUp(false);
        // Keep isNewUser true until next sign in
      } else {
        setIsNewUser(false);
        const backendUser = await createSession(firebaseUserObj);
        if (backendUser) {
          setUserData(backendUser);
          setSessionInitialized(true);
        }
      }
    } catch (error) {
      console.error('Error in signInUser:', error);
      setUserData(null);
      setIsSigningUp(false);
      setIsNewUser(false);
    }
  }, [createSession]);

  const signOutUser = useCallback(async () => {
    try {
      await auth.signOut();
      await apiSignOutUser();
      setFirebaseUser(null);
      setUserData(null);
      setSessionInitialized(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  const contextValue = useMemo(() => ({
    user: firebaseUser ? { 
      ...firebaseUser, 
      ...userData,
      isAdmin: userData?.role === 'admin'
    } : null,
    loading,
    error,
    signInUser,
    signOutUser,
  }), [firebaseUser, userData, loading, error, signInUser, signOutUser]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
