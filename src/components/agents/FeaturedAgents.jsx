import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Slider from 'react-slick';
import { FaStar, FaExclamationTriangle } from 'react-icons/fa';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './FeaturedAgents.css';

const AgentCard = ({ agent }) => {
  // Function to handle image errors and use a default placeholder
  const handleImageError = (e) => {
    // Use a data URI for the placeholder instead of a missing file
    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f0f0f0'/%3E%3Cpath d='M80 80 L120 120 M120 80 L80 120' stroke='%23999' stroke-width='4'/%3E%3Ctext x='100' y='160' font-family='Arial' font-size='12' text-anchor='middle' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";
    e.target.onerror = null; // Prevent infinite error loops
  };

  // Handle creator avatar error
  const handleAvatarError = (e) => {
    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='12' fill='%23f0f0f0'/%3E%3Cpath d='M8 8 L16 16 M16 8 L8 16' stroke='%23999' stroke-width='2'/%3E%3C/svg%3E";
    e.target.onerror = null;
  };

  // Format rating to show only one decimal place
  const formatRating = (rating) => {
    if (!rating) return '0';
    return typeof rating === 'number' ? rating.toFixed(1) : parseFloat(rating).toFixed(1);
  };

  // Format price to show only one decimal place
  const formatPrice = (price) => {
    if (typeof price === 'number') {
      return `$${price.toFixed(1)}`;
    } else if (typeof price === 'string') {
      return price.includes('$') ? price : `$${parseFloat(price).toFixed(1)}`;
    } else if (price === 0 || price === '0' || price === 'Free') {
      return 'Free';
    } else {
      return 'Free';
    }
  };

  return (
    <div className="agent-card">
      <Link to={`/agents/${agent.id}`} className="agent-link">
        <img 
          src={agent.image || agent.imageUrl} 
          alt={agent.title || agent.name || 'Agent'} 
          className="agent-image" 
          onError={handleImageError}
        />
        <div className="agent-content">
          <h3 className="agent-title">{agent.title || agent.name || 'Unnamed Agent'}</h3>
          <div className="agent-creator">
            <img 
              src={agent.creator?.avatar} 
              alt={agent.creator?.name || 'Creator'} 
              className="creator-avatar"
              onError={handleAvatarError}
            />
            <span className="creator-name">{agent.creator?.name || 'Unknown Creator'}</span>
          </div>
          <div className="agent-footer">
            {agent.rating ? (
              <div className="agent-rating">
                <span>{formatRating(agent.rating.average)}</span>
                <FaStar className="rating-star" />
                <span>({agent.rating.count || 0})</span>
              </div>
            ) : (
              <div className="agent-rating">
                <span>No ratings</span>
              </div>
            )}
            <div className={`agent-price ${agent.price === 0 || agent.price === '0' || agent.price === 'Free' ? 'free' : ''}`}>
              {formatPrice(agent.price)}
            </div>
          </div>
        </div>
      </Link>
    </div>
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