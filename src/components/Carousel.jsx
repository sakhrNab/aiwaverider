// CLIENT CODE EXAMPLE
// File: src/components/Carousel.jsx
// --------------------------------
import React, { useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import Slider from 'react-slick';
import CardBox from './CardBox';
import { PostsContext } from '../contexts/PostsContext';
import { CATEGORIES } from '../constants/categories';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import '../styles/carousel.css';
import { Link } from 'react-router-dom';

const Carousel = ({ userPreferences }) => {
  const { carouselData, loadingPosts } = useContext(PostsContext);
  const [sections, setSections] = useState([]);
  const [error, setError] = useState(null);

  // Calculate priority for sorting sections
  const calculatePriority = useCallback((category, preferences) => {
    let priority = 0;
    if (preferences.interests.includes(category)) priority += 3;
    if (preferences.likedCategories.has(category)) priority += 2;
    if (preferences.favorites.some(post => post.category === category)) priority += 1;
    return priority;
  }, []);

  // Process carousel data when it changes
  useEffect(() => {
    if (!carouselData || Object.keys(carouselData).length === 0) {
      return;
    }

    try {
      // Process and sort the sections
      const processedSections = Object.entries(carouselData).map(([category, posts]) => ({
        category,
        posts: posts || [],
        priority: calculatePriority(category, userPreferences)
      }));

      const sortedSections = processedSections
        .filter(section => section.posts.length > 0)
        .sort((a, b) => b.priority - a.priority);

      setSections(sortedSections);
    } catch (err) {
      console.error('Error processing carousel data:', err);
      setError('Failed to process content. Please try again later.');
    }
  }, [carouselData, userPreferences, calculatePriority]);

  // Helper function to calculate post priority score
  const getPostScore = (post, userPreferences) => {
    let score = 0;
    
    // Check if post content matches user interests
    if (userPreferences.interests && userPreferences.interests.length > 0) {
      userPreferences.interests.forEach(interest => {
        // Check title
        if (post.title?.toLowerCase().includes(interest.toLowerCase())) {
          score += 3;
        }
        // Check description
        if (post.description?.toLowerCase().includes(interest.toLowerCase())) {
          score += 2;
        }
        // Check content/additionalHTML
        if (post.additionalHTML?.toLowerCase().includes(interest.toLowerCase())) {
          score += 2;
        }
        // Check category
        if (post.category?.toLowerCase().includes(interest.toLowerCase())) {
          score += 3;
        }
      });
    }
    
    // Add points for favorites
    if (userPreferences.favorites?.includes(post.id)) {
      score += 5;
    }
    
    // Add points for liked categories
    if (userPreferences.likedCategories?.has(post.category)) {
      score += 1;
    }
    
    return score;
  };

  // Helper function to sort categories based on user preferences
  const sortCategories = (categories, preferences) => {
    return [...categories].sort((a, b) => {
      const aScore = getCategoryScore(a, preferences);
      const bScore = getCategoryScore(b, preferences);
      return bScore - aScore;
    });
  };

  // Helper function to calculate category priority score
  const getCategoryScore = (category, preferences) => {
    let score = 0;
    
    // Highest priority: user's explicit interests
    if (preferences.interests.includes(category)) {
      score += 3;
    }
    
    // Medium priority: categories of favorited content
    if (preferences.favorites.some(fav => fav.category === category)) {
      score += 2;
    }
    
    // Lower priority: categories user has liked content in
    if (preferences.likedCategories.has(category)) {
      score += 1;
    }
    
    return score;
  };

  // Slider configs
  const mainSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    autoplay: true,
    autoplaySpeed: 5000,
    fade: true,
    className: 'main-slider',
  };

  const boxSettings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: false,
    className: 'box-slider',
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  if (loadingPosts && sections.length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="loader">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="carousel-container">
      {sections.length > 0 ? (
        <Slider {...mainSettings}>
          {sections.map((section, sectionIndex) => (
            <div key={`section-${sectionIndex}`} className="carousel-slide">
              <h2 className="text-2xl font-bold mb-6 text-center">
                {section.category}
                {userPreferences.interests.includes(section.category) && (
<span className="ml-2 text-sm text-blue-500">(Interested)</span>
                )}
              </h2>
              {section.posts.length > 0 ? (
                <Slider {...boxSettings}>
                  {section.posts.map((post, postIndex) => (
                    <div key={`${section.category}-${post.id}-${postIndex}`}>
                      <Link to={`/posts/${post.id}`}>
                        <CardBox 
                          {...post} 
                          isFavorite={userPreferences.favorites.includes(post.id)}
                        />
                      </Link>
                    </div>
                  ))}
                </Slider>
              ) : (
                <p className="text-center text-gray-500">
                  No posts available in this category
                </p>
              )}
            </div>
          ))}
        </Slider>
      ) : (
        <p className="text-center text-gray-500">
          No content available at the moment
        </p>
      )}
    </div>
  );
};

Carousel.propTypes = {
  userPreferences: PropTypes.shape({
    interests: PropTypes.arrayOf(PropTypes.string),
    favorites: PropTypes.arrayOf(PropTypes.string),
    likedCategories: PropTypes.instanceOf(Set),
  }).isRequired,
};

export default Carousel;
