import React from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaUser } from 'react-icons/fa';

// Utility functions for image fallbacks
const getPlaceholderImage = () => 
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%234a4de7'/%3E%3C/svg%3E";

const FeaturedAgentCard = ({ agent }) => {
  // First check if agent data is in a nested 'data' field (Firestore structure)
  const agentData = agent.data || agent;
  
  // Handle image loading errors
  const handleImageError = (e) => {
    e.target.src = getPlaceholderImage();
    e.target.onerror = null;
  };

  // Format rating to one decimal place
  const formatRating = (rating) => {
    if (!rating) return '0';
    return typeof rating === 'number' ? rating.toFixed(1) : parseFloat(rating).toFixed(1);
  };

  // Format price display
  const formatPrice = () => {
    // Check if agent is free
    if (agentData.isFree) return <span className="featured-card__price--free">Free</span>;
    if (agentData.price === 0) return <span className="featured-card__price--free">Free</span>;
    
    // Check price details object if available
    if (agentData.priceDetails) {
      const { basePrice, discountedPrice, currency } = agentData.priceDetails;
      const currencySymbol = currency === 'USD' ? '$' : 
                            currency === 'EUR' ? '€' :
                            currency === 'GBP' ? '£' : currency;
      
      if (basePrice === 0 || discountedPrice === 0) {
        return <span className="featured-card__price--free">Free</span>;
      }
      
      if (discountedPrice !== undefined && discountedPrice < basePrice) {
        return (
          <div className="featured-card__price-display">
            <span className="featured-card__price-original">{currencySymbol}{basePrice.toFixed(2)}</span>
            <span className="featured-card__price-discounted">{currencySymbol}{discountedPrice.toFixed(2)}</span>
          </div>
        );
      }
      
      if (basePrice !== undefined) {
        return `${currencySymbol}${basePrice.toFixed(2)}`;
      }
    }
    
    // Handle string or number price
    if (agentData.price !== undefined) {
      if (typeof agentData.price === 'number') {
        return agentData.price === 0 ? <span className="featured-card__price--free">Free</span> : `$${agentData.price.toFixed(2)}`;
      }
      if (agentData.price === 'Free' || agentData.price === '0') {
        return <span className="featured-card__price--free">Free</span>;
      }
      return agentData.price;
    }
    
    return 'Price unavailable';
  };

  // Prepare badges
  const renderBadges = () => {
    const badges = [];
    
    if (agentData.isFeatured) {
      badges.push(
        <div key="featured" className="featured-card__badge featured-card__badge--featured">
          Featured
        </div>
      );
    }
    
    if (agentData.isBestseller) {
      badges.push(
        <div key="bestseller" className="featured-card__badge featured-card__badge--bestseller">
          Bestseller
        </div>
      );
    }
    
    if (agentData.isNew) {
      badges.push(
        <div key="new" className="featured-card__badge featured-card__badge--new">
          New
        </div>
      );
    }
    
    if (agentData.isTrending) {
      badges.push(
        <div key="trending" className="featured-card__badge featured-card__badge--trending">
          Trending
        </div>
      );
    }
    
    return badges.length > 0 ? (
      <div className="featured-card__badges">
        {badges}
      </div>
    ) : null;
  };

  // Get agent creator info
  const getCreatorInfo = () => {
    // If agent has a creator object
    if (agentData.creator) {
      return agentData.creator.name || agentData.creator.id || "AI Labs";
    }
    // Fallback if no creator info
    return "AI Labs";
  };

  return (
    <Link to={`/agents/${agent.id}`} className="block h-full">
      <div className="featured-card">
        <div className="featured-card__image-container">
          <img 
            src={agentData.imageUrl || getPlaceholderImage()} 
            alt={agentData.title || agentData.name || 'AI Agent'} 
            className="featured-card__image"
            onError={handleImageError}
          />
          {renderBadges()}
        </div>

        <div className="featured-card__content">
          <h3 className="featured-card__title">
            {agentData.title || agentData.name || 'AI Assistant'}
          </h3>
          
          {agentData.description && (
            <p className="featured-card__description">{agentData.description}</p>
          )}
          
          <div className="featured-card__creator">
            <FaUser className="featured-card__creator-icon" />
            {getCreatorInfo()}
          </div>
          
          <div className="featured-card__meta">
            <div className="featured-card__rating">
              {agentData.rating?.average ? (
                <>
                  <span className="featured-card__rating-score">{formatRating(agentData.rating.average)}</span>
                  <FaStar className="featured-card__rating-star" />
                  <span className="featured-card__rating-count">({agentData.rating.count || 0})</span>
                </>
              ) : (
                <span className="featured-card__no-rating">No ratings</span>
              )}
            </div>
            
            <div className="featured-card__price">
              {formatPrice()}
            </div>
          </div>
          
          {agentData.version && (
            <div className="featured-card__version">v{agentData.version}</div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default FeaturedAgentCard; 