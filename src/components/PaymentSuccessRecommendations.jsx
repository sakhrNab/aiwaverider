import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaExternalLinkAlt } from 'react-icons/fa';
import { fetchAgents } from '../utils/api';
import '../styles/PaymentSuccessRecommendations.css';

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
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Standard placeholder image for agents
  const getPlaceholderImage = () => 
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%234a4de7'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='24' text-anchor='middle' dominant-baseline='middle' fill='%23ffffff'%3EAgent Image%3C/text%3E%3C/svg%3E";

  // Handle image loading errors by providing standard placeholder
  const handleImageError = (e) => {
    console.log('Image loading error:', e.target.src);
    e.target.src = getPlaceholderImage();
    e.target.onerror = null;
  };

  // Get image URL with the same robust fallback logic as FeaturedAgents
  const getImageUrl = (agent) => {
    // Check for direct imageUrl property
    if (agent.imageUrl) {
      return agent.imageUrl;
    }
    
    // Check if image info exists in a nested structure
    if (agent.image) {
      if (typeof agent.image === 'string') {
        return agent.image;
      }
      if (agent.image.url) {
        return agent.image.url;
      }
    }
    
    // Try to parse the data field if it's a string
    if (agent.data && typeof agent.data === 'string') {
      try {
        const parsedData = JSON.parse(agent.data);
        if (parsedData.imageUrl) {
          return parsedData.imageUrl;
        }
      } catch (e) {
        console.warn("Error parsing agent.data:", e);
      }
    } else if (agent.data && typeof agent.data === 'object') {
      if (agent.data.imageUrl) {
        return agent.data.imageUrl;
      }
    }
    
    return getPlaceholderImage();
  };

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        
        // Extract categories from purchased items
        const categories = purchasedItems
          .filter(item => item && item.category)
          .map(item => item.category);
        
        // If no categories found, use 'All' as default
        const targetCategory = categories.length > 0 ? categories[0] : 'All';
        console.log('Fetching recommendations for category:', targetCategory);
        
        // Use the fetchAgents function from the API (same as Agents.jsx)
        // Add cache busting to ensure fresh data
        const timestamp = new Date().getTime();
        const agentsData = await fetchAgents(targetCategory, 'Top Rated', 1, { timestamp, limit });
        
        if (agentsData && agentsData.length > 0) {
          console.log('Retrieved agents data:', agentsData);
          
          // Filter out any items that were just purchased
          const filteredAgents = agentsData.filter(agent => 
            !purchasedItems.some(item => item && item.id === agent.id)
          );
          
          // Ensure we have enough recommendations
          if (filteredAgents.length < limit) {
            // If we don't have enough recommendations in the same category,
            // fetch some additional ones from all categories
            const additionalAgents = await fetchAgents('All', 'Hot & New', 1, { 
              timestamp,
              limit: limit - filteredAgents.length
            });
            
            console.log('Retrieved additional agents:', additionalAgents);
            
            // Combine and ensure no duplicates
            const combinedAgents = [
              ...filteredAgents,
              ...additionalAgents.filter(agent => 
                !filteredAgents.some(a => a.id === agent.id) &&
                !purchasedItems.some(item => item && item.id === agent.id)
              )
            ].slice(0, limit);
            
            setRecommendations(combinedAgents);
          } else {
            setRecommendations(filteredAgents.slice(0, limit));
          }
        } else {
          // If no similar products found, get featured/trending products
          const fallbackAgents = await fetchAgents('All', 'Hot & New', 1, { timestamp, limit });
          console.log('Using fallback agents:', fallbackAgents);
          setRecommendations(fallbackAgents.slice(0, limit));
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Unable to load recommendations');
        
        // Try to use a fallback method if the API fails
        try {
          const fallbackAgents = await fetchAgents('All', 'Top Rated', 1, { limit });
          if (fallbackAgents && fallbackAgents.length > 0) {
            console.log('Using emergency fallback agents:', fallbackAgents);
            setRecommendations(fallbackAgents.slice(0, limit));
            setError(null); // Clear error if fallback succeeds
          }
        } catch (fallbackErr) {
          console.error('Fallback recommendation fetch failed:', fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [purchasedItems, limit]);

  // Format rating to display with 1 decimal place
  const formatRating = (rating) => {
    if (!rating) return "0.0";
    return typeof rating === 'number' 
      ? rating.toFixed(1) 
      : (rating.average?.toFixed(1) || rating.toString());
  };

  // Format price with proper currency
  const formatPrice = (price) => {
    if (price === 0 || price === '0' || price === 'Free' || price === '$0') {
      return 'Free';
    }
    
    return typeof price === 'number'
      ? `${currency} ${price.toFixed(2)}`
      : price;
  };

  if (loading) {
    return (
      <div className="payment-success-recommendations loading">
        <h2>Finding more products you might like...</h2>
        <div className="recommendation-skeleton">
          {[...Array(limit)].map((_, index) => (
            <div key={index} className="recommendation-card skeleton">
              <div className="skeleton-image"></div>
              <div className="skeleton-title"></div>
              <div className="skeleton-price"></div>
            </div>
          ))}
        </div>
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
      <h2>You Might Also Like</h2>
      <p className="recommendation-subtitle">
        Based on your purchase, we think you'll enjoy these products
      </p>
      
      <div className="recommendation-grid">
        {recommendations.map(product => (
          <Link 
            key={product.id} 
            to={product.detailUrl || `/agents/${product.id}`}
            className="recommendation-card"
          >
            <div className="recommendation-image">
              <img 
                src={getImageUrl(product)} 
                alt={product.title || product.name || 'AI Agent'} 
                onError={handleImageError}
              />
              {product.isBestseller && <span className="bestseller-badge">Bestseller</span>}
              {product.isNew && <span className="new-badge">New</span>}
              {!product.isBestseller && !product.isNew && product.category && 
                <span className="category-badge">{product.category}</span>}
            </div>
            
            <div className="recommendation-content">
              <h3>{product.title || product.name}</h3>
              
              <div className="recommendation-meta">
                <div className="recommendation-rating">
                  <FaStar className="star-icon" />
                  <span>{formatRating(product.rating)}</span>
                </div>
                <div className="recommendation-price">
                  {formatPrice(product.price)}
                </div>
              </div>
              
              <div className="recommendation-category">
                {product.category}
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