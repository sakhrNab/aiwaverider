import React, { useState, useEffect } from 'react';
import './FilterSidebar.css';
import { FaCheck } from 'react-icons/fa';

const FilterSidebar = ({ 
  selectedTags = [], 
  onTagChange, 
  selectedFeatures = [],
  onFeatureChange, 
  selectedRating = 0, 
  onRatingChange,
  selectedPrice = { min: 0, max: 1000 },
  onPriceChange,
  tagCounts = {},
  featureCounts = {}
}) => {
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [tagOptions, setTagOptions] = useState([]);
  const [featureOptions, setFeatureOptions] = useState([]);
  const [price, setPrice] = useState({
    min: selectedPrice.min || 0,
    max: selectedPrice.max || 1000
  });

  // Update price state when selectedPrice prop changes
  useEffect(() => {
    if (selectedPrice && typeof selectedPrice === 'object') {
      setPrice({
        min: selectedPrice.min || 0,
        max: selectedPrice.max || 1000
      });
    }
  }, [selectedPrice]);

  // Update tag options based on provided counts
  useEffect(() => {
    // Use dynamic counts from props
    if (Object.keys(tagCounts).length > 0) {
      const dynamicTags = Object.entries(tagCounts).map(([name, count]) => ({
        name,
        count
      }));
      
      // Sort alphabetically by name
      dynamicTags.sort((a, b) => a.name.localeCompare(b.name));
      setTagOptions(dynamicTags);
    } else {
      setTagOptions([]);
    }
  }, [tagCounts]);
  
  // Update feature options based on provided counts
  useEffect(() => {
    // Use dynamic counts from props
    if (Object.keys(featureCounts).length > 0) {
      const dynamicFeatures = Object.entries(featureCounts).map(([name, count]) => ({
        name,
        count
      }));
      
      // Sort alphabetically by name
      dynamicFeatures.sort((a, b) => a.name.localeCompare(b.name));
      setFeatureOptions(dynamicFeatures);
    } else {
      setFeatureOptions([]);
    }
  }, [featureCounts]);

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    const newValue = Number(value);
    
    // Validate input
    if (isNaN(newValue) || newValue < 0) return;
    
    const newPrice = { ...price, [name]: newValue };
    setPrice(newPrice);
    
    // Only update parent component after user has stopped typing (debounce)
    if (onPriceChange) {
      onPriceChange(newPrice);
    }
  };

  const getVisibleTags = () => {
    return showAllTags ? tagOptions : tagOptions.slice(0, 5);
  };

  const getVisibleFeatures = () => {
    return showAllFeatures ? featureOptions : featureOptions.slice(0, 5);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? "star filled" : "star empty"}>
          ★
        </span>
      );
    }
    return stars;
  };
  
  const handleTagSelect = (tag) => {
    if (onTagChange) {
      onTagChange(tag);
    }
  };
  
  const handleFeatureSelect = (feature) => {
    if (onFeatureChange) {
      onFeatureChange(feature);
    }
  };
  
  const handleRatingSelect = (rating) => {
    console.log('Rating selected:', rating, 'Previous rating:', selectedRating);
    if (onRatingChange) {
      onRatingChange(rating);
      console.log('Called onRatingChange with rating:', rating);
    }
  };

  return (
    <div className="filter-sidebar">
      <div className="filter-header-main">
        <h2>Filters</h2>
      </div>
      
      <div className="filter-section">
        <div className="filter-header" onClick={() => {}}>
          <h3>Price</h3>
        </div>
        <div className="filter-content">
          <div className="price-inputs">
            <div className="price-input-group">
              <label htmlFor="min-price">Min</label>
              <div className="price-input-wrapper">
                <span className="price-symbol">$</span>
                <input
                  id="min-price"
                  type="number"
                  name="min"
                  value={price.min}
                  onChange={handlePriceChange}
                  min="0"
                />
              </div>
            </div>
            <div className="price-input-group">
              <label htmlFor="max-price">Max</label>
              <div className="price-input-wrapper">
                <span className="price-symbol">$</span>
                <input
                  id="max-price"
                  type="number"
                  name="max"
                  value={price.max}
                  onChange={handlePriceChange}
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="filter-section">
        <div className="filter-header" onClick={() => {}}>
          <h3>Rating</h3>
        </div>
        <div className="filter-content">
          {[4, 3, 2, 1].map((rating) => (
            <div 
              key={rating} 
              className={`filter-option ${selectedRating === rating ? 'selected' : ''}`}
              onClick={() => handleRatingSelect(rating)}
            >
              <div className={`checkbox ${selectedRating === rating ? 'checked' : ''}`}>
                {selectedRating === rating && <FaCheck className="checkmark" size={10} />}
              </div>
              <div className="stars">{renderStars(rating)}</div>
              <span className="filter-label">&amp; Up</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="filter-section">
        <div className="filter-header" onClick={() => {}}>
          <h3>Tags</h3>
        </div>
        <div className="filter-content">
          {getVisibleTags().map((tag) => (
            <div 
              key={tag.name} 
              className={`filter-option ${selectedTags.includes(tag.name) ? 'selected' : ''}`}
              onClick={() => handleTagSelect(tag.name)}
            >
              <div className={`checkbox ${selectedTags.includes(tag.name) ? 'checked' : ''}`}>
                {selectedTags.includes(tag.name) && <FaCheck className="checkmark" size={10} />}
              </div>
              <span className="filter-label">{tag.name}</span>
              <span className="filter-count">{tag.count}</span>
            </div>
          ))}
          {tagOptions.length > 5 && (
            <div className="load-more" onClick={() => setShowAllTags(!showAllTags)}>
              {showAllTags ? "− Show less" : "+ Show more"}
            </div>
          )}
        </div>
      </div>
      
      <div className="filter-section">
        <div className="filter-header" onClick={() => {}}>
          <h3>Contains</h3>
        </div>
        <div className="filter-content">
          {getVisibleFeatures().map((feature) => (
            <div 
              key={feature.name} 
              className={`filter-option ${selectedFeatures.includes(feature.name) ? 'selected' : ''}`}
              onClick={() => handleFeatureSelect(feature.name)}
            >
              <div className={`checkbox ${selectedFeatures.includes(feature.name) ? 'checked' : ''}`}>
                {selectedFeatures.includes(feature.name) && <FaCheck className="checkmark" size={10} />}
              </div>
              <span className="filter-label">{feature.name}</span>
              <span className="filter-count">{feature.count}</span>
            </div>
          ))}
          {featureOptions.length > 5 && (
            <div className="load-more" onClick={() => setShowAllFeatures(!showAllFeatures)}>
              {showAllFeatures ? "− Show less" : "+ Show more"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar; 