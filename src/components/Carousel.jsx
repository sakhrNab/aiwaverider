// CLIENT CODE EXAMPLE
// File: src/components/Carousel.jsx
// --------------------------------
import React, { useState, useEffect } from 'react';
import Slider from 'react-slick';
import CardBox from './CardBox';
import { API_URL } from '../utils/api';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import '../styles/carousel.css';
import { Link } from 'react-router-dom';

// If you want to fetch multiple categories dynamically, define them here
// If you have more categories, just add them to this array
import { CATEGORIES } from '../constants/categories'

const Carousel = () => {
  const [carouselData, setCarouselData] = useState([]); 
  const [error, setError] = useState('');

  useEffect(() => {
    // Turn array into comma-separated string for the new endpoint
    const joinedCategories = CATEGORIES.join(',');

    const fetchCarouselData = async () => {
      try {
        // Hit the single "multi" endpoint
        const url = `${API_URL}/api/posts/multi?categories=${encodeURIComponent(joinedCategories)}&limit=5`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch posts (status ${response.status})`);
        }

        const json = await response.json();
        // json.data is shaped like { "Trends": [...], "Latest Tech": [...], "AI Tools": [...] }

        // Convert the returned object into an array of sections for the slider
        // e.g. [ { title: 'Trends', boxes: [...] }, { title: 'Latest Tech', boxes: [...] }, ... ]
        const builtSections = Object.entries(json.data).map(([categoryName, postsArray]) => ({
          title: categoryName,
          boxes: postsArray.map((post) => ({
            id: post.id,
            image: post.imageUrl || '/images/default.jpg',
            title: post.title,
            description: post.description,
          })),
        }));

        setCarouselData(builtSections);
      } catch (err) {
        console.error('Error fetching carousel data:', err);
        setError(err.message || 'Failed to fetch carousel data.');
      }
    };

    fetchCarouselData();
  }, []);

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
        {carouselData.map((section, index) => (
          <div key={index} className="carousel-slide">
            <h2 className="text-2xl font-bold mb-6 text-center">{section.title}</h2>
            {section.boxes.length > 0 ? (
              <Slider {...boxSettings}>
                {section.boxes.map((box) => (
                  <div key={box.id}>
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
