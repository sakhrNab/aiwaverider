import React, { useState, useEffect } from 'react';
import { HashLoader } from 'react-spinners';

const Home = () => {
  const [loading, setLoading] = useState(true);
  
  // Simulate loading state for demonstration
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-b from-gray-900 to-blue-900">
        <div className="mb-8">
          <HashLoader color="#4FD1C5" size={70} speedMultiplier={0.8} />
        </div>
        <div className="text-white text-xl font-semibold mt-4">
          Initializing AI Wave Rider
        </div>
        <div className="text-blue-300 text-sm mt-2">
          Connecting to neural networks...
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-8 text-center">
      <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">Welcome to AI Wave Rider!</h1>
      <p className="mt-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl">
        Explore the world of AI trends, tools, and latest technology.
      </p>
    </div>
  );
};

export default Home;
