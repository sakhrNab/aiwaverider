import React, { useState, useEffect } from 'react';
import Slider from 'react-slick';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { Link } from 'react-router-dom';
import { FaStar, FaExclamationTriangle } from 'react-icons/fa';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './AgentCarousel.css';

// Custom arrow components for the slider
const PrevArrow = (props) => {
  const { className, onClick } = props;
  return (
    <div className={`${className} custom-arrow prev-arrow`} onClick={onClick}>
      <IoIosArrowBack />
    </div>
  );
};

const NextArrow = (props) => {
  const { className, onClick } = props;
  return (
    <div className={`${className} custom-arrow next-arrow`} onClick={onClick}>
      <IoIosArrowForward />
    </div>
  );
};

const RecommendationCard = ({ agent }) => {
  // Format price appropriately
  const formatPrice = (price) => {
    // Check if we have price details object
    if (agent.priceDetails) {
      if (agent.isFree) return 'Free';
      
      const { basePrice, discountedPrice, currency } = agent.priceDetails;
      const currencySymbol = currency === 'USD' ? '$' : currency;
      
      if (discountedPrice !== null && discountedPrice !== basePrice) {
        return `${currencySymbol}${discountedPrice.toFixed(2)}`;
      }
      
      return basePrice ? `${currencySymbol}${basePrice.toFixed(2)}` : 'Free';
    }
    
    // Legacy format
    if (price === 0) return 'Free';
    if (!price) return 'Free';
    
    // If price is a string with $ sign, extract the number
    if (typeof price === 'string') {
      // Handle monthly prices
      if (price.includes('/month')) {
        const match = price.match(/\$(\d+(\.\d+)?)/);
        if (match) {
          return `$${match[1]}`;
        }
        return price;
      }
      
      // Handle regular prices with $ sign
      if (price.includes('$')) {
        const match = price.match(/\$(\d+(\.\d+)?)/);
        if (match) {
          return `$${match[1]}`;
        }
      }
    }
    
    return typeof price === 'number' ? `$${price}` : price;
  };

  // Determine price tag CSS class
  const getPriceTagClass = (price) => {
    if (agent.isSubscription) return 'monthly';
    
    // Legacy format
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

  // Default placeholder image as data URI
  const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f0f0f0'/%3E%3Cpath d='M80 80 L120 120 M120 80 L80 120' stroke='%23999' stroke-width='4'/%3E%3Ctext x='100' y='160' font-family='Arial' font-size='12' text-anchor='middle' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";

  return (
    <div className="recommendation-card">
      <Link to={`/agents/${agent.id}`} className="recommendation-link">
        <div className="recommendation-card-inner">
          <div className="recommendation-image-container">
            <img 
              src={agent.iconUrl || placeholderImage} 
              alt={agent.title || agent.name || 'Agent'} 
              className="recommendation-image"
              onError={(e) => {
                e.target.src = placeholderImage;
                e.target.onerror = null; // Prevent infinite error loops
              }}
            />
            {agent.priceDetails ? (
              <div className={`recommendation-price-tag ${agent.isSubscription ? 'monthly' : ''}`}>
                {formatPrice(agent.priceDetails.basePrice)}
                {agent.isSubscription && <span className="subscription-label">/mo</span>}
              </div>
            ) : agent.price && (
              <div className={`recommendation-price-tag ${getPriceTagClass(agent.price)}`}>
                {formatPrice(agent.price)}
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
            <h3 className="recommendation-title">{agent.title || agent.name || 'Unnamed Agent'}</h3>
            <p className="recommendation-creator">{agent.creator?.name || "Unknown Creator"}</p>
            <div className="recommendation-rating">
              {agent.rating?.average ? (
                <>
                  <span className="rating-value">{formatRating(agent.rating.average)}</span>
                  <FaStar className="rating-star" />
                  <span className="rating-count">({agent.rating.count || 0})</span>
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
};

const AgentCarousel = ({ title, agents = [] }) => {
  const [isMockData, setIsMockData] = useState(false);
  
  useEffect(() => {
    // Check if the data is likely mock data
    if (agents && agents.length > 0) {
      // Mock data typically has these patterns
      const hasMockPatterns = agents.some(agent => 
        (agent.id && agent.id.startsWith('mock-')) || 
        (agent.title && agent.title.includes('Agent')) ||
        (agent.imageUrl && agent.imageUrl.includes('picsum.photos')) ||
        (agent.creator && agent.creator.name && agent.creator.name.includes('Creator'))
      );
      setIsMockData(hasMockPatterns);
    }
  }, [agents]);
  
  console.log('AgentCarousel props:', { title, agentsCount: agents?.length || 0 });
  
  // If no agents are provided, show a loading message
  if (!agents || agents.length === 0) {
    console.log('AgentCarousel showing placeholder - no agents available');
    return (
      <div className="agent-recommendations">
        <h2 className="recommendations-title">{title}</h2>
        <div className="recommendations-carousel" style={{ padding: '20px', textAlign: 'center' }}>
          <p>Loading recommendations...</p>
        </div>
      </div>
    );
  }

  const settings = {
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
  };

  return (
    <div className="agent-recommendations">
      <h2 className="recommendations-title">{title}</h2>
      
      {isMockData && (
        <div className="mock-data-warning">
          <FaExclamationTriangle className="warning-icon" />
          <span>Showing mock data - not fetched from database</span>
        </div>
      )}
      
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
};

export default AgentCarousel; 