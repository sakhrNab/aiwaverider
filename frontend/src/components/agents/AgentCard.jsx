import React, { useState, useRef, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaHeart, FaRegHeart, FaPlus } from 'react-icons/fa';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { addToWishlist, removeFromWishlist } from '../../api/marketplace/agentApi';
import { useCart } from '../../contexts/CartContext';
import { toast } from 'react-toastify';
import { fixPlaceholderUrl, generatePlaceholderImage } from '../../utils/imageUtils';
import '../../styles/MarketplaceAgentCard.css';

// Default fallback images using placehold.co for better reliability
const DEFAULT_IMAGE = generatePlaceholderImage({ text: 'Agent Image' });
const DEFAULT_ICON = generatePlaceholderImage({ text: 'AI', width: 200, height: 200 });

// Currency symbol helper function
const getCurrencySymbol = (currency) => {
  switch(currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return currency;
  }
};

// Format rating to show only one decimal place
const formatRating = (rating) => {
  if (!rating) return '0';
  return typeof rating === 'number' ? rating.toFixed(1) : parseFloat(rating).toFixed(1);
};

const AgentCard = memo(({ agent }) => {
  const [isWishlisted, setIsWishlisted] = useState(agent.isWishlisted || false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(null);
  const imageRef = useRef(null);
  const { addToCart } = useCart();
  
  // Handle image load to determine aspect ratio
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      const ratio = naturalWidth / naturalHeight;
      // Consider images with ratio less than 1 as portrait
      setAspectRatio(ratio < 1 ? 'portrait' : 'landscape');
    }
  }, []);
  
  // Handle wishlist toggling
  const handleWishlist = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
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
  }, [agent.id, isWishlisted, isLoading]);

  // Get image URL with fallback - optimized with memoization
  const imageUrl = React.useMemo(() => {
    if (imageError) {
      return DEFAULT_IMAGE;
    }
    
    // Check for different possible image URL locations in the agent object
    // if (agent.imageUrl && typeof agent.imageUrl === 'string') {
    //   return fixPlaceholderUrl(agent.imageUrl);
    // }
    
    // Check if image info exists in a nested structure
    if (agent.image && agent.image.url) {
      return fixPlaceholderUrl(agent.image.url);
    }
    
    // Generate a custom placeholder with the agent name
    const name = agent.name || agent.title || 'Agent';
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%233498db'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='16' text-anchor='middle' dominant-baseline='middle' fill='%23ffffff'%3E${encodeURIComponent(name)}%3C/text%3E%3C/svg%3E`;
  }, [agent.imageUrl, agent.image, agent.name, agent.title, imageError]);

  // Handle add to cart
  const handleAddToCart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Determine price
      let price = 0;
      if (agent.priceDetails && agent.priceDetails.basePrice) {
        price = agent.priceDetails.discountedPrice || agent.priceDetails.basePrice;
      } else if (typeof agent.price === 'number') {
        price = agent.price;
      }
      
      // Create product object
      const product = {
        id: agent.id,
        title: agent.title || agent.name,
        price: price,
        imageUrl: imageUrl,
        quantity: 1
      };
      
      // Add to cart
      addToCart(product);
      toast.success('Added to cart');
    } catch (err) {
      console.error('Error adding to cart:', err);
      toast.error('Failed to add to cart');
    }
  }, [agent, imageUrl, addToCart]);

  // Get icon URL with fallback - optimized with memoization
  const iconUrl = React.useMemo(() => {
    // Check for different possible icon URL locations in the agent object
    if (agent.iconUrl) {
      return fixPlaceholderUrl(agent.iconUrl);
    }
    
    // Check if icon info exists in a nested structure
    if (agent.icon && agent.icon.url) {
      return fixPlaceholderUrl(agent.icon.url);
    }
    
    // If no icon is found, use the image as the icon
    if (imageUrl && !imageUrl.includes('data:image/svg+xml')) {
      return imageUrl;
    }
    
    return DEFAULT_ICON;
  }, [agent.iconUrl, agent.icon, imageUrl]);

  // Format the price for display - optimized with enhanced memoization
  const formattedPrice = React.useMemo(() => {
    // First check if agent is marked as free
    if (agent.isFree || agent.price === 0) return <span className="free-price">Free</span>;
    
    // Check if we have price details object
    if (agent.priceDetails) {
      const { basePrice, discountedPrice, currency } = agent.priceDetails;
      const currencySymbol = getCurrencySymbol(currency);
      
      // If price is 0, it's free
      if (basePrice === 0 || discountedPrice === 0) {
        return <span className="free-price">Free</span>;
      }
      
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
        return agent.price === 0 ? <span className="free-price">Free</span> : `$${agent.price.toFixed(2)}`;
      }
      // Check if price string is "Free" or "0"
      if (agent.price === 'Free' || agent.price === '0') {
        return <span className="free-price">Free</span>;
      }
      return agent.price; // Return as is if it's a string
    }
    
    // Default fallback - be transparent when price is unknown
    return 'Price unavailable';
  }, [agent.isFree, agent.price, agent.priceDetails]);

  // Handle image loading errors
  const handleImageError = useCallback(() => {
    console.log(`Image error for agent: ${agent.id}`);
    setImageError(true);
  }, [agent.id]);

  // Derive and memoize the essential properties to prevent unnecessary calculations
  const title = React.useMemo(() => agent.title || agent.name, [agent.title, agent.name]);
  const description = React.useMemo(() => agent.description || "No description available", [agent.description]);
  const creatorName = React.useMemo(() => agent.creator?.name || "Unknown Creator", [agent.creator]);
  const rating = React.useMemo(() => agent.rating?.average ? formatRating(agent.rating.average) : null, [agent.rating]);
  const ratingCount = React.useMemo(() => agent.rating?.count || 0, [agent.rating]);

  return (
    <Link to={`/agents/${agent.id}`} className="marketplace-agent-card-link">
      <div className="marketplace-agent-card">
        <div className="marketplace-agent-card-inner">
          {/* Card image with wishlist button */}
          <div className="marketplace-agent-image-container">
            <LazyLoadImage
              ref={imageRef}
              src={imageUrl} 
              alt={title} 
              className="marketplace-agent-image" 
              onError={handleImageError}
              onLoad={handleImageLoad}
              data-aspect={aspectRatio}
              threshold={1000}
              // effect="blur"
              placeholderSrc={imageUrl}
              width="100%"
              height={200}
              visibleByDefault={true}
            />
            <div className="marketplace-agent-card-actions">
              <button 
                className={`marketplace-wishlist-button ${isWishlisted ? 'active' : ''} ${isLoading ? 'loading' : ''}`}
                onClick={handleWishlist}
                disabled={isLoading}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                {isWishlisted ? <FaHeart /> : <FaRegHeart />}
              </button>
              
              <button
                className="marketplace-cart-button"
                onClick={handleAddToCart}
                aria-label="Add to cart"
              >
                <FaPlus />
              </button>
            </div>
            
            {/* Badges */}
            {agent.isBestseller && <div className="marketplace-badge bestseller">Bestseller</div>}
            {agent.isNew && <div className="marketplace-badge new">New</div>}
            {agent.isTrending && <div className="marketplace-badge trending">Trending</div>}
          </div>

          {/* Card content */}
          <div className="marketplace-agent-content">
            <h3 className="marketplace-agent-title">{title}</h3>
            <p className="marketplace-agent-description">{description}</p>
            
            <div className="marketplace-agent-creator">
              By {creatorName}
            </div>
            
            <div className="marketplace-agent-rating">
              {rating ? (
                <>
                  <span className="marketplace-rating-score">{rating}</span>
                  <FaStar className="marketplace-star-icon" />
                  <span className="marketplace-rating-count">({ratingCount})</span>
                </>
              ) : (
                <span className="marketplace-no-rating">No ratings yet</span>
              )}
            </div>
            
            <div className="marketplace-agent-price">
              {formattedPrice}
            </div>
            
            {agent.version && 
              <div className="marketplace-agent-version">v{agent.version}</div>
            }
          </div>
        </div>
      </div>
    </Link>
  );
});

// Set display name for debugging
AgentCard.displayName = 'AgentCard';

export default AgentCard;