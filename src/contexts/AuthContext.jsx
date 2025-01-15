// src/contexts/AuthContext.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { signOutUser as apiSignOutUser, refreshToken } from '../utils/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasAttemptedInitialAuth = useRef(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Skip if we've already attempted initial auth
        if (hasAttemptedInitialAuth.current) {
          setLoading(false);
          return;
        }

        // Only attempt refresh if we find user data
        const hasRefreshCookie = document.cookie.includes('refreshToken=');
        
        if (!hasRefreshCookie) {
          hasAttemptedInitialAuth.current = true;
          setLoading(false);
          return;
        }

        // Try to refresh token
        const response = await refreshToken();
        if (response.user) {
          setUser(response.user);
        }
      } catch (error) {
        if (!error.message.includes('Unauthorized')) {
          setError(error.message);
        }
        setUser(null);
      } finally {
        hasAttemptedInitialAuth.current = true;
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Only set up refresh interval if user is logged in
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        const response = await refreshToken();
        if (!response.user) {
          logout();
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        logout();
      }
    }, 23 * 60 * 60 * 1000); // Refresh every 23 hours

    return () => clearInterval(refreshInterval);
  }, [user]);

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
    }
  }, [logout]);

  const contextValue = useMemo(
    () => ({
      user,
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
