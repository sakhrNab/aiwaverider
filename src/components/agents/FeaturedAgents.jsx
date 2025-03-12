import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Slider from 'react-slick';
import { FaStar, FaExclamationTriangle } from 'react-icons/fa';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './FeaturedAgents.css';
import '../../styles/MarketplaceAgentCard.css';

const AgentCard = ({ agent }) => {
  // Function to handle image errors and use a default placeholder
  const handleImageError = (e) => {
    // Use a data URI for the placeholder instead of a missing file
    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%234a4de7'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='24' text-anchor='middle' fill='white'%3EAgent Image%3C/text%3E%3C/svg%3E";
    e.target.onerror = null;
  };
  
  // Function to handle avatar image errors
  const handleAvatarError = (e) => {
    // Use a data URI for the placeholder instead of a missing file
    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e0e0e0'/%3E%3Ctext x='20' y='25' font-family='Arial' font-size='20' text-anchor='middle' fill='%23999'%3E?%3C/text%3E%3C/svg%3E";
    e.target.onerror = null;
  };

  // Format rating to show only one decimal place
  const formatRating = (rating) => {
    if (!rating) return '0';
    return typeof rating === 'number' ? rating.toFixed(1) : parseFloat(rating).toFixed(1);
  };

  // Format price to show only one decimal place
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Free';
    if (typeof price === 'string') return price;
    if (typeof price === 'number') {
      return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
    }
    return 'Price unavailable';
  };

  return (
    <Link to={`/agents/${agent.id}`} className="marketplace-agent-card">
      <div className="marketplace-agent-card-inner">
        <div className="agent-card-banner">
          <img 
            src={agent.imageUrl || "https://via.placeholder.com/300x200?text=Agent"} 
            alt={agent.title} 
            className="agent-banner-img"
            onError={handleImageError}
          />
          
          {/* Badges */}
          {agent.isBestseller && <div className="marketplace-badge bestseller">Bestseller</div>}
          {agent.isNew && <div className="marketplace-badge new">New</div>}
          {agent.isTrending && <div className="marketplace-badge trending">Trending</div>}
        </div>
        <div className="agent-card-content">
          <h3 className="marketplace-agent-title">{agent.title}</h3>
          <div className="agent-creator-info">
            <img 
              src={agent.creator?.avatarUrl || "https://via.placeholder.com/40?text=?"} 
              alt={agent.creator?.name || "Creator"} 
              className="creator-avatar"
              onError={handleAvatarError}
            />
            <span className="creator-name">{agent.creator?.name || "Unknown Creator"}</span>
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
            {formatPrice(agent.price)}
          </div>
          {agent.tags && agent.tags.length > 0 && (
            <div className="agent-tags">
              {agent.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="agent-tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

const FeaturedAgents = ({ agents, isLoading }) => {
  const [isMockData, setIsMockData] = useState(false);
  
  useEffect(() => {
    // Check if the data is likely mock data
    if (agents && agents.length > 0) {
      // Mock data typically has these patterns
      const hasMockPatterns = agents.some(agent => 
        agent.id.startsWith('agent-') || 
        (agent.imageUrl && agent.imageUrl.includes('picsum.photos')) ||
        (agent.creator && agent.creator.name && agent.creator.name.includes('Creator '))
      );
      setIsMockData(hasMockPatterns);
    }
  }, [agents]);

  const sliderSettings = {
    dots: true,
    infinite: agents?.length > 4,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    pauseOnHover: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  };

  if (isLoading) {
    return (
      <div className="featured-section">
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return null;
  }

  return (
    <div className="featured-carousel-container">
      {isMockData && (
        <div className="mock-data-warning">
          <FaExclamationTriangle className="warning-icon" />
          <span>Showing mock data - not fetched from database</span>
        </div>
      )}
      <div className="featured-carousel">
        <Slider {...sliderSettings}>
          {agents.map((agent) => (
            <div key={agent.id} className="carousel-slide">
              <AgentCard agent={agent} />
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
};

export default FeaturedAgents; 