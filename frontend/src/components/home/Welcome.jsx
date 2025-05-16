import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const Welcome = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoId = 'ZJ7B6JRbk3Q';
  const { darkMode } = useTheme();

  const handleVideoLoad = () => {
    setIsLoading(false);
    setHasError(false); // Reset error state on successful load
  };

  useEffect(() => {
    // Timeout to handle load failure
    const timeout = setTimeout(() => {
      if (isLoading) {
        setHasError(true);
        setIsLoading(false);
      }
    }, 5000); // 5 seconds timeout

    return () => clearTimeout(timeout); // Cleanup timeout
  }, [isLoading]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
      {/* Text Section */}
      <div className="flex flex-col justify-center">
        <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Revolutionizing AI Integration
        </h1>
        <p className={`text-xl md:text-2xl ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          AI Waverider helps you navigate the complex world of artificial intelligence,
          making it accessible and practical for your business needs.
        </p>
      </div>

      {/* Video Section */}
      <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden relative">
        {/* Loading Spinner */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        )}

        {/* Error Message */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-red-500 text-center">
              Unable to load the video. Please try again later.
            </p>
          </div>
        )}

        {/* YouTube Embed */}
        {!hasError && (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?controls=1&rel=0`}
            title="AI Waverider Introduction"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={handleVideoLoad}
          />
        )}
      </div>
    </div>
  );
};

export default Welcome;
