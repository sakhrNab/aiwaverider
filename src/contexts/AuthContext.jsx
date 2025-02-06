// src/contexts/AuthContext.jsx

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { auth } from '../utils/firebase';
import { API_URL, signOutUser as apiSignOutUser } from '../utils/api'; // Import the backend signOutUser

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null); // Firebase User object
  const [userData, setUserData] = useState(null);         // Backend user data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [user, setUser] = useState(null); // <-- Added user state

  /**
   * Calls /api/auth/session with the user's ID token to create/verify a session.
   * (No longer checks `isNewUser` so that newly created users can get a session.)
   */
  const createSession = useCallback(async (user) => {
    if (!user) return null; // <-- UPDATED: remove the "|| isNewUser" check

    try {
      const token = await user.getIdToken(true);

      if (isSigningUp && sessionInitialized){
        return null;
      } 

        const response = await fetch(`${API_URL}/api/auth/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
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
  }, []);

  /**
   * Watch for Firebase auth state changes.
   * If there's a user, and we're not in the middle of signing up,
   * we'll call createSession if it isn't already initialized.
   */
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        setLoading(true);
        if (firebaseUser) {
          console.log('Auth state changed:', {
            isSigningUp,
            isNewUser,
            sessionInitialized
          });
          setFirebaseUser(firebaseUser);

          // Get the user's role and other data from your backend
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
              setUser({
                ...firebaseUser,
                role: data.user.role
              });
            }
          } catch (error) {
            console.error('Error getting user session:', error);
            setUser(null);
          }

          // Skip session creation if we're signing up or
          // already flagged as "new user" or if session is set
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
          setUser(null); // <-- Added user state reset
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [
    sessionInitialized,
    createSession,
    isSigningUp,
    isNewUser
  ]);

  /**
   * Called by your SignIn or SignUp components after a Firebase auth popup resolves.
   * If isSignup = true, we first create the user doc in Firestore (via /api/auth/signup),
   * then we manually call createSession to ensure the doc is ready, and only then
   * do we set sessionInitialized, isNewUser, etc.
   */
  const signInUser = useCallback(async (firebaseUserObj, isSignup = false) => {
    try {
      if (!firebaseUserObj || typeof firebaseUserObj.getIdToken !== 'function') {
        throw new Error('Invalid Firebase user object');
      }

      setFirebaseUser(firebaseUserObj);

      if (isSignup) {
        // Mark that we are in sign-up mode
        setIsSigningUp(true);
        setIsNewUser(true);

        // 1) Create Firestore doc:
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

        // 2) Now that the doc exists, create the session:
        //    We'll temporarily set isNewUser to false so createSession is allowed
        setIsNewUser(false); // <-- UPDATED to allow the session
        const backendUser = await createSession(firebaseUserObj);
        if (backendUser) {
          setUserData(backendUser);
        }
        setSessionInitialized(true);

        // Reset flags after successful signup
        // setIsSigningUp(false);

        // If you WANT to keep "isNewUser" true for other reasons, re-set it here:
        // setIsNewUser(true);

      } else {
        // Normal sign-in flow
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

  /**
   * Sign out from Firebase and remove session cookies in the backend.
   */
  const signOutUser = useCallback(async () => {
    try {
      await auth.signOut();
      // If you have an API signout route on the backend, call it:
      await apiSignOutUser();

      setFirebaseUser(null);
      setUserData(null);
      setSessionInitialized(false);
      setUser(null); // <-- Added user state reset
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  /**
   * The value we provide to our AuthContext consumers.
   * Merges the Firebase user object with the userData from the backend.
   */
  const contextValue = useMemo(() => ({
    user: firebaseUser
      ? {
          ...firebaseUser,
          ...userData,
          isAdmin: userData?.role === 'admin'
        }
      : null,
    loading,
    error,
    signInUser,
    signOutUser,
  }), [
    firebaseUser,
    userData,
    loading,
    error,
    signInUser,
    signOutUser
  ]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
