import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import '../styles/ThankYou.css';
import { getFeaturedProducts } from '../utils/productData';

const ThankYou = () => {
  const [featuredProducts, setFeaturedProducts] = React.useState([]);
  
  useEffect(() => {
    // Get featured products for suggestions
    const featured = getFeaturedProducts(3);
    setFeaturedProducts(featured);
    
    // Scroll to top
    window.scrollTo(0, 0);
  }, []);
  
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
        </div>
        
        <div className="action-buttons">
          <Link to="/" className="continue-shopping">
            <FaArrowLeft /> Continue Shopping
          </Link>
        </div>
      </div>
      
      {featuredProducts.length > 0 && (
        <div className="suggested-products">
          <h2>You Might Also Like</h2>
          <div className="product-grid">
            {featuredProducts.map(product => (
              <div key={product.id} className="product-card">
                <img src={product.imageUrl} alt={product.title} />
                <h3>{product.title}</h3>
                <div className="product-price">
                  {product.price > 0 ? `$${product.price.toFixed(2)}` : 'Free'}
                </div>
                <Link to={`/product/${product.id}`} className="view-button">
                  View Details
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThankYou; 