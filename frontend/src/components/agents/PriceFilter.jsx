import React from 'react';
import './PriceFilter.css';

const PriceFilter = ({ selectedPrice, onPriceChange }) => {
  const priceOptions = [
    { label: 'All', value: 'all' },
    { label: 'Free', value: 'free' },
    { label: '$0+', value: '0' },
    { label: '$10+', value: '10' },
    { label: '$25+', value: '25' },
    { label: '$50+', value: '50' }
  ];

  return (
    <div className="price-filter">
      <h3 className="price-filter-title">Price</h3>
      <div className="price-options">
        {priceOptions.map(option => (
          <button
            key={option.value}
            className={`price-option ${selectedPrice === option.value ? 'active' : ''}`}
            onClick={() => onPriceChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PriceFilter; 