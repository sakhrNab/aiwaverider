import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaStar, FaRegStar, FaCheck, FaDownload, FaHeart, FaRegHeart } from 'react-icons/fa';
import { fetchAgentById, toggleWishlist } from '../../utils/api';
import './AgentDetail.css';

const AgentDetail = () => {
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadAgent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Validate agent ID format
        if (!agentId) {
          setError("Invalid agent ID provided.");
          setLoading(false);
          return;
        }
        
        // Try to load the agent data
        const data = await fetchAgentById(agentId);
        setAgent(data);
        setIsWishlisted(data.isWishlisted || false);
      } catch (err) {
        console.error('Error loading agent:', err);
        // Set a specific error message if it's a 400 error (not found)
        if (err.response && err.response.status === 400) {
          setError(`Agent with ID "${agentId}" not found. It may have been removed or doesn't exist.`);
        } else if (err.message && err.message.includes('not found')) {
          // Error message from our enhanced fetchAgentById function
          setError(err.message);
        } else {
          // Generic error message for other cases
          setError('Failed to load agent. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadAgent();
  }, [agentId]);

  const handleWishlistToggle = async () => {
    if (wishlistLoading) return;
    
    try {
      setWishlistLoading(true);
      await toggleWishlist(agentId);
      setIsWishlisted(!isWishlisted);
    } catch (err) {
      console.error('Error toggling wishlist:', err);
    } finally {
      setWishlistLoading(false);
    }
  };

  // Format price for display
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Free';
    if (typeof price === 'string') return price;
    if (typeof price === 'number') {
      return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
    }
    return 'Price unavailable';
  };

  // Safely format rating for display
  const formatRating = (rating) => {
    if (rating === undefined || rating === null) return '0.0';
    if (typeof rating === 'string') return rating;
    if (typeof rating === 'number') return rating.toFixed(1);
    return '0.0';
  };

  // Render stars for ratings
  const renderStars = (rating) => {
    const stars = [];
    const ratingValue = parseFloat(rating) || 0;
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = ratingValue - fullStars >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FaStar key={i} className="star-filled" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<FaStar key={i} className="star-half" />);
      } else {
        stars.push(<FaRegStar key={i} className="star-empty" />);
      }
    }
    
    return stars;
  };

  if (loading) {
    return (
      <div className="agent-detail-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading agent details...</p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="agent-detail-container">
        <div className="error-container">
          <h2>Agent Not Found</h2>
          <p>{error || 'Could not find the agent you\'re looking for.'}</p>
          <Link to="/agents" className="back-button">Return to Agents</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-detail-container">
      <div className="agent-detail-breadcrumb">
        <Link to="/">Home</Link> / <Link to="/agents">Agents</Link> / <span>{agent.title}</span>
      </div>

      <div className="agent-detail-content">
        {/* Left Column - Agent Image and Main Info */}
        <div className="agent-detail-left">
          <div className="agent-detail-image-container">
            <img 
              src={agent.imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"%3E%3Crect width="300" height="200" fill="%234a4de7"/%3E%3Ctext x="150" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3EAgent%3C/text%3E%3C/svg%3E'} 
              alt={agent.title} 
              className="agent-detail-image" 
            />
            {agent.isBestseller && <div className="agent-badge bestseller">Bestseller</div>}
            {agent.isNew && <div className="agent-badge new">New</div>}
          </div>

          <div className="agent-meta-info">
            <div className="agent-creator">
              <img 
                src={agent.creator?.avatarUrl || "https://via.placeholder.com/40?text=?"} 
                alt={agent.creator?.name || "Creator"} 
                className="creator-avatar"
              />
              <div className="creator-info">
                <span className="created-by">Created by</span>
                <span className="creator-name">{agent.creator?.name || "Unknown Creator"}</span>
              </div>
            </div>

            <div className="agent-rating-container">
              <div className="stars-container">
                {renderStars(agent.rating?.average || 0)}
              </div>
              <span className="rating-text">
                {formatRating(agent.rating?.average)} ({agent.rating?.count || 0} ratings)
              </span>
            </div>

            <div className="agent-stats">
              <div className="stat-item">
                <span className="stat-label">Category</span>
                <span className="stat-value">{agent.category || 'Uncategorized'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Last Update</span>
                <span className="stat-value">{agent.updatedAt ? new Date(agent.updatedAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
              {agent.version && (
                <div className="stat-item">
                  <span className="stat-label">Version</span>
                  <span className="stat-value">{agent.version}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Details and Actions */}
        <div className="agent-detail-right">
          <h1 className="agent-title">{agent.title}</h1>
          
          <div className="agent-price-section">
            <div className="agent-price">{formatPrice(agent.price)}</div>
            
            <div className="agent-action-buttons">
              <button className="btn-primary">
                <FaDownload className="btn-icon" /> Download
              </button>
              <button 
                className={`btn-wishlist ${isWishlisted ? 'active' : ''}`}
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
              >
                {isWishlisted ? <FaHeart /> : <FaRegHeart />}
              </button>
            </div>
          </div>

          <div className="agent-tabs">
            <button 
              className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews
            </button>
            <button 
              className={`tab-button ${activeTab === 'features' ? 'active' : ''}`}
              onClick={() => setActiveTab('features')}
            >
              Features
            </button>
            <button 
              className={`tab-button ${activeTab === 'faq' ? 'active' : ''}`}
              onClick={() => setActiveTab('faq')}
            >
              FAQ
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'overview' && (
              <div className="tab-pane overview">
                <h2 className="section-title">Description</h2>
                <div className="agent-description">
                  <p>{agent.description || 'No description available for this agent.'}</p>
                </div>

                {agent.features && agent.features.length > 0 && (
                  <div className="agent-features-highlight">
                    <h3>Key Features</h3>
                    <ul className="features-list">
                      {agent.features.map((feature, index) => (
                        <li key={index}><FaCheck className="check-icon" /> {feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="tab-pane reviews">
                <h2 className="section-title">Customer Reviews</h2>
                
                <div className="reviews-summary">
                  <div className="rating-average">
                    <span className="rating-big">{formatRating(agent.rating?.average)}</span>
                    <div className="rating-stars">
                      {renderStars(agent.rating?.average || 0)}
                      <span className="rating-count">({agent.rating?.count || 0} ratings)</span>
                    </div>
                  </div>
                </div>

                {agent.reviews && agent.reviews.length > 0 ? (
                  <div className="reviews-list">
                    {agent.reviews.map((review) => (
                      <div key={review.id} className="review-item">
                        <div className="review-header">
                          <div className="reviewer-info">
                            <span className="reviewer-name">{review.userName || 'Anonymous'}</span>
                            <span className="review-date">
                              {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Unknown date'}
                            </span>
                          </div>
                          <div className="review-rating">
                            {renderStars(review.rating || 0)}
                          </div>
                        </div>
                        <div className="review-content">
                          <p>{review.content || 'No comments provided.'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-reviews">
                    <p>No reviews yet. Be the first to review this agent!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'features' && (
              <div className="tab-pane features">
                <h2 className="section-title">Features</h2>
                
                {agent.features && agent.features.length > 0 ? (
                  <div className="features-detailed">
                    <ul className="features-list detailed">
                      {agent.features.map((feature, index) => (
                        <li key={index}>
                          <FaCheck className="check-icon" />
                          <div className="feature-detail">
                            <h4>{feature}</h4>
                            <p>This agent includes {feature.toLowerCase()} functionality.</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>No detailed features available for this agent.</p>
                )}
              </div>
            )}

            {activeTab === 'faq' && (
              <div className="tab-pane faq">
                <h2 className="section-title">Frequently Asked Questions</h2>
                
                <div className="faq-list">
                  <div className="faq-item">
                    <h3>How do I install this agent?</h3>
                    <p>After purchasing, you will receive download instructions. Simply follow them to install the agent.</p>
                  </div>
                  <div className="faq-item">
                    <h3>What systems does this agent work with?</h3>
                    <p>This agent is compatible with most modern operating systems including Windows, macOS, and Linux.</p>
                  </div>
                  <div className="faq-item">
                    <h3>Is there a refund policy?</h3>
                    <p>Yes, we offer a 30-day money-back guarantee if you're not satisfied with your purchase.</p>
                  </div>
                  <div className="faq-item">
                    <h3>How often is this agent updated?</h3>
                    <p>We provide regular updates to ensure optimal performance and compatibility.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Agents Section */}
      <div className="related-agents-section">
        <h2 className="section-title">You might also like</h2>
        <div className="related-agents-placeholder">
          <p>Related agents will be displayed here</p>
        </div>
      </div>
    </div>
  );
};

export default AgentDetail; 