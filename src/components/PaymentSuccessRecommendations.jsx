import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaExternalLinkAlt } from 'react-icons/fa';
import { 
  getRecommendationsForPurchase, 
  getProductImageUrl, 
  createImageErrorHandler, 
  formatPrice, 
  formatRating 
} from '../services/recommendationService';
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

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        
        // Use the shared utility function to get recommendations
        const fetchedRecommendations = await getRecommendationsForPurchase({
          purchasedItems,
          limit
        });
        
        setRecommendations(fetchedRecommendations);
        setError(null);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Unable to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [purchasedItems, limit]);

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
                src={getProductImageUrl(product)} 
                alt={product.title || product.name || 'AI Agent'} 
                onError={createImageErrorHandler(product.title || product.name)}
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
                  {formatPrice(product.price, currency)}
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