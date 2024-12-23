// src/contexts/AuthContext.jsx

import React, { createContext, useState, useEffect } from 'react';
import { signIn, signOutUser as apiSignOutUser } from '../utils/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // User object
  const [token, setToken] = useState(null); // JWT token
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

  const signInUser = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', jwtToken);
  };

  const signOutUser = async () => { // Correctly named
    try {
      const data = await apiSignOutUser(token); // Pass the token
      console.log(data.message);
    } catch (error) {
      console.error('Error signing out:', error);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, signInUser, signOutUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
