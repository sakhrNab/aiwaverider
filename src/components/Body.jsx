// src/components/Body.jsx

import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Welcome from './Welcome';
import Carousel from './Carousel';
import BookingHeader from './BookingHeader';
import { PostsContext } from '../contexts/PostsContext';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getProfile } from '../utils/api';
import { CATEGORIES } from '../constants/categories';
// Import AI-themed spinner components
import { MoonLoader, PulseLoader } from 'react-spinners';
import { FaExclamationTriangle } from 'react-icons/fa';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

const Body = () => {
  const { fetchCarouselData } = useContext(PostsContext);
  const { user } = useContext(AuthContext);
  const { darkMode } = useTheme();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userPreferences, setUserPreferences] = useState(() => {
    // Initialize from cache if available
    const cached = localStorage.getItem(`userPreferences_${user?.uid}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return {
          ...data,
          likedCategories: new Set(data.likedCategories)
        };
      }
    }
    return {
      interests: [],
      favorites: [],
      likedCategories: new Set()
    };
  });

  // Extract search query from URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const queryFromUrl = queryParams.get('q');
    setSearchQuery(queryFromUrl || '');
  }, [location.search]);

  // Memoize the loadData function
  const loadData = useCallback(async (force = false) => {
    try {
      setIsLoading(true);
      setLoadError(null);

      // 1. Get user profile if user is logged in
      let profile = { interests: [], favorites: [] };
      const newLikedCategories = new Set();
      
      if (user) {
        try {
          // Check cache first
          const cacheKey = `profileData_${user.uid}`;
          const cached = localStorage.getItem(cacheKey);
          if (!force && cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
              profile = data;
            } else {
              profile = await getProfile();
              // Update cache
              localStorage.setItem(cacheKey, JSON.stringify({
                data: profile,
                timestamp: Date.now()
              }));
            }
          } else {
            profile = await getProfile();
            // Update cache
            localStorage.setItem(cacheKey, JSON.stringify({
              data: profile,
              timestamp: Date.now()
            }));
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
          // Continue with default profile values
        }
      }
      
      // 2. Initialize user preferences
      const newPreferences = {
        interests: profile.interests || [],
        favorites: profile.favorites || [],
        likedCategories: newLikedCategories
      };

      // 3. Load carousel data - pass true to skip comments since we don't need them for the carousel
      try {
        const carouselResult = await fetchCarouselData(CATEGORIES, force, true);
        
        // 4. Process the posts from carousel data
        if (carouselResult && Object.keys(carouselResult).length > 0) {
          const allPosts = Object.values(carouselResult).flat();
          
          // Update liked categories from posts
          if (user) {
            allPosts.forEach(post => {
              if (post.likes?.includes(user.uid)) {
                newLikedCategories.add(post.category);
              }
            });
          }
        }
      } catch (err) {
        console.error('Error loading carousel data:', err);
        setLoadError('Failed to load carousel data');
      }

      // Update state and cache
      setUserPreferences(newPreferences);

      if (user) {
        localStorage.setItem(`userPreferences_${user.uid}`, JSON.stringify({
          data: {
            ...newPreferences,
            likedCategories: Array.from(newPreferences.likedCategories)
          },
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setLoadError(err.message || 'Failed to load data');
      } finally {
        setIsLoading(false);
    }
  }, [user, fetchCarouselData]);

  // Load data on mount and when user changes
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;
    
    const loadInitialData = async () => {
      // Check if we have valid cached data
      const cached = localStorage.getItem(`userPreferences_${user?.uid}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setUserPreferences({
            ...data,
            likedCategories: new Set(data.likedCategories)
          });
          setIsLoading(false);
          return;
        }
      }

      // If no valid cache, load fresh data
      if (isMounted) {
        await loadData(false);
      }
    };

    loadInitialData();
    
    return () => {
      controller.abort();
      isMounted = false;
    };
  }, [loadData, user]);

  // Refresh data periodically (every 15 minutes instead of 5)
  useEffect(() => {
    let timeoutId;
    
    const scheduleNextRefresh = () => {
      const lastUpdate = localStorage.getItem(`userPreferences_${user?.uid}`);
      if (lastUpdate) {
        const { timestamp } = JSON.parse(lastUpdate);
        // Increase refresh interval to 15 minutes (3 times the cache duration)
        const timeUntilNextRefresh = Math.max(0, CACHE_DURATION * 3 - (Date.now() - timestamp));
        
        // Clear any existing timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Schedule next refresh
        timeoutId = setTimeout(() => {
          // Only refresh if the page is visible to the user
          if (!document.hidden) {
            loadData(true).then(() => {
              // Only schedule next refresh after current one completes
              scheduleNextRefresh();
            });
          } else {
            // If page is hidden, check again in a minute
            setTimeout(scheduleNextRefresh, 60000);
          }
        }, timeUntilNextRefresh);
      }
    };

    if (user) {
      scheduleNextRefresh();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loadData, user]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96">
        <div className="mb-4">
          <MoonLoader color="#4A90E2" size={60} speedMultiplier={0.7} />
        </div>
        <div className="mt-4 text-blue-500 text-lg font-medium">
          <PulseLoader color="#4A90E2" size={10} speedMultiplier={0.7} />
        </div>
        <p className="mt-6 text-gray-500">Loading AI insights...</p>
      </div>
    );
  }

  if (loadError) {
    return <div className="text-red-500 text-center p-4">
      Error: {loadError}
    </div>;
  }

  return (
    <div className={`min-h-screen ${darkMode ? "dark bg-[#2D1846]" : "bg-gray-50"} bg-gradient-to-br from-[#4158D0] via-[#C850C0] to-[#FFCC70] stars-pattern`}>
      {/* Add BookingHeader at the top */}
      <BookingHeader />
      
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <MoonLoader color="#4F46E5" loading={isLoading} size={60} />
          </div>
        ) : loadError ? (
          <div className="text-center p-12 bg-white bg-opacity-10 backdrop-blur-lg rounded-xl shadow-lg">
            <div className="text-red-500 text-xl mb-4">
              <FaExclamationTriangle className="inline-block mr-2" />
              Error loading content
            </div>
            <p className="text-white mb-4">{loadError}</p>
            <button 
              onClick={() => loadData(true)} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <Welcome searchQuery={searchQuery} userPreferences={userPreferences} />
            <Carousel />
          </>
        )}
      </div>
    </div>
  );
};

export default Body;
