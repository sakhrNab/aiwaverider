import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaHeart, FaRegHeart } from 'react-icons/fa';
import { addToWishlist, removeFromWishlist } from '../../utils/api';
import '../../styles/MarketplaceAgentCard.css';

const AgentCard = ({ agent }) => {
  const [isWishlisted, setIsWishlisted] = useState(agent.isWishlisted || false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(null);
  const imageRef = useRef(null);

  // Handle image load to determine aspect ratio
  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      const ratio = naturalWidth / naturalHeight;
      // Consider images with ratio less than 1 as portrait
      setAspectRatio(ratio < 1 ? 'portrait' : 'landscape');
    }
  };
  
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
      const currencySymbol = currency === 'USD' ? '$' : 
                            currency === 'EUR' ? '€' :
                            currency === 'GBP' ? '£' : currency;
      
      // If there's a discount, show both prices
      if (discountedPrice !== undefined && discountedPrice < basePrice) {
        return (
          <div className="price-display">
            <span className="original-price">{currencySymbol}{basePrice.toFixed(2)}</span>
            <span className="discounted-price">{currencySymbol}{discountedPrice.toFixed(2)}</span>
          </div>
        );
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
    
    // Check for different possible image URL locations in the agent object
    if (agent.imageUrl) {
      console.log("Using agent.imageUrl:", agent.imageUrl);
      return agent.imageUrl;
    }
    
    // Check if image info exists in a nested structure
    if (agent.image && agent.image.url) {
      console.log("Using agent.image.url:", agent.image.url);
      return agent.image.url;
    }
    
    // Try to parse the data field if it's a string
    if (agent.data && typeof agent.data === 'string') {
      try {
        const parsedData = JSON.parse(agent.data);
        if (parsedData.imageUrl) {
          console.log("Using parsed data.imageUrl:", parsedData.imageUrl);
          return parsedData.imageUrl;
        }
      } catch (e) {
        console.error("Error parsing agent.data:", e);
      }
    }
    
    console.log("No image URL found, using fallback");
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%234a4de7'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='24' text-anchor='middle' fill='white'%3EAgent Image%3C/text%3E%3C/svg%3E";
  };

  // Get icon URL with fallback
  const getIconUrl = () => {
    // Check for different possible icon URL locations in the agent object
    if (agent.iconUrl) {
      console.log("Using agent.iconUrl:", agent.iconUrl);
      return agent.iconUrl;
    }
    
    // Check if icon info exists in a nested structure
    if (agent.icon && agent.icon.url) {
      console.log("Using agent.icon.url:", agent.icon.url);
      return agent.icon.url;
    }
    
    // Try to parse the data field if it's a string
    if (agent.data && typeof agent.data === 'string') {
      try {
        const parsedData = JSON.parse(agent.data);
        if (parsedData.iconUrl) {
          console.log("Using parsed data.iconUrl:", parsedData.iconUrl);
          return parsedData.iconUrl;
        }
      } catch (e) {
        console.error("Error parsing agent.data for icon:", e);
      }
    }
    
    // If no icon is found, use the image as the icon
    const imageUrl = getImageUrl();
    if (imageUrl && !imageUrl.includes('data:image/svg+xml')) {
      console.log("Using image as icon fallback");
      return imageUrl;
    }
    
    console.log("No icon URL found, using default icon");
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%234a4de7'/%3E%3Ctext x='25' y='25' font-family='Arial' font-size='8' text-anchor='middle' dominant-baseline='middle' fill='%23ffffff'%3EAI%3C/text%3E%3C/svg%3E";
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
              ref={imageRef}
              src={getImageUrl()} 
              alt={agent.title || agent.name} 
              className="marketplace-agent-image" 
              onError={handleImageError}
              onLoad={handleImageLoad}
              data-aspect={aspectRatio}
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