// src/contexts/AuthContext.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { signOutUser as apiSignOutUser, refreshToken } from '../utils/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasAttemptedInitialAuth = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Skip if we've already attempted initial auth
        if (hasAttemptedInitialAuth.current) {
          setLoading(false);
          return;
        }

        // Attempt to refresh token
        const response = await refreshToken();
        if (response.user) {
          setUser(response.user);
        } else {
          // Clear user state and any cached data
          setUser(null);
          localStorage.clear();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setUser(null);
        localStorage.clear();
      } finally {
        hasAttemptedInitialAuth.current = true;
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initAuth();
  }, []);

  // Prevent token refresh if not initialized
  useEffect(() => {
    if (!isInitialized || !user) return;

    const refreshInterval = setInterval(async () => {
      try {
        const response = await refreshToken();
        if (!response.user) {
          // If refresh fails, log out
          await signOutUser();
        } else {
          // Update user data if it changed
          setUser(response.user);
        }
      } catch (error) {
        if (!error.message?.includes('401')) {
          console.error('Token refresh failed:', error);
        }
        await signOutUser();
      }
    }, 23 * 60 * 60 * 1000); // refresh every 24 hrs Refresh every 14 minutes (well before token expiry)14 * 60 * 1000

    return () => clearInterval(refreshInterval);
  }, [user, isInitialized]);

  const signInUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await apiSignOutUser();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      logout();
      // Force a page reload to clear any remaining state
      window.location.href = '/';
    }
  }, [logout]);

  const contextValue = useMemo(
    () => ({
      user,
      role: user?.role || null, // Add role explicitly
      signInUser,
      signOutUser,
      loading,
      error,
    }),
    [user, signInUser, signOutUser, loading, error]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
