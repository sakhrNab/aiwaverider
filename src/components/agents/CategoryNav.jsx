import React from 'react';
import './CategoryNav.css';

// Agent-specific categories
const AGENT_CATEGORIES = [
  'All',
  'Design',
  'Drawing & Painting',
  '3D',
  'Self Improvement',
  'Music & Sound Design',
  'Software Development',
  'Business'
];

const CategoryNav = ({ selectedCategory, onCategoryChange }) => {
  return (
    <div className="category-nav">
      <div className="category-scroll">
        {AGENT_CATEGORIES.map((category) => (
          <button
            key={category}
            className={`category-button ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryNav; 