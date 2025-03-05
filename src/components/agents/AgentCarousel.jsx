import React from 'react';
import Slider from 'react-slick';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
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
    if (price === 0) return 'Free';
    if (!price) return 'Free';
    
    // If price is a string with $ sign, extract the number
    if (typeof price === 'string' && price.includes('$')) {
      const match = price.match(/\$(\d+(\.\d+)?)/);
      if (match) {
        return `$${match[1]}`;
      }
    }
    
    return typeof price === 'number' ? `$${price}` : price;
  };

  return (
    <div className="recommendation-card">
      <Link to={`/agents/${agent.id}`} className="recommendation-link">
        <div className="recommendation-card-inner">
          <div className="recommendation-image-container">
            <img 
              src={agent.imageUrl || '/placeholder-agent.jpg'} 
              alt={agent.title} 
              className="recommendation-image"
              onError={(e) => {
                e.target.src = '/placeholder-agent.jpg';
              }}
            />
            {agent.price && (
              <div className="recommendation-price-tag">
                {formatPrice(agent.price)}
              </div>
            )}
            {agent.isBestseller && (
              <div className="recommendation-badge bestseller">Bestseller</div>
            )}
            {agent.isNew && (
              <div className="recommendation-badge new">New</div>
            )}
          </div>
          <div className="recommendation-content">
            <h3 className="recommendation-title">{agent.title}</h3>
            <p className="recommendation-creator">{agent.creator?.name || "Unknown Creator"}</p>
            <div className="recommendation-rating">
              {agent.rating?.average ? (
                <>
                  <span className="rating-value">{agent.rating.average}</span>
                  <FaStar className="rating-star" />
                  <span className="rating-count">({agent.rating.count || 0})</span>
                </>
              ) : (
                <span className="no-rating">No ratings yet</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

const AgentCarousel = ({ title, agents = [] }) => {
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