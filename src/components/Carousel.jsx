// CLIENT CODE EXAMPLE
// File: src/components/Carousel.jsx
// --------------------------------
import React, { useState, useEffect, useContext } from 'react';
import Slider from 'react-slick';
import CardBox from './CardBox';
import { API_URL } from '../utils/api';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import '../styles/carousel.css';
import { Link } from 'react-router-dom';
import { PostsContext } from '../contexts/PostsContext';

// If you want to fetch multiple categories dynamically, define them here
// If you have more categories, just add them to this array
import { CATEGORIES } from '../constants/categories'

const Carousel = () => {
  const { carouselData, fetchCarouselData, loadingPosts } = useContext(PostsContext);
  const [error, setError] = useState('');
  const [sections, setSections] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadCarouselData = async () => {
      // Skip if we already loaded
      if (isLoaded && Object.keys(carouselData).length > 0) {
        console.log('Using cached carousel data');
        return;
      }

      try {
        console.log('Fetching carousel data');
        const data = await fetchCarouselData(CATEGORIES);
        
        const builtSections = Object.entries(data).map(([categoryName, postsArray]) => ({
          title: categoryName,
          boxes: postsArray.map(post => ({
            id: post.id,
            image: post.imageUrl || '/images/default.jpg',
            title: post.title,
            description: post.description,
          })),
        }));
        
        setSections(builtSections);
        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading carousel data:', err);
        setError(err.message || 'Failed to load carousel data');
      }
    };

    loadCarouselData();
  }, [carouselData, fetchCarouselData, isLoaded]);

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

  if (loadingPosts) {
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
      {/* Render one main slide per category */}
      <Slider {...mainSettings}>
        {sections.map((section, sectionIndex) => (
          <div key={`section-${sectionIndex}`} className="carousel-slide">
            <h2 className="text-2xl font-bold mb-6 text-center">{section.title}</h2>
            {section.boxes.length > 0 ? (
              <Slider {...boxSettings}>
                {section.boxes.map((box, boxIndex) => (
                  <div key={`${section.title}-${box.id}-${boxIndex}`}>
                    <Link to={`/posts/${box.id}`}>
                      <CardBox {...box} />
                    </Link>
                  </div>
                ))}
              </Slider>
            ) : (
              <p className="text-center text-gray-500">
                No posts available in this category.
              </p>
            )}
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default Carousel;
