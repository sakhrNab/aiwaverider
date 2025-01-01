// src/contexts/AuthContext.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { signOutUser as apiSignOutUser } from '../utils/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || null;
  });
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  // Memoize signInUser using useCallback
  const signInUser = useCallback((userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', jwtToken);
  }, []);

  // Memoize signOutUser using useCallback
  const signOutUser = useCallback(async () => {
    try {
      const data = await apiSignOutUser(token); // Pass the token
      console.log(data.message);
    } catch (error) {
      console.error('Error signing out:', error);
    }
    logout();
  }, [token]);

  // Logout function
  const logout = useCallback(() => {
    // Clear auth data
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    // Optionally, clear other caches or reset contexts here
  }, []);

  // Memoize context value using useMemo
  const contextValue = useMemo(
    () => ({
      user,
      token,
      signInUser,
      signOutUser,
      loading,
    }),
    [user, token, signInUser, signOutUser, loading]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
