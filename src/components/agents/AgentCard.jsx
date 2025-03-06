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
    if (!price) return 'Free';
    if (typeof price === 'string') return price;
    if (typeof price === 'number') {
      return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
    }
    return 'Price unavailable';
  };

  // Format rating to show only one decimal place
  const formatRating = (rating) => {
    if (!rating) return '0';
    return typeof rating === 'number' ? rating.toFixed(1) : parseFloat(rating).toFixed(1);
  };

  // Alternative placeholder with fallbacks
  const getImageUrl = () => {
    if (!agent.image || imageError) {
      // Use placehold.co as a fallback
      return `https://placehold.co/300x160/4a4de7/ffffff?text=${encodeURIComponent(agent.title || 'AI Agent')}`;
    }
    return agent.image;
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
            {formatPrice(agent.price)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentCard; 