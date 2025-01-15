// src/contexts/AuthContext.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { signOutUser as apiSignOutUser, refreshToken } from '../utils/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Remove token-related state and storage

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to refresh the token on initial load
        const response = await refreshToken();
        if (response.user) {
          setUser(response.user);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      if (user) {
        try {
          await refreshToken();
        } catch (error) {
          console.error('Token refresh failed:', error);
          // If refresh fails, log out the user
          logout();
        }
      }
    }, 23 * 60 * 60 * 1000); // Refresh every 23 hours

    return () => clearInterval(refreshInterval);
  }, [user]);

  const signInUser = useCallback((userData) => {
    setUser(userData);
    // No need to handle token - it's in HTTP-only cookie
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await apiSignOutUser();
      logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    // No need to handle token - it's in HTTP-only cookie
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      signInUser,
      signOutUser,
      loading,
    }),
    [user, signInUser, signOutUser, loading]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
