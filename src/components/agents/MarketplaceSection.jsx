import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaHeart, FaRegHeart } from 'react-icons/fa';
import { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { toggleWishlist } from '../../utils/api';
import { toast } from 'react-toastify';

const AgentCard = ({ agent }) => {
  const { user } = useContext(AuthContext);
  const [isWishlisted, setIsWishlisted] = useState(agent.isWishlisted);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.info('Please sign in to add items to your wishlist');
      return;
    }
    
    try {
      setIsLoading(true);
      const result = await toggleWishlist(agent.id);
      setIsWishlisted(result.wishlisted);
      toast.success(result.wishlisted ? 'Added to wishlist' : 'Removed from wishlist');
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.error('Failed to update wishlist');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="agent-card">
      <Link to={`/agents/${agent.id}`} className="agent-link">
        <div className="agent-image-container">
          <img src={agent.image} alt={agent.title} className="agent-image" />
          <button 
            className={`wishlist-button ${isWishlisted ? 'active' : ''} ${isLoading ? 'loading' : ''}`} 
            onClick={handleWishlist}
            disabled={isLoading}
          >
            {isWishlisted ? <FaHeart /> : <FaRegHeart />}
          </button>
        </div>
        <div className="agent-content">
          <h3 className="agent-title">{agent.title}</h3>
          <div className="agent-creator">
            <img src={agent.creator.avatar} alt={agent.creator.name} className="creator-avatar" />
            <span className="creator-name">{agent.creator.name}</span>
          </div>
          <div className="agent-footer">
            <div className="agent-price">{agent.price}</div>
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

const MarketplaceSection = ({ agents, isLoading, currentFilter, onFilterChange, searchQuery }) => {
  const filters = ['Hot & Now', 'Free', 'Newest', 'Popular', 'Highest Rated'];
  
  const filteredAgents = agents.filter(agent => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      agent.title.toLowerCase().includes(query) ||
      agent.creator.name.toLowerCase().includes(query) ||
      (agent.description && agent.description.toLowerCase().includes(query))
    );
  });
  
  return (
    <div className="marketplace-section">
      <div className="marketplace-header">
        <h2 className="marketplace-title">Marketplace</h2>
        <div className="filters-container">
          {filters.map((filter) => (
            <button
              key={filter}
              className={`filter-button ${currentFilter === filter ? 'active' : ''}`}
              onClick={() => onFilterChange(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="no-results">
          <p>No agents found. Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="agents-grid">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketplaceSection; 