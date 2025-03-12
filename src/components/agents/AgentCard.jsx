import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaHeart, FaRegHeart } from 'react-icons/fa';
import { addToWishlist, removeFromWishlist } from '../../utils/api';
import '../../styles/MarketplaceAgentCard.css';

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
  const formatPrice = () => {
    // First check if agent is marked as free
    if (agent.isFree) return 'Free';
    
    // Check if we have price details object
    if (agent.priceDetails) {
      const { basePrice, discountedPrice, currency } = agent.priceDetails;
      const currencySymbol = currency === 'USD' ? '$' : currency;
      
      if (discountedPrice !== undefined && discountedPrice < basePrice) {
        return `${currencySymbol}${discountedPrice.toFixed(2)}`;
      }
      
      if (basePrice !== undefined) {
        return `${currencySymbol}${basePrice.toFixed(2)}`;
      }
    }
    
    // Handle string or number price
    if (agent.price !== undefined) {
      if (typeof agent.price === 'number') {
        return agent.price === 0 ? 'Free' : `$${agent.price.toFixed(2)}`;
      }
      return agent.price; // Return as is if it's a string
    }
    
    // Default fallback
    return 'Price unavailable';
  };

  // Format rating to show only one decimal place
  const formatRating = (rating) => {
    if (!rating) return '0';
    return typeof rating === 'number' ? rating.toFixed(1) : parseFloat(rating).toFixed(1);
  };

  // Get image URL with fallback
  const getImageUrl = () => {
    if (imageError) {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%234a4de7'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='24' text-anchor='middle' fill='white'%3EAgent Image%3C/text%3E%3C/svg%3E";
    }
    
    return agent.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%234a4de7'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='24' text-anchor='middle' fill='white'%3EAgent Image%3C/text%3E%3C/svg%3E";
  };

  // Handle image loading errors
  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Link to={`/agents/${agent.id}`} className="marketplace-agent-card-link">
      <div className="marketplace-agent-card">
        <div className="marketplace-agent-card-inner">
          {/* Card image with wishlist button */}
          <div className="marketplace-agent-image-container">
            <img 
              src={getImageUrl()} 
              alt={agent.title || agent.name} 
              className="marketplace-agent-image" 
              onError={handleImageError}
            />
            <button 
              className={`marketplace-wishlist-button ${isWishlisted ? 'active' : ''} ${isLoading ? 'loading' : ''}`}
              onClick={handleWishlist}
              disabled={isLoading}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              {isWishlisted ? <FaHeart /> : <FaRegHeart />}
            </button>
            
            {/* Badges */}
            {agent.isBestseller && <div className="marketplace-badge bestseller">Bestseller</div>}
            {agent.isNew && <div className="marketplace-badge new">New</div>}
            {agent.isTrending && <div className="marketplace-badge trending">Trending</div>}
          </div>

          {/* Card content */}
          <div className="marketplace-agent-content">
            <h3 className="marketplace-agent-title">{agent.title || agent.name}</h3>
            <p className="marketplace-agent-description">{agent.description || "No description available"}</p>
            
            <div className="marketplace-agent-creator">
              By {agent.creator?.name || "Unknown Creator"}
            </div>
            
            <div className="marketplace-agent-rating">
              {agent.rating?.average ? (
                <>
                  <span className="marketplace-rating-score">{formatRating(agent.rating.average)}</span>
                  <FaStar className="marketplace-star-icon" />
                  <span className="marketplace-rating-count">({agent.rating.count || 0})</span>
                </>
              ) : (
                <span className="marketplace-no-rating">No ratings yet</span>
              )}
            </div>
            
            <div className="marketplace-agent-price">
              {formatPrice()}
            </div>
            
            {agent.version && 
              <div className="marketplace-agent-version">v{agent.version}</div>
            }
          </div>
        </div>
      </div>
    </Link>
  );
};

export default AgentCard; 