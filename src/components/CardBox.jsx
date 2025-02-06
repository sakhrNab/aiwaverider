// src/components/CardBox.jsx

import React from 'react';

const CardBox = ({ image, title, description }) => {
  return (
    <div className="p-4">
      <div className="bg-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
        <img src={image} alt={title} className="w-full h-40 object-cover" loading="lazy" />
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default CardBox;
