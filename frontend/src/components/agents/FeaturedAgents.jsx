import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { FaStar, FaUser, FaChevronLeft, FaChevronRight, FaPause, FaPlay, FaPlus, FaHeart, FaRegHeart } from 'react-icons/fa';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import useAgentStore from '../../store/agentStore';
import { useCart } from '../../contexts/CartContext';
// import { toggleAgentLike } from '../../utils/agentApi';
import { toast } from 'react-toastify';
import { generatePlaceholderImage, fixPlaceholderUrl } from '../../utils/imageUtils';
import './FeaturedAgents.css';

// Add additional styling for link component
const additionalStyles = `
.marketplace-agent-card-link {
  text-decoration: none;
  color: inherit;
  display: block;
  height: 100%;
  width: 100%;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.marketplace-agent-card-link:hover {
  transform: translateY(-4px);
}
`;

// Utility functions for image fallbacks - moved outside component
const getPlaceholderImage = () => 
  generatePlaceholderImage({ text: 'Agent Image', width: 600, height: 400 });

const getAvatarPlaceholder = () => 
  generatePlaceholderImage({ text: '?', width: 100, height: 100, bgColor: 'e0e0e0', textColor: '999999' });

// Format rating to show only one decimal place
const formatRating = (rating) => {
  if (!rating) return '0';
  return typeof rating === 'number' ? rating.toFixed(1) : parseFloat(rating).toFixed(1);
};

// Get currency symbol helper
const getCurrencySymbol = (currency) => {
  switch(currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return currency;
  }
};

// Featured Agent Card Component
const FeaturedAgentCard = memo(({ agent }) => {
  const [imageError, setImageError] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(agent.isWishlisted || false);
  const [isLoading, setIsLoading] = useState(false);
  const { addToCart } = useCart();

  // Get image URL with robust fallback logic
  const imageUrl = useMemo(() => {
    // Handle image error case
    // if (imageError) {
    //   return getPlaceholderImage();
    // }
    
    // // Check for different possible image URL locations in the agent object
    // if (agent.imageUrl && typeof agent.imageUrl === 'string') {
    //   return fixPlaceholderUrl(agent.imageUrl);
    // }
    
    // Check if image info exists in a nested structure
    if (agent.image && agent.image.url) {
      return fixPlaceholderUrl(agent.image.url);
    }
    
    // Use agent name in the placeholder
    const name = agent.name || agent.title || 'Agent';
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%233498db'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='16' text-anchor='middle' dominant-baseline='middle' fill='%23ffffff'%3E${encodeURIComponent(name)}%3C/text%3E%3C/svg%3E`;
  }, [agent.imageUrl, agent.image, agent.name, agent.title, imageError]);

  // Check wishlist status on mount
  // useEffect(() => {
  //   const checkWishlist = async () => {
  //     try {
  //       const status = await checkWishlistStatus(agent.id);
  //       setIsWishlisted(status.isWishlisted);
  //     } catch (err) {
  //       console.error('Error checking wishlist status:', err);
  //     }
  //   };
    
  //   checkWishlist();
  // }, [agent.id]);

  // Handle image loading errors
  const handleImageError = useCallback((e) => {
    console.log(`Image error for featured agent: ${agent.id}`);
    setImageError(true);
    e.target.src = getPlaceholderImage();
    e.target.onerror = null;
  }, [agent.id]);

  // Handle wishlist toggling
  // const handleWishlist = useCallback(async (e) => {
  //   e.preventDefault();
  //   e.stopPropagation();
    
  //   if (isLoading) return;
    
  //   setIsLoading(true);
  //   try {
  //     await toggleAgentLike(agent.id);
  //     setIsWishlisted(!isWishlisted);
  //     toast.success(isWishlisted ? 'Removed from favorites' : 'Added to favorites');
  //   } catch (error) {
  //     console.error('Error updating wishlist:', error);
  //     toast.error('Failed to update favorites');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [agent.id, isWishlisted, isLoading]);

  // Handle adding to cart
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

  // Format price display
  const formattedPrice = useMemo(() => {
    // Check if agent is free
    if (agent.isFree) return <span className="featured-card__price--free">Free</span>;
    if (agent.price === 0) return <span className="featured-card__price--free">Free</span>;
    
    // Check price details object if available
    if (agent.priceDetails) {
      const { basePrice, discountedPrice, currency } = agent.priceDetails;
      const currencySymbol = getCurrencySymbol(currency);
      
      if (basePrice === 0 || discountedPrice === 0) {
        return <span className="featured-card__price--free">Free</span>;
      }
      
      if (discountedPrice !== undefined && discountedPrice < basePrice) {
        return (
          <div className="featured-card__price-display">
            <span className="featured-card__price-original">{currencySymbol}{basePrice.toFixed(2)}</span>
            <span className="featured-card__price-discounted">{currencySymbol}{discountedPrice.toFixed(2)}</span>
            <span className="featured-card__discount-badge">
              {Math.round((1 - discountedPrice / basePrice) * 100)}% OFF
            </span>
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
        return agent.price === 0 ? <span className="featured-card__price--free">Free</span> : `$${agent.price.toFixed(2)}`;
      }
      if (agent.price === 'Free' || agent.price === '0') {
        return <span className="featured-card__price--free">Free</span>;
      }
      return agent.price;
    }
    
    // Default fallback - be transparent about unknown price
    return 'Price unavailable';
  }, [agent.isFree, agent.price, agent.priceDetails]);
    
  // Memoize other frequently used values
  const title = useMemo(() => agent.title || agent.name || 'AI Assistant', [agent.title, agent.name]);
  const description = useMemo(() => agent.description, [agent.description]);
  const creatorName = useMemo(() => agent.creator?.name || agent.creator?.id || "AI Labs", [agent.creator]);
  const rating = useMemo(() => agent.rating?.average ? formatRating(agent.rating.average) : null, [agent.rating]);
  const ratingCount = useMemo(() => agent.rating?.count || 0, [agent.rating]);

  return (
    <Link to={`/agents/${agent.id}`} className="marketplace-agent-card-link">
      <div className="featured-card">
        <div className="featured-card__image-container">
          <LazyLoadImage 
            src={imageUrl} 
            alt={title} 
            className="featured-card__image"
            onError={handleImageError}
            effect="blur"
            placeholderSrc={imageUrl}
            threshold={1000}
            width="100%"
            height={200}
            visibleByDefault={false}
          />
          {/* Card actions */}
          <div className="featured-card__actions">
            {/* Wishlist button */}
            {/* <button 
              className={`featured-card__wishlist-button ${isWishlisted ? 'active' : ''} ${isLoading ? 'loading' : ''}`}
              onClick={handleWishlist}
              title={isWishlisted ? "Remove from favorites" : "Add to favorites"}
            >
              {isWishlisted ? <FaHeart /> : <FaRegHeart />}
            </button> */}
            
            {/* Add to cart button */}
            <button 
              className="featured-card__cart-button"
              onClick={handleAddToCart}
              title="Add to cart"
            >
              <FaPlus />
            </button>
          </div>
          
          {/* Badges */}
          <div className="featured-card__badges">
            {agent.isFeatured || agent.featured ? (
              <div className="featured-card__badge featured-card__badge--featured">
                Featured
              </div>
            ) : null}
            
            {agent.isBestseller ? (
              <div className="featured-card__badge featured-card__badge--bestseller">
                Bestseller
              </div>
            ) : null}
            
            {agent.isNew ? (
              <div className="featured-card__badge featured-card__badge--new">
                New
              </div>
            ) : null}
            
            {agent.isTrending ? (
              <div className="featured-card__badge featured-card__badge--trending">
                Trending
              </div>
            ) : null}
          </div>
        </div>

        <div className="featured-card__content">
          <h3 className="featured-card__title">
            {title}
          </h3>
          
          {description && (
            <p className="featured-card__description">{description}</p>
          )}
          
          <div className="featured-card__creator">
            <FaUser className="featured-card__creator-icon" />
            {creatorName}
          </div>
          
          <div className="featured-card__meta">
            <div className="featured-card__rating">
              {rating ? (
                <>
                  <span className="featured-card__rating-score">{rating}</span>
                  <FaStar className="featured-card__rating-star" />
                  <span className="featured-card__rating-count">({ratingCount})</span>
                </>
              ) : (
                <span className="featured-card__no-rating">No ratings</span>
              )}
            </div>
            
            <div className="featured-card__price">
              {formattedPrice}
            </div>
          </div>
          
          {agent.version && (
            <div className="featured-card__version">v{agent.version}</div>
          )}
        </div>
      </div>
    </Link>
  );
});

// Set display name for debugging
FeaturedAgentCard.displayName = 'FeaturedAgentCard';

const FeaturedAgents = memo(({ agents: propAgents = null }) => {
  // Connect to the agent store to leverage cached data
  const { featuredAgents: storeAgents, isLoading: storeLoading } = useAgentStore();
  
  // Use either the props passed agents or the store agents if none provided
  const [displayAgents, setDisplayAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fixed number of dots/slides we want to show
  const MAX_DOTS = 6;
  
  // Check if we need to get agents from store or use props
  useEffect(() => {
    // Prioritize props agents if provided (for parent component control)
    if (propAgents && propAgents.length > 0) {
      console.log('FeaturedAgents: Using agents from props', propAgents.length);
      setDisplayAgents(propAgents.slice(0, MAX_DOTS));
      setIsLoading(false);
    } 
    // Otherwise use store agents if available
    else if (storeAgents && storeAgents.length > 0) {
      console.log('FeaturedAgents: Using agents from store', storeAgents.length);
      setDisplayAgents(storeAgents.slice(0, MAX_DOTS));
      setIsLoading(storeLoading);
    }
    // Keep loading state if store is still loading
    else {
      setIsLoading(storeLoading);
    }
  }, [propAgents, storeAgents, storeLoading]);
  
  // Create autoplay options with improved settings
  const autoplayOptions = useMemo(() => ({
    delay: 5000,
    stopOnInteraction: false, 
    stopOnMouseEnter: false, // Turn off automatic stopping on mouse enter
    rootNode: (emblaRoot) => emblaRoot // Only use the root node
  }), []);

  // Use a ref to access the Autoplay plugin instance
  const autoplayPluginRef = useRef(null);
  
  // Initialize the plugin only once
  if (!autoplayPluginRef.current) {
    autoplayPluginRef.current = Autoplay(autoplayOptions);
  }

  // Initialize carousel with autoplay plugin
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true,
      align: 'start',
      skipSnaps: false
    }, 
    [autoplayPluginRef.current]
  );
  
  // Create a ref for the progress bar
  const progressBarRef = useRef(null);
  
  // Set up state variables for carousel control
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  
  // Scroll handlers
  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);
  
  // Check autoplay state to avoid UI getting out of sync
  const checkAutoplayState = useCallback(() => {
    if (!emblaApi) return;
    
    const autoplay = emblaApi.plugins().autoplay;
    if (!autoplay) return;
    
    const currentlyPlaying = autoplay.isPlaying();
    if (currentlyPlaying !== isPlaying) {
      setIsPlaying(currentlyPlaying);
    }
  }, [emblaApi, isPlaying]);
  
  // Toggle play/pause with improved handling
  const toggleAutoplay = useCallback(() => {
    if (!emblaApi) return;
    
    const autoplay = emblaApi.plugins().autoplay;
    if (!autoplay) return;
    
    if (autoplay.isPlaying()) {
      autoplay.stop();
      setIsPlaying(false);
    } else {
      autoplay.play();
      setIsPlaying(true);
    }
  }, [emblaApi]);
  
  // Set up handlers for buttons and dots
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
    
    // Check autoplay state when selection changes
    checkAutoplayState();
  }, [emblaApi, checkAutoplayState]);
  
  // Update progress bar
  const updateProgressBar = useCallback(() => {
    if (!emblaApi) return;
    
    const autoplay = emblaApi.plugins().autoplay;
    if (!autoplay) return;
    
    // Check if playing
    if (!autoplay.isPlaying()) {
      setProgress(0);
      return;
    }
    
    // Calculate progress percentage
    const timeRemaining = autoplay.timeUntilNext();
    if (timeRemaining === null) return;
    
    const progress = 1 - timeRemaining / autoplayOptions.delay;
    setProgress(progress * 100);
    
    // Keep UI in sync
    if (!isPlaying && autoplay.isPlaying()) {
      setIsPlaying(true);
    }
  }, [emblaApi, isPlaying, autoplayOptions.delay]);
  
  // Setup event handlers and initialize
  useEffect(() => {
    if (!emblaApi) return;
    
    // Set up event listeners for embla carousel
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    
    // Initial setup
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    
    return () => {
      if (emblaApi) {
        emblaApi.off('select', onSelect);
        emblaApi.off('reInit', onSelect);
      }
    };
  }, [emblaApi, onSelect]);
  
  // Separate effect for progress bar updates with requestAnimationFrame
  useEffect(() => {
    if (!emblaApi) return;
    
    let animationFrameId = null;
    let lastTime = 0;
    
    const updateProgress = (timestamp) => {
      // Throttle updates to reduce performance impact
      if (timestamp - lastTime > 100) {
        updateProgressBar();
        lastTime = timestamp;
      }
      animationFrameId = requestAnimationFrame(updateProgress);
    };
    
    // Start the animation frame loop
    animationFrameId = requestAnimationFrame(updateProgress);
    
    // Clean up
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [emblaApi, updateProgressBar]);
  
  // Memoize the featured agents to prevent multiple recalculations
  const enhancedAgents = useMemo(() => {
    if (!displayAgents || displayAgents.length === 0) return [];
    
    // Check if agents is an array. If it's a single object, convert to array
    const agentsArray = Array.isArray(displayAgents) ? displayAgents : [displayAgents];
    
    // Filter out any undefined or null agents
    const validAgents = agentsArray.filter(agent => 
      agent && agent.id
    );
    
    // If no valid agents, return empty array
    if (validAgents.length === 0) {
      return [];
    }
    
    // Set featured badges if not already set - add this to ensure badges show
    return validAgents.map((agent, index) => {
      // Every first agent should be featured if nothing else is set
      if (!agent.isFeatured && !agent.isBestseller && !agent.isNew && !agent.isTrending) {
        if (index === 0) {
          return { ...agent, isFeatured: true };
        } else if (index === 1) {
          return { ...agent, isBestseller: true };
        } else if (index === 2) {
          return { ...agent, isNew: true };
        } else if (index === 3) {
          return { ...agent, isTrending: true };
        }
      }
      return agent;
    });
  }, [displayAgents]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="featured-loading">
        <div className="featured-spinner"></div>
        <div className="featured-loading__text">Loading featured agents...</div>
      </div>
    );
  }
  
  // No agents state
  if (!enhancedAgents || enhancedAgents.length === 0) {
    return null;
  }

  // Generate exactly MAX_DOTS dots for navigation
  const fixedDots = Array.from({ length: Math.min(MAX_DOTS, enhancedAgents.length) }, (_, i) => i);

  return (
    <div className="featured-section">
      <style>{additionalStyles}</style>
      <div className="embla">
        <div className="embla__viewport" ref={emblaRef}>
          <div className="embla__container">
            {enhancedAgents.map((agent) => (
              <div className="embla__slide" key={agent.id}>
                <FeaturedAgentCard agent={agent} />
              </div>
            ))}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="embla__progress">
          <div 
            className="embla__progress__bar" 
            ref={progressBarRef}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Navigation buttons with event stopPropagation to prevent hover issues */}
        <button 
          className="embla__button embla__button--prev" 
          onClick={(e) => {
            e.stopPropagation();
            scrollPrev();
          }}
          disabled={!prevBtnEnabled}
          aria-label="Previous slide"
        >
          <FaChevronLeft />
        </button>
        
        <button 
          className="embla__button embla__button--next" 
          onClick={(e) => {
            e.stopPropagation();
            scrollNext();
          }}
          disabled={!nextBtnEnabled}
          aria-label="Next slide"
        >
          <FaChevronRight />
        </button>
      </div>
      
      {/* Play/Pause control - MOVED OUTSIDE CAROUSEL */}
      <div className="embla__controls">
        <button 
          className="embla__control-button" 
          onClick={toggleAutoplay}
          aria-label={isPlaying ? "Pause autoplay" : "Play autoplay"}
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
      </div>
      
      {/* Dots navigation - Fixed to exactly MAX_DOTS dots */}
      <div className="embla__dots">
        {fixedDots.map((index) => (
          <button 
            key={index}
            className={`embla__dot ${index === selectedIndex ? 'embla__dot--selected' : ''}`}
            onClick={() => scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
});

// Set display name for debugging
FeaturedAgents.displayName = 'FeaturedAgents';

export default FeaturedAgents;