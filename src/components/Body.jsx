// src/components/Body.jsx

import React, { useContext, useEffect, useState, useCallback } from 'react';
import Welcome from './Welcome';
import Carousel from './Carousel';
import { PostsContext } from '../contexts/PostsContext';
import { AuthContext } from '../contexts/AuthContext';
import { getProfile } from '../utils/api';
import { CATEGORIES } from '../constants/categories';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

const Body = () => {
  const { fetchCarouselData } = useContext(PostsContext);
  const { user } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
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
    return <div className="flex justify-center items-center h-96">
      <div className="loader">Loading...</div>
    </div>;
  }

  if (loadError) {
    return <div className="text-red-500 text-center p-4">
      Error: {loadError}
    </div>;
  }

  return (
    <div className="p-8 bg-gray-50">
      {/* Welcome Section */}
      <Welcome />

      {/* Introductory Text */}
      <div className="text-center my-8">
        <h2 className="text-3xl font-semibold">Welcome to AI Wave Rider!</h2>
        <p className="mt-4 text-lg text-gray-700 max-w-2xl mx-auto">
          Explore the latest in AI trends, tools, and technologies. Engage with our community and stay updated with the newest advancements.
        </p>
      </div>

      {/* Carousel with user preferences */}
      <div className="my-12">
        <Carousel userPreferences={userPreferences} />
      </div>

      {/* Community Posts with user preferences */}
      {/* <div className="my-12">
        <PostList userPreferences={userPreferences} />
      </div> */}
    </div>
  );
};

export default Body;
