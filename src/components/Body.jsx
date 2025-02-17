// src/components/Body.jsx

import React, { useContext, useEffect, useState } from 'react';
import Welcome from './Welcome';
import Carousel from './Carousel';
import PostList from '../posts/PostList';
import { PostsContext } from '../contexts/PostsContext';
import { AuthContext } from '../contexts/AuthContext';
import { getProfile } from '../utils/api';
import { CATEGORIES } from '../constants/categories';

const Body = () => {
  const { fetchAllPosts, getComments, commentsCache, fetchCarouselData } = useContext(PostsContext);
  const { user } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(true);
  const [userPreferences, setUserPreferences] = useState({
    interests: [],
    favorites: [],
    likedCategories: new Set(),
  });

  // Memoize the loadData function to prevent recreation on every render
  const loadData = React.useCallback(async () => {
    try {
      if (user) {
        // 1. First get user profile
        const profile = await getProfile();
        const likedCategories = new Set();
        
        // 2. Initialize user preferences with profile data
        setUserPreferences({
          interests: profile.interests || [],
          favorites: profile.favorites || [],
          likedCategories,
        });

        // 3. Load carousel data first (this will also populate posts)
        await fetchCarouselData(CATEGORIES);

        // 4. Then fetch additional posts if needed
        const posts = await fetchAllPosts('All', 10);
        
        // 5. Update liked categories from posts
        if (posts) {
          posts.forEach(post => {
            if (post.likes?.includes(user.uid)) {
              likedCategories.add(post.category);
              setUserPreferences(prev => ({
                ...prev,
                likedCategories: new Set([...prev.likedCategories, post.category])
              }));
            }
          });

          // 6. Fetch comments for posts if needed
          posts.forEach(post => {
            if (!commentsCache[post.id]) {
              getComments(post.id);
            }
          });
        }
      }
    } catch (err) {
      console.error('Error preloading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchAllPosts, getComments, commentsCache, fetchCarouselData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-96">
      <div className="loader">Loading...</div>
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
      <div className="my-12">
        <PostList userPreferences={userPreferences} />
      </div>
    </div>
  );
};

export default Body;
