import React from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaChevronLeft, FaChevronRight, FaUser } from 'react-icons/fa';
import './FeaturedAgents.css';
import '../../styles/MarketplaceAgentCard.css';

// Custom arrow components for the slider
const PrevArrow = (props) => {
  const { onClick } = props;
  return (
    <button onClick={onClick} className="carousel-control prev-arrow" aria-label="Previous">
      <FaChevronLeft />
    </button>
  );
};

const NextArrow = (props) => {
  const { onClick } = props;
  return (
    <button onClick={onClick} className="carousel-control next-arrow" aria-label="Next">
      <FaChevronRight />
    </button>
  );
};

const AgentCard = ({ agent }) => {
  // Function to handle image errors and use a default placeholder
  const handleImageError = (e) => {
    // Use a data URI for the placeholder instead of a missing file
    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%234a4de7'/%3E%3C/svg%3E";
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

  // Determine badge to show (priority: Trending, then New)
  const getBadge = () => {
    if (agent.isTrending) {
      return <div className="badge badge-trending">Trending</div>;
    } else if (agent.isNew) {
      return <div className="badge badge-new">New</div>;
    }
    return null;
  };

  // Get color based on agent type (for default styling)
  const getTypeColorClass = () => {
    if (agent.title && agent.title.includes('Drawing')) return 'drawing-type';
    if (agent.title && agent.title.includes('Self Improvement')) return 'improvement-type';
    if (agent.title && agent.title.includes('Assistant')) return 'assistant-type';
    return '';
  };

  return (
    <div className="featured-card-wrapper">
      <Link to={`/agents/${agent.id}`} className={`agent-card glass-effect ${getTypeColorClass()}`}>
        <div className="agent-card-image-container">
          <img 
            src={agent.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%234a4de7'/%3E%3C/svg%3E"} 
            alt={agent.title || agent.name || 'AI Agent'} 
            className="agent-card-image"
            onError={handleImageError}
          />
          {getBadge()}
        </div>
        <div className="agent-card-content">
          <div className="agent-card-header">
            <h3 className="agent-card-title">{agent.title || agent.name || 'AI Assistant'}</h3>
            <div className="agent-creator">
              <FaUser className="creator-icon" />
              <span className="creator-name">{agent.creator?.name || agent.creator?.id || 'AI Labs'}</span> 
            </div>
          </div>
          
          <div className="agent-card-footer">
            <div className="agent-card-meta">
              <div className="agent-card-price">
                {formatPrice(agent.price)}
              </div>
              <div className="agent-card-rating">
                {formatRating(agent.rating?.average || 0)}
                <FaStar className="star-icon" />
                <span className="agent-card-rating-count">({agent.rating?.count || 0})</span>
              </div>
            </div>
            
            {agent.category && (
              <div className="agent-card-categories">
                <span className="agent-card-category">{agent.category}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

const FeaturedAgents = ({ agents, isLoading }) => {
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

  // Calculate how many items to display per row based on viewport size
  const getItemsPerRow = () => {
    if (window.innerWidth >= 1024) return 4;
    if (window.innerWidth >= 768) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  };

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [itemsPerRow, setItemsPerRow] = React.useState(getItemsPerRow());

  // Update items per row on window resize
  React.useEffect(() => {
    const handleResize = () => {
      setItemsPerRow(getItemsPerRow());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalSlides = Math.ceil(agents.length / itemsPerRow);
  
  const handlePrev = () => {
    setCurrentIndex(current => (current > 0 ? current - 1 : 0));
  };
  
  const handleNext = () => {
    setCurrentIndex(current => (current < totalSlides - 1 ? current + 1 : current));
  };

  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < totalSlides - 1;

  return (
    <div className="featured-carousel-container">
      <div className="featured-carousel">
        <div className="featured-carousel-track" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {agents.map((agent, index) => (
            <div key={agent.id} className="featured-item">
              <AgentCard agent={agent} />
            </div>
          ))}
        </div>
        
        {canNavigatePrev && <PrevArrow onClick={handlePrev} />}
        {canNavigateNext && <NextArrow onClick={handleNext} />}
      </div>
      
      {totalSlides > 1 && (
        <div className="carousel-indicators">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              className={`carousel-indicator ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeaturedAgents; 