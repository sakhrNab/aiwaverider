import React, { useState, useEffect } from 'react';
import './FilterSidebar.css';

const FilterSidebar = ({ 
  onTagSelect, 
  onFeatureSelect, 
  onRatingSelect, 
  selectedTags = [],
  selectedFeatures = [],
  selectedRating = 0,
  priceRange = { min: 0, max: 1000 },
  onPriceChange,
  tagCounts = {},
  featureCounts = {}
}) => {
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [tagOptions, setTagOptions] = useState([]);
  const [featureOptions, setFeatureOptions] = useState([]);
  const [price, setPrice] = useState({
    min: priceRange.min || 0,
    max: priceRange.max || 1000
  });

  // Update tag options based on provided counts or use defaults
  useEffect(() => {
    // Default tags with counts if none provided
    const defaultTags = [
      { name: 'Design', count: 45 },
      { name: '3D Modeling', count: 32 },
      { name: 'Art', count: 28 },
      { name: 'Music', count: 15 },
      { name: 'Writing', count: 22 },
      { name: 'Productivity', count: 18 },
      { name: 'Business', count: 12 },
      { name: 'Education', count: 9 },
      { name: 'Entertainment', count: 7 }
    ];
    
    // Use dynamic counts if available, otherwise defaults
    if (Object.keys(tagCounts).length > 0) {
      const dynamicTags = Object.entries(tagCounts).map(([name, count]) => ({
        name,
        count
      }));
      
      // Sort by count descending
      dynamicTags.sort((a, b) => b.count - a.count);
      setTagOptions(dynamicTags);
    } else {
      setTagOptions(defaultTags);
    }
  }, [tagCounts]);
  
  // Update feature options based on provided counts or use defaults
  useEffect(() => {
    // Default features with counts if none provided
    const defaultFeatures = [
      { name: 'Free', count: 25 },
      { name: 'Subscription', count: 18 },
      { name: 'API Access', count: 15 },
      { name: 'Customizable', count: 12 },
      { name: 'Mobile Compatible', count: 10 },
      { name: 'Desktop App', count: 8 },
      { name: 'Web Interface', count: 20 },
      { name: 'Voice Enabled', count: 7 }
    ];
    
    // Use dynamic counts if available, otherwise defaults
    if (Object.keys(featureCounts).length > 0) {
      const dynamicFeatures = Object.entries(featureCounts).map(([name, count]) => ({
        name,
        count
      }));
      
      // Sort by count descending
      dynamicFeatures.sort((a, b) => b.count - a.count);
      setFeatureOptions(dynamicFeatures);
    } else {
      setFeatureOptions(defaultFeatures);
    }
  }, [featureCounts]);

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    const newPrice = { ...price, [name]: Number(value) };
    setPrice(newPrice);
    onPriceChange(newPrice);
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
              onClick={() => onRatingSelect(rating)}
            >
              <div className={`checkbox ${selectedRating === rating ? 'checked' : ''}`}>
                {selectedRating === rating && <span className="checkmark">✓</span>}
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
              onClick={() => onTagSelect(tag.name)}
            >
              <div className={`checkbox ${selectedTags.includes(tag.name) ? 'checked' : ''}`}>
                {selectedTags.includes(tag.name) && <span className="checkmark">✓</span>}
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
              onClick={() => onFeatureSelect(feature.name)}
            >
              <div className={`checkbox ${selectedFeatures.includes(feature.name) ? 'checked' : ''}`}>
                {selectedFeatures.includes(feature.name) && <span className="checkmark">✓</span>}
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