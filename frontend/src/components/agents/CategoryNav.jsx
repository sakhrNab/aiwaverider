import React, { useRef } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
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
  const scrollContainerRef = useRef(null);
  
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };
  
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="category-nav-container">
      <button 
        className="scroll-button scroll-left"
        onClick={scrollLeft}
        aria-label="Scroll left"
      >
        <FaChevronLeft />
      </button>
      
      <div className="category-nav" ref={scrollContainerRef}>
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
      
      <button 
        className="scroll-button scroll-right"
        onClick={scrollRight}
        aria-label="Scroll right"
      >
        <FaChevronRight />
      </button>
    </div>
  );
};

export default CategoryNav; 