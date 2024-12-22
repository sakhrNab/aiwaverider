// src/components/CardBox.jsx

import React from 'react';

const CardBox = ({ image, title, description }) => (
  <div className="px-2 h-full">
    <div className="flex flex-col h-full p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="aspect-w-16 aspect-h-9">
        <img src={image} alt={title} className="w-full h-full object-cover rounded-md" />
      </div>
      <div className="flex flex-col justify-between flex-grow mt-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-600 mt-2">{description}</p>
      </div>
    </div>
  </div>
);

export default CardBox;
