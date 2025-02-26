// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../utils/firebase';
import { getProfile, updateProfile } from '../utils/api';
import { db } from '../utils/firebase';

export const AuthContext = createContext(null);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cache management functions
  const getCacheKey = useCallback((type, id) => {
    return `auth_${type}_${id}`;
  }, []);

  const getFromCache = useCallback((type, id) => {
    const key = getCacheKey(type, id);
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
      localStorage.removeItem(key);
    }
    return null;
  }, [getCacheKey]);

  const setInCache = useCallback((type, id, data) => {
    const key = getCacheKey(type, id);
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }, [getCacheKey]);

  const clearCache = useCallback((type, id) => {
    if (id) {
      localStorage.removeItem(getCacheKey(type, id));
    } else {
      Object.keys(localStorage)
        .filter(key => key.startsWith('auth_'))
        .forEach(key => localStorage.removeItem(key));
    }
  }, [getCacheKey]);

  // Fetch user profile with caching
  const fetchUserProfile = useCallback(async (uid, force = false) => {
    try {
      if (!force) {
        const cachedProfile = getFromCache('profile', uid);
        if (cachedProfile) {
          return cachedProfile;
        }
      }

      const profile = await getProfile(uid);
      if (profile) {
        setInCache('profile', uid, profile);
      }
      return profile;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      throw err;
    }
  }, [getFromCache, setInCache]);

  // Update user profile and invalidate cache
  const updateUserProfile = useCallback(async (uid, updates) => {
    try {
      const updatedProfile = await updateProfile(updates);
      if (updatedProfile) {
        clearCache('profile', uid);
        setUser(prev => ({
          ...prev,
          ...updatedProfile
        }));
      }
      return updatedProfile;
    } catch (err) {
      console.error('Error updating user profile:', err);
      throw err;
    }
  }, [clearCache]);

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const { uid, email, displayName } = firebaseUser;
          
          // Check cache first
          const cachedProfile = getFromCache('profile', uid);
          let userProfile;
          
          if (cachedProfile && (Date.now() - cachedProfile.timestamp) < CACHE_DURATION) {
            userProfile = cachedProfile.data;
          } else {
            // Fetch fresh profile from Firestore
            const userDoc = await db.collection('users').doc(uid).get();
            userProfile = userDoc.exists ? userDoc.data() : null;
            
            if (userProfile) {
              setInCache('profile', uid, {
                data: userProfile,
                timestamp: Date.now()
              });
            }
          }

          const userData = {
            uid,
            email,
            displayName,
            photoURL: userProfile?.photoURL || firebaseUser.photoURL,
            role: userProfile?.role || 'authenticated', // Include role from Firestore
            ...userProfile
          };

          setUser(userData);
        } else {
          setUser(null);
          clearCache();
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [getFromCache, setInCache, clearCache]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
      clearCache();
      setUser(null);
    } catch (err) {
      console.error('Error signing out:', err);
      throw err;
    }
  }, [clearCache]);

  const value = {
    user,
    loading,
    error,
    fetchUserProfile,
    updateUserProfile,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
