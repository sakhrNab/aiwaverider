import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { FaStar, FaUser, FaChevronLeft, FaChevronRight, FaPause, FaPlay } from 'react-icons/fa';
import './FeaturedAgents.css';

// Utility functions for image fallbacks
const getPlaceholderImage = () => 
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%234a4de7'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='24' text-anchor='middle' dominant-baseline='middle' fill='%23ffffff'%3EAgent Image%3C/text%3E%3C/svg%3E";

const getAvatarPlaceholder = () => 
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e0e0e0'/%3E%3Ctext x='20' y='25' font-family='Arial' font-size='20' text-anchor='middle' fill='%23999'%3E?%3C/text%3E%3C/svg%3E";

// Featured Agent Card Component
const FeaturedAgentCard = ({ agent }) => {
  // Handle image loading errors
  const handleImageError = (e) => {
    e.target.src = getPlaceholderImage();
    e.target.onerror = null;
  };

  // Get image URL with robust fallback logic
  const getImageUrl = () => {
    // Check for different possible image URL locations in the agent object
    if (agent.imageUrl) {
      return agent.imageUrl;
    }
    
    // Check if image info exists in a nested structure
    if (agent.image && agent.image.url) {
      return agent.image.url;
    }
    
    // Try to parse the data field if it's a string
    if (agent.data && typeof agent.data === 'string') {
      try {
        const parsedData = JSON.parse(agent.data);
        if (parsedData.imageUrl) {
          return parsedData.imageUrl;
        }
      } catch (e) {
        console.error("Error parsing agent.data:", e);
      }
    }
    
    return getPlaceholderImage();
  };

  // Format rating to one decimal place
  const formatRating = (rating) => {
    if (!rating) return '0';
    return typeof rating === 'number' ? rating.toFixed(1) : parseFloat(rating).toFixed(1);
  };

  // Format price display
  const formatPrice = () => {
    // Check if agent is free
    if (agent.isFree) return <span className="featured-card__price--free">Free</span>;
    if (agent.price === 0) return <span className="featured-card__price--free">Free</span>;
    
    // Check price details object if available
    if (agent.priceDetails) {
      const { basePrice, discountedPrice, currency } = agent.priceDetails;
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
    
    return 'Price unavailable';
  };

  // Prepare badges
  const renderBadges = () => {
    const badges = [];
    
    if (agent.isFeatured) {
      badges.push(
        <div key="featured" className="featured-card__badge featured-card__badge--featured">
          Featured
        </div>
      );
    }
    
    if (agent.isBestseller) {
      badges.push(
        <div key="bestseller" className="featured-card__badge featured-card__badge--bestseller">
          Bestseller
        </div>
      );
    }
    
    if (agent.isNew) {
      badges.push(
        <div key="new" className="featured-card__badge featured-card__badge--new">
          New
        </div>
      );
    }
    
    if (agent.isTrending) {
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

  return (
    <Link to={`/agents/${agent.id}`} className="block h-full">
      <div className="featured-card">
        <div className="featured-card__image-container">
          <img 
            src={getImageUrl()} 
            alt={agent.title || agent.name || 'AI Agent'} 
            className="featured-card__image"
            onError={handleImageError}
          />
          {renderBadges()}
        </div>

        <div className="featured-card__content">
          <h3 className="featured-card__title">
            {agent.title || agent.name || 'AI Assistant'}
          </h3>
          
          {agent.description && (
            <p className="featured-card__description">{agent.description}</p>
          )}
          
          <div className="featured-card__creator">
            <FaUser className="featured-card__creator-icon" />
            {agent.creator?.name || agent.creator?.id || "AI Labs"}
          </div>
          
          <div className="featured-card__meta">
            <div className="featured-card__rating">
              {agent.rating?.average ? (
                <>
                  <span className="featured-card__rating-score">{formatRating(agent.rating.average)}</span>
                  <FaStar className="featured-card__rating-star" />
                  <span className="featured-card__rating-count">({agent.rating.count || 0})</span>
                </>
              ) : (
                <span className="featured-card__no-rating">No ratings</span>
              )}
            </div>
            
            <div className="featured-card__price">
              {formatPrice()}
            </div>
          </div>
          
          {agent.version && (
            <div className="featured-card__version">v{agent.version}</div>
          )}
        </div>
      </div>
    </Link>
  );
};

const FeaturedAgents = ({ agents, isLoading }) => {
  // Fixed number of dots/slides we want to show
  const MAX_DOTS = 6;
  
  // Create autoplay options with improved settings
  const autoplayOptions = {
    delay: 5000,
    stopOnInteraction: false, 
    stopOnMouseEnter: false, // Turn off automatic stopping on mouse enter
    rootNode: (emblaRoot) => emblaRoot // Only use the root node
  };

  // Use a ref to access the Autoplay plugin instance
  const autoplayPluginRef = useRef(null);
  autoplayPluginRef.current = Autoplay(autoplayOptions);

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
  }, [emblaApi, isPlaying]);
  
  // Set up event listeners
  useEffect(() => {
    if (!emblaApi) return;
    
    // Update snap points when carousel initialized
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    
    // Set up timer for progress bar
    const progressInterval = setInterval(updateProgressBar, 16);
    
    // Set up event listeners for embla carousel
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    
    // Clean up
    return () => {
      clearInterval(progressInterval);
      if (emblaApi) {
        emblaApi.off('select', onSelect);
        emblaApi.off('reInit', onSelect);
      }
    };
  }, [emblaApi, onSelect, updateProgressBar]);
  
  // Get featured agents limited to MAX_DOTS
  const getFeaturedAgents = () => {
    if (!agents || agents.length === 0) return [];
    
    // For debugging
    console.log("All agents received in carousel:", agents);
    
    // Check if agents is an array. If it's a single object, convert to array
    const agentsArray = Array.isArray(agents) ? agents : [agents];
    
    // Filter out any undefined or null agents
    const validAgents = agentsArray.filter(agent => 
      agent && agent.id
    );
    
    // If no valid agents, return empty array
    if (validAgents.length === 0) {
      console.warn("No valid agents found");
      return [];
    }
    
    // Continue with filtering logic
    const featured = validAgents.filter(agent => 
      agent.isFeatured === true || 
      agent.featured === true || 
      agent.isBestseller === true || 
      agent.isTrending === true ||
      (agent.data && agent.data.isFeatured === true) || // Check inside data object
      // If none are specifically featured, try to find ones with good ratings
      (agent.rating && agent.rating.average && agent.rating.average >= 4.5)
    );
    
    // If we don't have enough featured agents, just use the available ones
    if (featured.length < MAX_DOTS) {
      console.log("Not enough featured agents, using all available agents");
      return validAgents.slice(0, MAX_DOTS);
    }
    
    return featured.slice(0, MAX_DOTS);
  };
  
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
  if (!agents || agents.length === 0) {
    return null;
  }
  
  // Get the agents to display, limited to MAX_DOTS
  const displayAgents = getFeaturedAgents();

  // Generate exactly MAX_DOTS dots for navigation
  const fixedDots = Array.from({ length: Math.min(MAX_DOTS, displayAgents.length) }, (_, i) => i);

  return (
    <div className="featured-section">
      <div className="embla">
        <div className="embla__viewport" ref={emblaRef}>
          <div className="embla__container">
            {displayAgents.map((agent) => (
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
};

export default FeaturedAgents; 