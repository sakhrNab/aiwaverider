// src/contexts/AuthContext.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth } from '../utils/firebase';
import { API_URL, signOutUser as apiSignOutUser, createSession as apiCreateSession } from '../utils/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null); // Firebase User object
  const [userData, setUserData] = useState(null);           // Backend user data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [user, setUser] = useState(null); // Merged global user

  // Use API's createSession (Axios based)
  const createSession = useCallback(async (user) => {
    if (!user) return null;
    try {
      const sessionResponse = await apiCreateSession(user);
      return sessionResponse.user;
    } catch (error) {
      console.error('Session creation error:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        setLoading(true);
        if (firebaseUser) {
          console.log('Auth state changed:', { isSigningUp, isNewUser, sessionInitialized });
          setFirebaseUser(firebaseUser);

          // Get the user's role and other data from backend via a session call using fetch (Axios interceptor will work on fetch as well)
          const token = await firebaseUser.getIdToken();
          try {
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
              setUser({ ...firebaseUser, role: data.user.role });
            }
          } catch (error) {
            console.error('Error getting user session:', error);
            setUser(null);
          }

          if (!isSigningUp && !isNewUser && !sessionInitialized) {
            const backendUser = await createSession(firebaseUser);
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
          setUser(null);
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
            Authorization: `Bearer ${token}`
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
        setIsNewUser(false);
        const backendUser = await createSession(firebaseUserObj);
        if (backendUser) {
          setUserData(backendUser);
        }
        setSessionInitialized(true);
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
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  const contextValue = useMemo(() => ({
    user: firebaseUser ? { ...firebaseUser, ...userData, isAdmin: userData?.role === 'admin' } : null,
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

export default AuthContext;
