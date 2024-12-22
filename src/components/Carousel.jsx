// src/components/Carousel.jsx

import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import '../styles/carousel.css';
import CardBox from './CardBox';

const Carousel = () => {
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

  const carouselData = [
    {
      title: 'AI Tools',
      boxes: [
        { image: '/images/chatgpt.jpg', title: 'ChatGPT', description: 'Advanced language model for conversation.' },
        { image: '/images/dalle.jpg', title: 'DALL-E', description: 'AI image generation from text.' },
        { image: '/images/copilot.jpg', title: 'GitHub Copilot', description: 'AI-powered code completion.' },
      ],
    },
    {
      title: 'Trends',
      boxes: [
        { image: '/images/ml.jpg', title: 'Machine Learning', description: 'Latest ML algorithms.' },
        { image: '/images/nn.jpg', title: 'Neural Networks', description: 'Advanced neural architectures.' },
        { image: '/images/dl.jpg', title: 'Deep Learning', description: 'Deep learning innovations.' },
      ],
    },
    {
      title: 'Latest Tech',
      boxes: [
        { image: '/images/quantum.jpg', title: 'Quantum AI', description: 'Quantum computing meets AI.' },
        { image: '/images/edge.jpg', title: 'Edge AI', description: 'AI at the edge.' },
        { image: '/images/chips.jpg', title: 'AI Chips', description: 'Specialized AI hardware.' },
      ],
    },
  ];

  return (
    <div className="carousel-container">
      <Slider {...mainSettings}>
        {carouselData.map((section, index) => (
          <div key={index} className="carousel-slide">
            <h2 className="text-2xl font-bold mb-6 text-center">{section.title}</h2>
            <Slider {...boxSettings}>
              {section.boxes.map((box, boxIndex) => (
                <CardBox key={boxIndex} {...box} />
              ))}
            </Slider>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default Carousel;
