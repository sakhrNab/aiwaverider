import React from 'react';
import { Link } from 'react-router-dom';
import Slider from 'react-slick';
import { FaStar } from 'react-icons/fa';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './FeaturedAgents.css';

const AgentCard = ({ agent }) => {
  return (
    <div className="agent-card">
      <Link to={`/agents/${agent.id}`} className="agent-link">
        <img src={agent.image} alt={agent.title} className="agent-image" />
        <div className="agent-content">
          <h3 className="agent-title">{agent.title}</h3>
          <div className="agent-creator">
            <img src={agent.creator.avatar} alt={agent.creator.name} className="creator-avatar" />
            <span className="creator-name">{agent.creator.name}</span>
          </div>
          <div className="agent-footer">
            <div className={`agent-price ${agent.isFree ? 'free' : ''}`}>
              {agent.isFree ? 'Free' : `$${agent.price}`}
            </div>
            {agent.rating && (
              <div className="agent-rating">
                <FaStar className="rating-star" />
                <span>{agent.rating.average} ({agent.rating.count})</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

const FeaturedAgents = ({ agents, isLoading }) => {
  const sliderSettings = {
    dots: true,
    infinite: true,
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
        <h2 className="featured-title">Featured</h2>
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
    <div className="featured-section">
      <h2 className="featured-title">Featured</h2>
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