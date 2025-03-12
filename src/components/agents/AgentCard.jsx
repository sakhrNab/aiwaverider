import React, { useState } from 'react';
import { FaStar, FaHeart, FaRegHeart } from 'react-icons/fa';
import { addToWishlist, removeFromWishlist } from '../../utils/api';
import './AgentCard.css';

const AgentCard = ({ agent }) => {
  const [isWishlisted, setIsWishlisted] = useState(agent.isWishlisted || false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Handle wishlist toggling
  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);
    try {
      if (isWishlisted) {
        await removeFromWishlist(agent.id);
      } else {
        await addToWishlist(agent.id);
      }
      setIsWishlisted(!isWishlisted);
    } catch (error) {
      console.error('Error updating wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format the price for display
  const formatPrice = (price) => {
    // First check if agent is marked as free
    if (agent.isFree) return 'Free';
    
    // Check if we have price details object
    if (agent.priceDetails) {
      const { basePrice, discountedPrice, currency } = agent.priceDetails;
      const currencySymbol = currency === 'USD' ? '$' : currency;
      
      // Check for discounted price
      if (discountedPrice !== null && discountedPrice !== undefined && discountedPrice !== basePrice) {
        return `${currencySymbol}${Number(discountedPrice).toFixed(2)}`;
      }
      
      // Check for base price
      if (basePrice !== null && basePrice !== undefined) {
        return `${currencySymbol}${Number(basePrice).toFixed(2)}`;
      }
      
      // If no valid prices in priceDetails
      return 'Free';
    }
    
    // Legacy format handling
    if (!price && price !== 0) return 'Free';
    if (typeof price === 'string') return price;
    if (typeof price === 'number') {
      return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
    }
    
    // Fallback
    return 'Price unavailable';
  };

  // Format rating to show only one decimal place
  const formatRating = (rating) => {
    if (!rating) return '0';
    return typeof rating === 'number' ? rating.toFixed(1) : parseFloat(rating).toFixed(1);
  };

  // Alternative placeholder with fallbacks
  const getImageUrl = () => {
    if (!agent.iconUrl || imageError) {
      // Return a colored background with agent initial as SVG data URI
      const initial = agent.title ? agent.title.charAt(0).toUpperCase() : 
                    agent.name ? agent.name.charAt(0).toUpperCase() : 'A';
      const color = '#4a4de7'; // A nice purple-blue color
      
      return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='160' viewBox='0 0 300 160'%3E%3Crect width='300' height='160' fill='${color.replace('#', '%23')}'/%3E%3Ctext x='150' y='90' font-family='Arial' font-size='60' font-weight='bold' text-anchor='middle' fill='white'%3E${initial}%3C/text%3E%3C/svg%3E`;
    }
    return agent.iconUrl;
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="agent-card">
      <div className="agent-card-inner">
        {/* Card image with wishlist button */}
        <div className="agent-image-container">
          <img 
            src={getImageUrl()} 
            alt={agent.title || agent.name} 
            className="agent-image" 
            onError={handleImageError}
          />
          <button 
            className={`wishlist-button ${isWishlisted ? 'active' : ''} ${isLoading ? 'loading' : ''}`}
            onClick={handleWishlist}
            disabled={isLoading}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            {isWishlisted ? <FaHeart /> : <FaRegHeart />}
          </button>
          
          {/* Badges */}
          {agent.isBestseller && <div className="badge bestseller">Bestseller</div>}
          {agent.isNew && <div className="badge new">New</div>}
          {agent.isTrending && <div className="badge trending">Trending</div>}
        </div>

        {/* Card content */}
        <div className="agent-content">
          <h3 className="agent-title">{agent.title || agent.name}</h3>
          <p className="agent-description">{agent.description || "No description available"}</p>
          
          <div className="agent-creator">
            By {agent.creator?.name || "Unknown Creator"}
          </div>
          
          <div className="agent-rating">
            {agent.rating?.average ? (
              <>
                <span className="rating-score">{formatRating(agent.rating.average)}</span>
                <FaStar className="star-icon" />
                <span className="rating-count">({agent.rating.count || 0})</span>
              </>
            ) : (
              <span className="no-rating">No ratings yet</span>
            )}
          </div>
          
          <div className="agent-price">
            {formatPrice()}
          </div>
          
          {agent.version && 
            <div className="agent-version">v{agent.version}</div>
          }
        </div>
      </div>
    </div>
  );
};

export default AgentCard; 