// src/components/Body.jsx

import React from 'react';
import Welcome from './Welcome';
import Carousel from './Carousel';
import PostList from '../posts/PostList';

const Body = () => {
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
