import React, { useEffect, useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaCheckCircle, FaArrowLeft, FaStar } from 'react-icons/fa';
import '../styles/ThankYou.css';
import { getPersonalizedRecommendations, trackProductView } from '../services/recommendationService';
import { fetchFeaturedAgents } from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Define fallback image as a data URI to avoid network requests
const FALLBACK_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMThweCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
const DEFAULT_PRODUCT_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMThweCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzc3Nzc3NyI+UHJvZHVjdCBJbWFnZTwvdGV4dD48L3N2Zz4=';

const ThankYou = () => {
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendationSource, setRecommendationSource] = useState('');
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);
  const location = useLocation();
  
  // Parse order details from URL query parameters
  const orderDetails = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session_id');
    const orderId = params.get('order_id');
    return { sessionId, orderId };
  }, [location.search]);
  
  useEffect(() => {
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Fetch personalized recommendations
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Starting recommendation fetch process for Thank You page');
        
        // Try different recommendation sources in sequence
        let recommendations = [];
        let source = '';
        
        // 1. First try the personalized recommendation service
        try {
          console.log('Attempting to fetch personalized recommendations...');
          recommendations = await getPersonalizedRecommendations({
            limit: 3,
            useHistory: true
          });
          
          // Check if we got valid recommendations back (not debug placeholders)
          const validRecommendations = recommendations.filter(item => 
            item && 
            item.id && 
            typeof item.id === 'string' && 
            (item.title || item.name) &&
            !item.title?.includes('Debug Recommendation')
          );
          
          console.log('All recommendations before filtering:', recommendations);
          console.log('Valid recommendations after filtering:', validRecommendations);
          
          if (validRecommendations.length > 0) {
            console.log('Successfully received valid personalized recommendations');
            recommendations = validRecommendations;
            source = 'personalized';
          } else {
            console.warn('Received no valid recommendations from service, trying direct fetch');
            throw new Error('No valid recommendations from service');
          }
        } catch (error) {
          console.error('Failed to get recommendations from service:', error);
          
          // 2. Try to directly fetch featured agents as a fallback
          try {
            console.log('Attempting to fetch featured agents directly...');
            const featuredAgents = await fetchFeaturedAgents(3);
            
            if (featuredAgents && featuredAgents.length > 0) {
              recommendations = featuredAgents.map(agent => ({
                ...agent,
                detailUrl: `/agents/${agent.id}`
              }));
              source = 'featured';
              console.log('Successfully fetched featured agents as fallback');
            } else {
              throw new Error('No featured agents available');
            }
          } catch (featuredError) {
            console.error('Failed to fetch featured agents:', featuredError);
            throw featuredError; // Let the outer catch handle it
          }
        }
        
        // If we have recommendations at this point, use them
        if (recommendations.length > 0) {
          console.log('Using recommendations from source:', source);
          setRecommendedProducts(recommendations);
          setRecommendationSource(source);
        } else {
          // Should not happen due to previous error handling, but just in case
          throw new Error('No recommendations available from any source');
        }
      } catch (error) {
        console.error('All recommendation methods failed:', error);
        setError('Unable to load recommendations. Please try refreshing the page.');
        setRecommendedProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [user]);
  
  return (
    <div className="thankyou-container">
      <div className="thankyou-card">
        <div className="success-icon">
          <FaCheckCircle />
        </div>
        <h1>Thank You for Your Purchase!</h1>
        <p className="confirmation">
          Your order has been successfully processed. 
          You will receive a confirmation email shortly with your order details.
        </p>
        
        <div className="order-details">
          <p>The digital products will be available in your email inbox in the next few minutes.</p>
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          {orderDetails.orderId && (
            <p className="order-id">Order ID: {orderDetails.orderId}</p>
          )}
        </div>
        
        <div className="action-buttons">
          <Link to="/" className="continue-shopping">
            <FaArrowLeft /> Continue Shopping
          </Link>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-recommendations">
          <LoadingSpinner size="medium" />
          <p>Preparing personalized recommendations for you...</p>
        </div>
      ) : error ? (
        <div className="recommendation-error">
          <p>{error}</p>
        </div>
      ) : recommendedProducts.length > 0 ? (
        <div className="suggested-products">
          <h2>You Might Also Like</h2>
          <p className="recommendation-subtitle">
            {recommendationSource === 'personalized' && user 
              ? 'Personalized recommendations based on your interests and activity' 
              : 'Popular products you might be interested in'}
          </p>
          <div className="product-grid">
            {recommendedProducts.map(product => {
              // Make sure we have a valid URL
              const productUrl = product.detailUrl || `/agents/${product.id}`;
              
              // Use correct naming properties based on what's available
              const title = product.title || product.name || 'Product';
              const price = typeof product.price === 'number' 
                ? product.price
                : typeof product.price === 'string'
                  ? parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0
                  : 0;
              const isFree = product.isFree || price === 0;
              
              return (
                <div key={product.id} className="product-card">
                  <Link to={productUrl} className="product-card-link" 
                      onClick={() => {
                        // Track this view to improve future recommendations
                        if (product.id) trackProductView(product.id);
                      }}>
                    <img 
                      src={product.imageUrl || DEFAULT_PRODUCT_IMAGE} 
                      alt={title} 
                      onError={(e) => {
                        if (e.target.src !== FALLBACK_IMAGE) {
                          e.target.onerror = null; // Prevent infinite loop
                          e.target.src = FALLBACK_IMAGE;
                        }
                      }}
                    />
                    <h3>{title}</h3>
                    {product.rating && (
                      <div className="product-rating">
                        <FaStar className="star-icon" />
                        <span>{typeof product.rating === 'object' ? product.rating.average : product.rating}</span>
                      </div>
                    )}
                    <div className="product-price">
                      {isFree
                        ? 'Free' 
                        : `$${price.toFixed(2)}`}
                    </div>
                  </Link>
                  <Link to={productUrl} className="view-button">
                    View Details
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ThankYou; 