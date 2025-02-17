// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth } from '../utils/firebase';
import { 
  API_URL, 
  signOutUser as apiSignOutUser, 
  createSession as apiCreateSession, 
  getProfile  // we'll call this once user is known
} from '../utils/api';

// Create the context
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Raw Firebase user object
  const [firebaseUser, setFirebaseUser] = useState(null);
  // Your custom user data from Firestore or the backend
  const [userData, setUserData] = useState(null);

  // Basic state for loading/error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track if we already created a session & fetched doc
  const [sessionInitialized, setSessionInitialized] = useState(false);

  // These track sign-up flows
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Step 1: create a session on the backend (using your /api/auth/session)
  const createSession = useCallback(async (user) => {
    if (!user) return null;
    const sessionKey =`sessionInitialized_${user.uid}`;
    const isSessionInitialized = localStorage.getItem(sessionKey);
    if (isSessionInitialized) return null; // Skip if already initialized
    try {
      
      const sessionResponse = await apiCreateSession(user);
      localStorage.setItem(sessionKey, 'true');

      // Typically returns: { user: { ...fields } }
      return sessionResponse.user;
    } catch (error) {
      console.error('Session creation error:', error);
      return null;
    }
  }, []);

  // Step 2: signOut function
  const signOutUser = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;

      // Firebase sign out
      await auth.signOut();
      // Your backend sign out
      await apiSignOutUser();

      if (currentUser) {
        localStorage.removeItem(`sessionInitialized_${currentUser.uid}`);
        localStorage.removeItem(`profileData_${currentUser.uid}`);
      }
      // Clear states
      setFirebaseUser(null);
      setUserData(null);
      setSessionInitialized(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  // Called from your sign-in flows if needed
  const signInUser = useCallback(async (firebaseUserObj, isSignup = false) => {
    try {
      if (!firebaseUserObj || typeof firebaseUserObj.getIdToken !== 'function') {
        throw new Error('Invalid Firebase user object');
      }
      setFirebaseUser(firebaseUserObj);

      if (isSignup) {
        setIsSigningUp(true);
        setIsNewUser(true);

        // If you have a separate /api/auth/signup for new users, call it here
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

        setIsNewUser(false);
        setIsSigningUp(false);
      }

      // Create the session
      const backendUser = await createSession(firebaseUserObj);
      if (backendUser) {
        setUserData(backendUser); // Some fields from your backend
      }
      setSessionInitialized(true);

    } catch (error) {
      console.error('Error in signInUser:', error);
      setUserData(null);
      setIsSigningUp(false);
      setIsNewUser(false);
    }
  }, [createSession]);

  // Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fUser) => {
      setLoading(true);
      setError(null);

      if (!fUser) {
        // user is signed out
        setFirebaseUser(null);
        setUserData(null);
        setSessionInitialized(false);
        setIsNewUser(false);
        setLoading(false);
        return;
      }

      // We have a Firebase user
      setFirebaseUser(fUser);


      const sessionKey = `sessionInitialized_${fUser.uid}`;
      const isSessionInitialized = localStorage.getItem(sessionKey);
      const cachedProfile = localStorage.getItem(`profileData_${fUser.uid}`);
      
      // If we haven't already fetched the user doc
      if (isSessionInitialized && cachedProfile) {
        setUserData(JSON.parse(cachedProfile)); // Use cached profile
        setSessionInitialized(true);
        setLoading(false);
        console.log("hello")
        return;
      }
      try {
        console.log("try your luck")
        // Step 1: create the session
        const backendUser = await createSession(fUser);
        const profileDoc = await getProfile();

        // Update cache and state
        localStorage.setItem(`profileData_${fUser.uid}`, JSON.stringify(profileDoc));
        
        setUserData(backendUser);
        // This might contain { photoURL, displayName, role, ... }
        setUserData(profileDoc);

        setSessionInitialized(true);
      } catch (err) {
        console.error('Error in onAuthStateChanged flow:', err);
        setError(err.message);
      }
    setLoading(false);
    });

    return unsubscribe;
  }, [sessionInitialized, createSession]);

  // Merge firebaseUser + userData into a single object
  const mergedUser = useMemo(() => {
    if (!firebaseUser || !userData) return null;
    return {
      ...firebaseUser, // e.g. uid, email, etc.
      ...userData      // e.g. firstName, lastName, photoURL, role, ...
    };
  }, [firebaseUser, userData]);

  // Provide everything in context
  const contextValue = useMemo(() => ({
    user: mergedUser,
    loading,
    error,
    signInUser,
    signOutUser,
    setUserData, // Added for profile update
  }), [mergedUser, loading, error, signInUser, signOutUser, setUserData]);

  // Optionally show a loading spinner while we fetch data
  if (loading) {
    return <div>Loading user...</div>;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
