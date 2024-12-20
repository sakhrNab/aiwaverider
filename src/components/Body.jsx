import React from 'react';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import '../styles/carousel.css';
import Welcome from './Welcome';
import Carousel from './Carousel';

const Body = () => {
  return (
    <div className="p-8 relative">
      <Welcome />

      <h2 className="text-3xl font-semibold">Welcome to AI Wave Rider!</h2>
      <p className="mt-4 text-lg">
        {/* Additional introductory text can go here */}
      </p>
      <div className="mt-6">
        <Carousel />
      </div>
    </div>
  );
};

export default Body;
