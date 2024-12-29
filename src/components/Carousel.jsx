// src/components/Carousel.jsx

import React, { useState, useEffect } from 'react';
import Slider from 'react-slick';
import CardBox from './CardBox';
import { API_URL } from '../utils/api';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import '../styles/carousel.css';
import { Link } from 'react-router-dom'; // Import Link

// Define categories outside the component to stabilize the reference
const categories = ['Trends', 'Latest Tech', 'AI Tools'];

const Carousel = () => {
  const [carouselData, setCarouselData] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCarouselData = async () => {
      try {
        const data = await Promise.all(categories.map(async (category) => {
          const url = `${API_URL}/api/posts?category=${encodeURIComponent(category)}&limit=5`; // Added limit=5
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch posts for category ${category}`);
          }
          const posts = await response.json();
          return {
            title: category,
            boxes: posts.posts.map((post) => ({
              id: post.id, // Ensure each post has a unique ID
              image: post.imageUrl || '/images/default.jpg',
              title: post.title,
              description: post.description,
            })),
          };
        }));
        setCarouselData(data);
      } catch (error) {
        console.error('Error fetching carousel data:', error);
        setError(error.message || 'Failed to fetch carousel data.');
      }
    };

    fetchCarouselData();
  }, []); // Empty dependency array since categories is now stable

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
      <Slider {...mainSettings}>
        {carouselData.map((section, index) => (
          <div key={index} className="carousel-slide">
            <h2 className="text-2xl font-bold mb-6 text-center">{section.title}</h2>
            {section.boxes.length > 0 ? (
              <Slider {...boxSettings}>
                {section.boxes.map((box) => (
                  <div key={box.id}>
                    {console.log(box.id)}
                    <Link to={`/posts/${box.id}`}>
                      <CardBox {...box} />
                    </Link>
                  </div>
                ))}
              </Slider>
            ) : (
              <p className="text-center text-gray-500">No posts available in this category.</p>
            )}
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default Carousel;
