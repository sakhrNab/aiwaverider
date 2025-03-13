import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaStar, FaRegStar, FaCheck, FaDownload, FaHeart, FaRegHeart, FaLink, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { fetchAgentById, toggleWishlist, getDownloadCount, incrementDownloadCount } from '../../utils/api';
import { useCart } from '../../contexts/CartContext.jsx';
import { toast } from 'react-toastify';
import './AgentDetail.css';

const AgentDetail = () => {
  const { agentId } = useParams();
  const { addToCart } = useCart();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [customPrice, setCustomPrice] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copySuccess, setCopySuccess] = useState('');
  const [downloadCount, setDownloadCount] = useState(0);
  
  // Image slider refs
  const sliderRef = useRef(null);

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
        
        // Fetch the download count
        const downloads = await getDownloadCount(agentId);
        setDownloadCount(downloads);
        
        // Set initial price value if agent data is available
        if (data && data.price) {
          const basePrice = typeof data.price === 'number' ? data.price : 
                            typeof data.price === 'string' ? parseFloat(data.price.replace(/[^0-9.]/g, '')) || 0 : 0;
          setCustomPrice(basePrice.toString());
        }
        
        setIsWishlisted(data.isWishlisted || false);
      } catch (err) {
        console.error('Error loading agent:', err);
        if (err.response && err.response.status === 400) {
          setError(`Agent with ID "${agentId}" not found. It may have been removed or doesn't exist.`);
        } else if (err.message && err.message.includes('not found')) {
          setError(err.message);
        } else {
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
  
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopySuccess('Link copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch(err => {
        console.error('Could not copy link:', err);
      });
  };

  // Format price for display
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Free';
    if (typeof price === 'string') {
      if (price.toLowerCase() === 'free') return 'Free';
      return price.startsWith('$') ? price : `$${price}`;
    }
    if (typeof price === 'number') {
      return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
    }
    return 'Price unavailable';
  };
  
  // Get minimum price
  const getMinimumPrice = () => {
    if (!agent) return 0;
    
    if (agent.priceDetails && agent.priceDetails.minimumPrice !== undefined) {
      return agent.priceDetails.minimumPrice;
    }
    
    // Fall back to regular price if minimum not specified
    if (typeof agent.price === 'number') {
      return agent.price;
    }
    
    if (typeof agent.price === 'string') {
      const parsed = parseFloat(agent.price.replace(/[^0-9.]/g, '')) || 0;
      return parsed;
    }
    
    return 0;
  };
  
  // Handle custom price change
  const handlePriceChange = (e) => {
    const value = e.target.value;
    setCustomPrice(value);
  };
  
  // Validate if price is valid (at or above minimum)
  const isPriceValid = () => {
    const minPrice = getMinimumPrice();
    const price = parseFloat(customPrice) || 0;
    return price >= minPrice;
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
  
  // Get file type data display
  const getFileDetails = () => {
    if (!agent) return null;
    
    if (agent.fileType === 'pdf' || (agent.fileDetails && agent.fileDetails.type === 'pdf')) {
      const pageCount = agent.fileDetails?.pageCount || agent.pageCount || 50;
      return `${pageCount} pages (PDF)`;
    }
    
    if (agent.fileType === 'audio' || (agent.fileDetails && agent.fileDetails.type === 'audio')) {
      const duration = agent.fileDetails?.duration || agent.duration || '30 mins';
      return `${duration} (Audio)`;
    }
    
    if (agent.fileType === 'video' || (agent.fileDetails && agent.fileDetails.type === 'video')) {
      const duration = agent.fileDetails?.duration || agent.duration || '15 mins';
      return `${duration} (Video)`;
    }
    
    if (agent.fileType === 'template' || (agent.fileDetails && agent.fileDetails.type === 'template')) {
      return 'Template - ready to use';
    }
    
    // Default case
    return 'Digital download';
  };
  
  // Navigate through slider
  const showSlide = (index) => {
    if (!agent || !agent.images) return;
    
    // Handle wrap-around
    let newIndex = index;
    if (newIndex >= agent.images.length) {
      newIndex = 0;
    } else if (newIndex < 0) {
      newIndex = agent.images.length - 1;
    }
    
    setCurrentSlide(newIndex);
  };
  
  const nextSlide = () => {
    showSlide(currentSlide + 1);
  };
  
  const prevSlide = () => {
    showSlide(currentSlide - 1);
  };
  
  // Get image url array for slider
  const getImageUrls = () => {
    if (!agent) return [null];
    
    // If agent has images array, use it
    if (agent.images && Array.isArray(agent.images) && agent.images.length > 0) {
      return agent.images;
    }
    
    // Otherwise use the main image or fallback
    return [agent.imageUrl || null];
  };

  // Handle add to cart click
  const handleAddToCart = () => {
    if (!isPriceValid()) return;
    
    try {
      // Create a product object from the agent data
      const product = {
        id: agent.id,
        title: agent.title,
        price: parseFloat(customPrice),
        imageUrl: agent.imageUrl || getImageUrls()[0],
        quantity: 1
      };
      
      // Add to cart using the context function
      addToCart(product);
      
      // Update download count in the background
      incrementDownloadCount(agentId).then(() => {
        setDownloadCount(prev => prev + 1);
      });
    } catch (err) {
      console.error('Error adding to cart:', err);
      toast.error('Could not add item to cart. Please try again.');
    }
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
  
  const imageUrls = getImageUrls();
  const minPrice = getMinimumPrice();
  const fileDetails = getFileDetails();

  return (
    <div className="agent-detail-container">
      <div className="agent-detail-breadcrumb">
        <Link to="/">Home</Link> / <Link to="/agents">Agents</Link> / <span>{agent.title}</span>
      </div>

      <div className="agent-detail-content">
        {/* Image Slider Section */}
        <div className="image-slider-section">
          <div className="image-slider" ref={sliderRef}>
            <div className="slider-container">
              {imageUrls.length > 1 && (
                <button className="slider-arrow left-arrow" onClick={prevSlide}>
                  <FaArrowLeft />
                </button>
              )}
              
              <div className="slide">
                <img 
                  src={imageUrls[currentSlide] || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"%3E%3Crect width="300" height="200" fill="%234a4de7"/%3E%3Ctext x="150" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3EAgent%3C/text%3E%3C/svg%3E'} 
                  alt={`${agent.title} - slide ${currentSlide + 1}`} 
                  className="slide-image" 
                />
              </div>
              
              {imageUrls.length > 1 && (
                <button className="slider-arrow right-arrow" onClick={nextSlide}>
                  <FaArrowRight />
                </button>
              )}
            </div>
            
            {imageUrls.length > 1 && (
              <div className="slide-indicators">
                {imageUrls.map((_, index) => (
                  <button 
                    key={index} 
                    className={`indicator ${index === currentSlide ? 'active' : ''}`}
                    onClick={() => showSlide(index)}
                  ></button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Agent Info and Purchase Section */}
        <div className="agent-info-section">
          <h1 className="agent-title">{agent.title}</h1>
          
          <div className="agent-meta-row">
            <div className="price-display">
              <span className="price-value">{formatPrice(agent.price)}</span>
              {agent.priceDetails?.discountPercentage > 0 && (
                <span className="original-price">{formatPrice(agent.priceDetails.originalPrice)}</span>
              )}
            </div>
            
            <div className="creator-info">
              <span className="by-text">by</span>
              <a href="#" className="creator-name">{agent.creator?.name || "Unknown Creator"}</a>
            </div>
            
            <div className="rating-display">
              <div className="stars">
                {renderStars(agent.rating?.average || 0)}
              </div>
              <span className="rating-count">({agent.rating?.count || 0})</span>
            </div>
          </div>
          
          <div className="agent-description">
            <p>{agent.description || 'No description available for this agent.'}</p>
          </div>
          
          <div className="price-purchase-container">
            <div className="name-your-price">
              <label htmlFor="custom-price">Name a fair price:</label>
              <div className="price-input-container">
                <span className="currency-symbol">$</span>
                <input 
                  type="number" 
                  id="custom-price" 
                  className="custom-price-input" 
                  value={customPrice}
                  onChange={handlePriceChange}
                  min={minPrice}
                  step="0.01"
                />
              </div>
              <p className="minimum-price-note">
                The minimum price is {formatPrice(minPrice)}
              </p>
            </div>
            
            <button 
              className={`add-to-cart-btn ${!isPriceValid() ? 'disabled' : ''}`}
              disabled={!isPriceValid()}
              onClick={handleAddToCart}
            >
              Add to cart
            </button>
            
            <div className="downloads-info">
              <FaDownload className="download-icon" />
              <span className="download-count">{downloadCount} downloads</span>
            </div>
          </div>
          
          <div className="file-details-section">
            <div className="file-info">
              <span className="file-detail">{fileDetails}</span>
            </div>
          </div>
          
          <div className="agent-actions">
            <button 
              className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
              onClick={handleWishlistToggle}
              disabled={wishlistLoading}
            >
              {isWishlisted ? <FaHeart /> : <FaRegHeart />}
              <span>Add to wishlist</span>
            </button>
            
            <button className="copy-link-btn" onClick={handleCopyLink}>
              <FaLink />
              <span>{copySuccess || 'Copy link'}</span>
            </button>
          </div>
          
          <div className="guarantee-info">
            <p>30-day money back guarantee</p>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="reviews-section">
        <h2 className="section-heading">Customer Reviews</h2>
        
        <div className="ratings-summary">
          <div className="rating-box">
            <span className="big-rating">{formatRating(agent.rating?.average || 0)}</span>
            <div className="rating-stars">{renderStars(agent.rating?.average || 0)}</div>
            <span className="rating-total">({agent.rating?.count || 0} ratings)</span>
          </div>
          
          <div className="rating-breakdown">
            <div className="breakdown-row">
              <span>5 stars</span>
              <div className="progress-bar">
                <div className="progress" style={{ width: `${agent.rating?.distribution?.['5'] || 100}%` }}></div>
              </div>
              <span className="percentage">{agent.rating?.distribution?.['5'] || 100}%</span>
            </div>
            <div className="breakdown-row">
              <span>4 stars</span>
              <div className="progress-bar">
                <div className="progress" style={{ width: `${agent.rating?.distribution?.['4'] || 0}%` }}></div>
              </div>
              <span className="percentage">{agent.rating?.distribution?.['4'] || 0}%</span>
            </div>
            <div className="breakdown-row">
              <span>3 stars</span>
              <div className="progress-bar">
                <div className="progress" style={{ width: `${agent.rating?.distribution?.['3'] || 0}%` }}></div>
              </div>
              <span className="percentage">{agent.rating?.distribution?.['3'] || 0}%</span>
            </div>
            <div className="breakdown-row">
              <span>2 stars</span>
              <div className="progress-bar">
                <div className="progress" style={{ width: `${agent.rating?.distribution?.['2'] || 0}%` }}></div>
              </div>
              <span className="percentage">{agent.rating?.distribution?.['2'] || 0}%</span>
            </div>
            <div className="breakdown-row">
              <span>1 star</span>
              <div className="progress-bar">
                <div className="progress" style={{ width: `${agent.rating?.distribution?.['1'] || 0}%` }}></div>
              </div>
              <span className="percentage">{agent.rating?.distribution?.['1'] || 0}%</span>
            </div>
          </div>
        </div>
        
        <div className="reviews-list">
          {agent.reviews && agent.reviews.length > 0 ? (
            agent.reviews.map((review) => (
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
            ))
          ) : (
            <div className="no-reviews-message">
              <p>No reviews yet. Be the first to review this product!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDetail; 