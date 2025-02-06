// src/components/Body.jsx

import React, { useContext, useEffect, useState } from 'react';
import Welcome from './Welcome';
import Carousel from './Carousel';
import PostList from '../posts/PostList';
import { PostsContext } from '../contexts/PostsContext';

const Body = () => {
  const { fetchAllPosts, getComments, commentsCache } = useContext(PostsContext);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const posts = await fetchAllPosts('All', 10);
        // Only fetch comments if they're not already cached
        posts?.forEach(post => {
          if (!commentsCache[post.id]) {
            getComments(post.id);
          }
        });
      } catch (err) {
        console.error('Error preloading data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []); // Empty dependency array since we only want to load once

  if (isLoading) {
    return <div>Loading...</div>;
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

      {/* Carousel */}
      <div className="my-12">
        <Carousel />
      </div>

      {/* Community Posts */}
      <div className="my-12">
        <PostList />
      </div>
    </div>
  );
};

export default Body;
