import React, { useState, useMemo } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { toggleWishlist } from '../../api/marketplace/agentApi';
import { toast } from 'react-toastify';
import { fixPlaceholderUrl } from '../../utils/imageUtils';
import '../../styles/MarketplaceAgentCard.css';

const AgentCard = ({ agent }) => {
  const { user } = useContext(AuthContext);
  const [isWishlisted, setIsWishlisted] = useState(agent.isWishlisted);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const handleWishlist = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please log in to add to wishlist");
      return;
    }
    
    setIsLoading(true);
    try {
      await toggleWishlist(agent.id);
      setIsWishlisted(!isWishlisted);
      toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
    } catch (error) {
      toast.error("Failed to update wishlist");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Free';
    if (typeof price === 'string') return price;
    return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
  };
  
  // Get properly processed image URL
  const imageUrl = useMemo(() => {
    // Handle image error case
    if (imageError) {
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"%3E%3Crect width="300" height="200" fill="%234a4de7"/%3E%3Ctext x="150" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3E' + (agent.name || 'Agent') + '%3C/text%3E%3C/svg%3E';
    }
    
    if(agent.image && agent.image.url){
      return fixPlaceholderUrl(agent.image.url);
    }
    
    // Try to use iconUrl with scaling as a fallback
    if (agent.iconUrl) {
      return fixPlaceholderUrl(agent.iconUrl);
    }
    
    // Default placeholder
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"%3E%3Crect width="300" height="200" fill="%234a4de7"/%3E%3Ctext x="150" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3E' + (agent.name || 'Agent') + '%3C/text%3E%3C/svg%3E';
  }, [agent.imageUrl, agent.image, agent.iconUrl, agent.name, imageError]);
  
  // Handle image loading errors
  const handleImageError = () => {
    setImageError(true);
  };
  
  return (
    // <div className="marketplace-agent-card">
    //   <Link to={`/agents/${agent.id}`} className="marketplace-agent-card-inner">
    //     <div className="marketplace-agent-image-container">
    //       {/* <img 
    //         src={imageUrl} 
    //         alt={agent.title || agent.name} 
    //         className="marketplace-agent-image"
    //         onError={handleImageError}
    //       />
    //        */}
    //       <button 
    //         className={`marketplace-wishlist-button ${isWishlisted ? 'active' : ''} ${isLoading ? 'loading' : ''}`}
    //         onClick={handleWishlist}
    //         aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
    //       >
    //         {isWishlisted ? <FaHeart /> : <FaRegHeart />}
    //       </button>
          
    //       {agent.isBestseller && <div className="marketplace-badge bestseller">Bestseller</div>}
    //       {agent.isNew && <div className="marketplace-badge new">New</div>}
    //     </div>
        
    //     <div className="marketplace-agent-content">
    //       <h3 className="marketplace-agent-title">{agent.title || agent.name}</h3>
    //       <p className="marketplace-agent-description">{agent.description || "No description available"}</p>
          
    //       <div className="marketplace-agent-creator">
    //         By {agent.creator?.name || 'Unknown Creator'}
    //       </div>
          
    //       <div className="marketplace-agent-rating">
    //         {agent.rating ? (
    //           <>
    //             <span className="marketplace-rating-score">{parseFloat(agent.rating.average).toFixed(1)}</span>
    //             <FaStar className="marketplace-star-icon" />
    //             <span className="marketplace-rating-count">({agent.rating.count})</span>
    //           </>
    //         ) : (
    //           <span className="marketplace-no-rating">No ratings yet</span>
    //         )}
    //       </div>
          
    //       <div className="marketplace-agent-price">
    //         {formatPrice(agent.price)}
    //       </div>
    //     </div>
    //   </Link>
    // </div>
    <div>
      <h1>Marketplace</h1>
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
        <div className="marketplace-agents-grid">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketplaceSection; 