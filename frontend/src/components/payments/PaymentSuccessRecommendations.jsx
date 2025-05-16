import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaExternalLinkAlt } from 'react-icons/fa';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import useAgentStore from '../../store/agentStore';
import { formatPrice, formatRating } from '../../services/recommendationService';
import './PaymentSuccessRecommendations.css';

// Add additional styling for recommendation cards
const additionalStyles = `
.recommendation-card {
  text-decoration: none;
  color: inherit;
  display: block;
  height: 100%;
  width: 100%;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.recommendation-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.recommendation-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.recommendation-image img, 
.recommendation-image .lazy-load-image-background {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.recommendation-card:hover .recommendation-image img,
.recommendation-card:hover .recommendation-image .lazy-load-image-background {
  transform: scale(1.05);
}
`;

/**
 * Displays product recommendations after a successful payment
 * 
 * @param {Object} props
 * @param {Array} props.purchasedItems - Array of products that were purchased
 * @param {string} props.currency - Currency code (USD, EUR, etc.)
 * @param {number} props.limit - Maximum number of recommendations to show (default: 3)
 * @returns {JSX.Element}
 */
const PaymentSuccessRecommendations = ({ purchasedItems, currency = 'USD', limit = 3 }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get agents from the store instead of fetching separately
  const { agents, recommendedAgents, isLoading } = useAgentStore();
  
  // Filter and prepare recommendations based on purchased items and available agents
  const recommendations = useMemo(() => {
    // If we have specific recommended agents, use those first
    if (recommendedAgents && recommendedAgents.length > 0) {
      return recommendedAgents.slice(0, limit);
    }
    
    // Otherwise, if we have agents, select some based on the purchased items
    if (agents && agents.length > 0) {
      // Get categories from purchased items
      const purchasedCategories = new Set(
        purchasedItems
          .map(item => item.category)
          .filter(Boolean)
      );
      
      // First try to find agents with matching categories
      let matchingAgents = agents.filter(agent => 
        agent.category && purchasedCategories.has(agent.category)
      );
      
      // If we don't have enough matching agents, add some random ones
      if (matchingAgents.length < limit) {
        const remainingAgents = agents
          .filter(agent => !matchingAgents.some(match => match.id === agent.id))
          .sort(() => 0.5 - Math.random()); // Shuffle
        
        matchingAgents = [
          ...matchingAgents,
          ...remainingAgents.slice(0, limit - matchingAgents.length)
        ];
      }
      
      return matchingAgents.slice(0, limit);
    }
    
    return [];
  }, [agents, recommendedAgents, purchasedItems, limit]);
  
  // Update loading state based on the store's loading state
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  // Handle image loading errors
  const handleImageError = (e) => {
    console.log(`Image error for product recommendation`);
    
    // Get the product title from the alt text
    const productTitle = e.target.alt || 'Product';
    
    // Set a placeholder image using inline SVG
    e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%233498db'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='16' text-anchor='middle' dominant-baseline='middle' fill='%23ffffff'%3E${encodeURIComponent(productTitle)}%3C/text%3E%3C/svg%3E`;
  };
  
  // Helper to safely get product image URL
  const getProductImageUrl = (product) => {
    if (!product) return '';
    
    if (product.image && product.image.url) {
      return product.image.url;
    }
    
    if (product.imageUrl) {
      return product.imageUrl;
    }
    
    // Generate a placeholder with the product name
    const name = product.title || product.name || 'Product';
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%233498db'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='16' text-anchor='middle' dominant-baseline='middle' fill='%23ffffff'%3E${encodeURIComponent(name)}%3C/text%3E%3C/svg%3E`;
  };
  
  // Helper to safely format rating to display
  const safeFormatRating = (rating) => {
    if (!rating) return '0.0';
    
    // If rating is an object (like {average: 4.5, count: 10})
    if (typeof rating === 'object' && rating.average) {
      return formatRating(rating.average);
    }
    
    // If rating is a number or string
    return formatRating(rating);
  };

  if (loading) {
    return (
      <div>
        <h1>Payment Success Recommendations</h1>
      </div>
    );
  }

  if (error) {
    return null; // Don't show anything if there's an error
  }

  if (recommendations.length === 0) {
    return null; // Don't show anything if there are no recommendations
  }

  return (
    <div className="payment-success-recommendations">
      <style>{additionalStyles}</style>
      <h2>You Might Also Like</h2>
      <p className="recommendation-subtitle">
        Based on your purchase, we think you'll enjoy these products
      </p>
      
      <div className="recommendation-grid">
        {recommendations.map(product => (
          <Link 
            key={product.id} 
            to={`/agents/${product.id}`}
            className="recommendation-card"
          >
            <div className="recommendation-image">
              <LazyLoadImage 
                src={getProductImageUrl(product)} 
                alt={product.title || product.name || 'AI Agent'} 
                onError={handleImageError}
                effect="blur"
                placeholderSrc={getProductImageUrl(product)}
                threshold={1000}
                width="100%"
                height={200}
                visibleByDefault={false}
              />
              {product.isBestseller && <span className="bestseller-badge">Bestseller</span>}
              {product.isNew && <span className="new-badge">New</span>}
              {!product.isBestseller && !product.isNew && product.category && 
                <span className="category-badge">{product.category}</span>}
            </div>
            
            <div className="recommendation-content">
              <h3>{typeof product.title === 'string' ? product.title : (typeof product.name === 'string' ? product.name : 'AI Agent')}</h3>
              
              <div className="recommendation-meta">
                <div className="recommendation-rating">
                  <FaStar className="star-icon" />
                  <span>{safeFormatRating(product.rating)}</span>
                </div>
                <div className="recommendation-price">
                  {product.price === 0 || product.isFree ? 'Free' : formatPrice(product.price, currency)}
                </div>
              </div>
              
              <div className="recommendation-category">
                {typeof product.category === 'string' ? product.category : 'AI Agent'}
              </div>
              
              <div className="view-details">
                View Details <FaExternalLinkAlt size={12} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default PaymentSuccessRecommendations; 