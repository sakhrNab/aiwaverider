// src/components/CardBox.jsx

import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';

const CardBox = ({ image, title, description, isFavorite }) => {
  return (
    <div className="relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {isFavorite && (
        <div className="absolute top-2 right-2 z-10">
          <FontAwesomeIcon 
            icon={faStar} 
            className="text-yellow-400 text-xl"
            title="In your favorites"
          />
        </div>
      )}
      <div className="aspect-w-16 aspect-h-9">
        <img
          src={image}
          alt={title}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2 line-clamp-2">{title}</h3>
        <p className="text-gray-600 text-sm line-clamp-3">{description}</p>
      </div>
    </div>
  );
};

CardBox.propTypes = {
  image: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  isFavorite: PropTypes.bool,
};

CardBox.defaultProps = {
  isFavorite: false,
};

export default CardBox;
