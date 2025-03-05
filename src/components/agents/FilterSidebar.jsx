import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaStar } from 'react-icons/fa';
import './FilterSidebar.css';

const FilterSidebar = ({ 
  selectedPrice, 
  selectedRating, 
  onPriceChange, 
  onRatingChange 
}) => {
  const [priceExpanded, setPriceExpanded] = useState(true);
  const [ratingExpanded, setRatingExpanded] = useState(true);
  
  const priceOptions = [
    { label: 'All', value: 'all' },
    { label: 'Free', value: 'free' },
    { label: '$0+', value: '0' },
    { label: '$10+', value: '10' },
    { label: '$25+', value: '25' },
    { label: '$50+', value: '50' }
  ];
  
  const ratingOptions = [
    { value: 4.5, label: '4.5 & up' },
    { value: 4.0, label: '4.0 & up' },
    { value: 3.5, label: '3.5 & up' },
    { value: 3.0, label: '3.0 & up' }
  ];
  
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FaStar 
          key={i} 
          className={i <= rating ? 'star filled' : 'star empty'} 
        />
      );
    }
    return stars;
  };
  
  return (
    <div className="filter-sidebar">
      <div className="sidebar-header">
        <h2>Filters</h2>
      </div>
      
      {/* Price Filter */}
      <div className="filter-section">
        <div 
          className="filter-header" 
          onClick={() => setPriceExpanded(!priceExpanded)}
        >
          <h3>Price</h3>
          {priceExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </div>
        
        {priceExpanded && (
          <div className="filter-content">
            {priceOptions.map(option => (
              <div 
                key={option.value}
                className={`filter-option ${selectedPrice === option.value ? 'active' : ''}`}
                onClick={() => onPriceChange(option.value)}
              >
                <span className="filter-checkbox">
                  {selectedPrice === option.value && '✓'}
                </span>
                <span className="filter-label">{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Rating Filter */}
      <div className="filter-section">
        <div 
          className="filter-header" 
          onClick={() => setRatingExpanded(!ratingExpanded)}
        >
          <h3>Rating</h3>
          {ratingExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </div>
        
        {ratingExpanded && (
          <div className="filter-content">
            {ratingOptions.map(option => (
              <div 
                key={option.value}
                className={`filter-option ${selectedRating === option.value ? 'active' : ''}`}
                onClick={() => onRatingChange(option.value)}
              >
                <span className="filter-checkbox">
                  {selectedRating === option.value && '✓'}
                </span>
                <div className="filter-stars">
                  {renderStars(option.value)}
                </div>
                <span className="filter-label">{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterSidebar; 