// CLIENT CODE EXAMPLE
// File: src/components/Carousel.jsx
// --------------------------------
import React, { useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import Slider from 'react-slick';
import CardBox from '../common/CardBox';
import { PostsContext } from '../../contexts/PostsContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CATEGORIES } from '../../constants/categories';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './carousel.css';
import { Link } from 'react-router-dom';

const Carousel = ({ userPreferences, searchQuery }) => {
  const { carouselData, loadingPosts } = useContext(PostsContext);
  const { darkMode } = useTheme();
  const [sections, setSections] = useState([]);
  const [error, setError] = useState(null);

  // Process and organize carousel data
  const processCarouselData = useCallback(() => {
    if (!carouselData || !userPreferences) {
      console.log('Missing data:', { carouselData: !!carouselData, userPreferences: !!userPreferences });
      return [];
    }

    try {
      // Get user interests and liked categories
      const userInterests = userPreferences.interests || [];
      const likedCategoriesArray = Array.from(userPreferences.likedCategories || new Set());
      
      // Get all available categories that have posts
      const availableCategories = Object.keys(carouselData).filter(
        category => carouselData[category]?.length > 0
      );

      if (availableCategories.length === 0) {
        console.log('No categories with posts found');
        return [];
      }
      
      // First, filter posts by search query if present
      let filteredCarouselData = { ...carouselData };
      
      if (searchQuery && searchQuery.trim() !== '') {
        const lowerCaseQuery = searchQuery.trim().toLowerCase();
        
        // Create a new object with filtered posts for each category
        filteredCarouselData = Object.keys(carouselData).reduce((filtered, category) => {
          // Filter posts in this category that match the search query
          const matchingPosts = carouselData[category].filter(post => {
            const titleMatch = post.title?.toLowerCase().includes(lowerCaseQuery);
            const descriptionMatch = post.description?.toLowerCase().includes(lowerCaseQuery);
            const categoryMatch = category.toLowerCase().includes(lowerCaseQuery);
            const tagsMatch = post.tags?.some(tag => tag.toLowerCase().includes(lowerCaseQuery));
            
            return titleMatch || descriptionMatch || categoryMatch || tagsMatch;
          });
          
          // Only add categories that have matching posts
          if (matchingPosts.length > 0) {
            filtered[category] = matchingPosts;
          }
          
          return filtered;
        }, {});
        
        // If no matches found in any category
        if (Object.keys(filteredCarouselData).length === 0) {
          console.log('No matching posts found for query:', searchQuery);
        }
      }

      // Create array of all categories with their priority
      const categoriesWithPriority = Object.keys(filteredCarouselData)
        .filter(category => filteredCarouselData[category]?.length > 0)
        .map(category => ({
          category,
          priority: userInterests.includes(category) ? 2 :
                   likedCategoriesArray.includes(category) ? 1 : 0,
          posts: filteredCarouselData[category] || []
        }));

      // Sort by priority (highest first) but keep all categories
      categoriesWithPriority.sort((a, b) => {
        // First sort by priority
        const priorityDiff = b.priority - a.priority;
        if (priorityDiff !== 0) return priorityDiff;
        
        // If same priority, sort by number of posts
        return b.posts.length - a.posts.length;
      });

      console.log('Processed categories:', categoriesWithPriority.map(c => ({
        category: c.category,
        priority: c.priority,
        postsCount: c.posts.length
      })));

      return categoriesWithPriority;
    } catch (err) {
      console.error('Error processing carousel data:', err);
      setError('Failed to process carousel data');
      return [];
    }
  }, [carouselData, userPreferences, searchQuery]);

  // Update sections when data changes
  useEffect(() => {
    const processedData = processCarouselData();
    if (processedData.length > 0) {
      setSections(processedData);
    } else if (searchQuery) {
      // Clear sections if there are no matches for the search query
      setSections([]);
    }
  }, [processCarouselData, searchQuery]);

  // Slider settings
  const mainSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    autoplay: !searchQuery, // Disable autoplay when searching
    autoplaySpeed: 5000,
    fade: true,
    className: 'main-slider',
  };

  const boxSettings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
    arrows: true,
    className: 'box-slider',
    responsive: [
      {
        breakpoint: 1440,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        }
      }
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

  // Show no results message when searching with no matches
  if (searchQuery && sections.length === 0) {
    return (
      <div className={`p-8 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg text-center`}>
        <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-2`}>No results found</h3>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          We couldn't find any content matching "{searchQuery}". 
          Try different keywords or browse our categories.
        </p>
      </div>
    );
  }

  return (
    <div className="carousel-container">
      {sections.length > 0 ? (
        <Slider {...mainSettings}>
          {sections.map((section, sectionIndex) => (
            <div key={`section-${sectionIndex}`} className="carousel-slide">
              <h2 className={`text-2xl font-bold mb-6 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {section.category}
                {userPreferences.interests.includes(section.category) && (
                  <span className="ml-2 text-sm text-blue-500">(Interested)</span>
                )}
              </h2>
              {section.posts.length > 0 ? (
                <Slider {...boxSettings}>
                  {section.posts.map((post, postIndex) => (
                    <div key={`${section.category}-${post.id}-${postIndex}`} className="px-2">
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
                <p className={`text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  No posts available in this category
                </p>
              )}
            </div>
          ))}
        </Slider>
      ) : (
        <p className={`text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
  searchQuery: PropTypes.string,
};

Carousel.defaultProps = {
  searchQuery: '',
};

export default Carousel;
