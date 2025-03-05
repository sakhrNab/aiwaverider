import React from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import './RatingFilter.css';

const RatingFilter = ({ selectedRating, onRatingChange }) => {
  const ratingOptions = [
    { value: 4.5, label: '4.5 & up' },
    { value: 4.0, label: '4.0 & up' },
    { value: 3.5, label: '3.5 & up' },
    { value: 3.0, label: '3.0 & up' }
  ];

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<FaStar key={i} className="filled" />);
      } else if (i - 0.5 <= rating) {
        stars.push(<FaStar key={i} className="filled" />);
      } else {
        stars.push(<FaRegStar key={i} className="empty" />);
      }
    }
    return stars;
  };

  return (
    <div className="rating-filter">
      <h3 className="rating-filter-title">Ratings</h3>
      <div className="rating-options">
        {ratingOptions.map(option => (
          <div
            key={option.value}
            className={`rating-option ${selectedRating === option.value ? 'active' : ''}`}
            onClick={() => onRatingChange(option.value)}
          >
            <div className="rating-stars">
              {renderStars(option.value)}
            </div>
            <span className="rating-label">{option.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RatingFilter; 