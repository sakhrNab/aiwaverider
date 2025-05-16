import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import Slider from 'react-slick';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { Link } from 'react-router-dom';
import { FaStar, FaExclamationTriangle } from 'react-icons/fa';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './AgentCarousel.css';
import { generateAgentPlaceholder } from '../../utils/imageUtils';

// Custom arrow components for the slider
const PrevArrow = memo(({ className, onClick }) => {
  return (
    <div className={`${className} custom-arrow prev-arrow`} onClick={onClick}>
      <IoIosArrowBack />
    </div>
  );
});

const NextArrow = memo(({ className, onClick }) => {
  return (
    <div className={`${className} custom-arrow next-arrow`} onClick={onClick}>
      <IoIosArrowForward />
    </div>
  );
});

// Helper functions moved outside component to prevent recreating
const formatPrice = (agent) => {
  // Guard against null/undefined agent
  if (!agent) return 'Free';
  
  // First check for explicit free flags
  if (agent.isFree === true) return 'Free';
  if (agent.price === 0 || agent.price === '0' || agent.price === 'Free') return 'Free';
  
  // Handle priceDetails object if available
    if (agent.priceDetails) {
    // Safely extract values with defaults
    const basePrice = typeof agent.priceDetails.basePrice === 'number' ? agent.priceDetails.basePrice : 0;
    const discountedPrice = typeof agent.priceDetails.discountedPrice === 'number' ? agent.priceDetails.discountedPrice : null;
    const currency = agent.priceDetails.currency || 'USD';
      const currencySymbol = currency === 'USD' ? '$' : currency;
      
    // Handle free products
    if (basePrice === 0) return 'Free';
    
    // Handle discounted price if it's valid and different from base price
      if (discountedPrice !== null && discountedPrice !== basePrice) {
        return `${currencySymbol}${discountedPrice.toFixed(2)}`;
      }
      
    // Return base price if it's valid
    return `${currencySymbol}${basePrice.toFixed(2)}`;
    }
    
  // Handle legacy string or number price
  const price = agent.price;
  
  // If price is missing or invalid, return Free
  if (price === undefined || price === null) return 'Free';
    
  // Handle price as string
    if (typeof price === 'string') {
      // Handle monthly prices
      if (price.includes('/month')) {
        const match = price.match(/\$(\d+(\.\d+)?)/);
        if (match) {
          return `$${match[1]}`;
        }
        return price;
      }
    
    // Handle explicit 'Free'
    if (price.toLowerCase() === 'free') return 'Free';
      
      // Handle regular prices with $ sign
      if (price.includes('$')) {
        const match = price.match(/\$(\d+(\.\d+)?)/);
        if (match) {
          return `$${match[1]}`;
        }
      }
    
    return price; // Return as is if no pattern matches
  }
  
  // Handle numeric price
  if (typeof price === 'number') {
    return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
  }
  
  // Final fallback
  return 'Free';
  };

// Get price tag class
const getPriceTagClass = (agent) => {
    if (agent.isSubscription) return 'monthly';
    
    // Legacy format
  const price = agent.price;
    if (typeof price === 'string') {
      if (price.includes('/month')) return 'monthly';
      if (price.includes('every')) return 'sale';
    }
    return '';
  };

  // Format rating to show only one decimal place
  const formatRating = (rating) => {
    if (!rating) return '0';
    return typeof rating === 'number' ? rating.toFixed(1) : parseFloat(rating).toFixed(1);
  };

// Update the generatePlaceholderImage function
const generatePlaceholderImage = (title, name) => {
  return generateAgentPlaceholder(null, title || name);
};

const RecommendationCard = memo(({ agent }) => {
  // Get appropriate image URL with fallback
  const imageUrl = useMemo(() => {
    if (!agent.iconUrl) {
      return generatePlaceholderImage(agent.title, agent.name);
    }
    return agent.iconUrl;
  }, [agent.iconUrl, agent.title, agent.name]);

  const handleImageError = useCallback((e) => {
    e.target.src = generatePlaceholderImage(agent.title, agent.name);
    e.target.onerror = null; // Prevent infinite error loops
  }, [agent.title, agent.name]);

  // Memoize frequently accessed properties
  const title = useMemo(() => agent.title || agent.name || 'Unnamed Agent', [agent.title, agent.name]);
  const creatorName = useMemo(() => agent.creator?.name || "Unknown Creator", [agent.creator]);
  const price = useMemo(() => formatPrice(agent), [agent]);
  const priceTagClass = useMemo(() => getPriceTagClass(agent), [agent]);
  const rating = useMemo(() => agent.rating?.average ? formatRating(agent.rating.average) : null, [agent.rating]);
  const ratingCount = useMemo(() => agent.rating?.count || 0, [agent.rating]);

  return (
    <div className="recommendation-card">
      <Link to={`/agents/${agent.id}`} className="recommendation-link">
        <div className="recommendation-card-inner">
          <div className="recommendation-image-container">
            <LazyLoadImage
              src={imageUrl} 
              alt={title} 
              className="recommendation-image"
              onError={handleImageError}
              effect="blur"
              placeholderSrc={generatePlaceholderImage(agent.title, agent.name)}
              width="100%"
              height={160}
              threshold={300}
            />
            {agent.priceDetails ? (
              <div className={`recommendation-price-tag ${agent.isSubscription ? 'monthly' : ''}`}>
                {price}
                {agent.isSubscription && <span className="subscription-label">/mo</span>}
              </div>
            ) : agent.price && (
              <div className={`recommendation-price-tag ${priceTagClass}`}>
                {price}
              </div>
            )}
            {agent.isBestseller && (
              <div className="recommendation-badge bestseller">Bestseller</div>
            )}
            {agent.isNew && (
              <div className="recommendation-badge new">New</div>
            )}
            {agent.isTrending && (
              <div className="recommendation-badge trending">Trending</div>
            )}
          </div>
          <div className="recommendation-content">
            <h3 className="recommendation-title">{title}</h3>
            <p className="recommendation-creator">{creatorName}</p>
            <div className="recommendation-rating">
              {rating ? (
                <>
                  <span className="rating-value">{rating}</span>
                  <FaStar className="rating-star" />
                  <span className="rating-count">({ratingCount})</span>
                </>
              ) : (
                <span className="no-rating">No ratings yet</span>
              )}
            </div>
            {agent.version && (
              <div className="recommendation-version">v{agent.version}</div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
});

// Add displayName for better debugging
RecommendationCard.displayName = 'RecommendationCard';

const AgentCarousel = memo(({ title, agents = [] }) => {
  // Memoize slider settings
  const settings = useMemo(() => ({
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    responsive: [
      {
        breakpoint: 1440,
        settings: {
          slidesToShow: 4,
        }
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
        }
      }
    ]
  }), []);
  
  // If no agents are provided, show a loading message
  if (!agents || agents.length === 0) {
    return (
      <div className="agent-recommendations">
        <h2 className="recommendations-title">{title}</h2>
        <div className="recommendations-carousel" style={{ padding: '20px', textAlign: 'center' }}>
          <p>No recommendations available at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-recommendations">
      <h2 className="recommendations-title">{title}</h2>
      
      <div className="recommendations-carousel">
        <Slider {...settings}>
          {agents.map((agent) => (
            <div key={agent.id} className="recommendation-slide">
              <RecommendationCard agent={agent} />
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
});

// Add displayName for better debugging
AgentCarousel.displayName = 'AgentCarousel';

export default AgentCarousel; 