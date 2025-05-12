import React, { useEffect, useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import './ThankYouPage.css';
import { AuthContext } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PaymentSuccessRecommendations from '../components/payments/PaymentSuccessRecommendations';

const ThankYou = () => {
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [loading, setLoading] = useState(true);
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
    
    // Get purchased items from localStorage if available
    const loadPurchasedItems = () => {
      try {
        const storedItems = localStorage.getItem('lastPurchasedItems');
        if (storedItems) {
          const parsedItems = JSON.parse(storedItems);
          if (Array.isArray(parsedItems) && parsedItems.length > 0) {
            setPurchasedItems(parsedItems);
          }
        }
        
        setLoading(false);
      } catch (storageError) {
        console.error('Error retrieving purchased items:', storageError);
        setLoading(false);
      }
    };
    
    loadPurchasedItems();
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
      ) : (
        <PaymentSuccessRecommendations 
          purchasedItems={purchasedItems}
          currency="$"
          limit={3}
        />
      )}
    </div>
  );
};

export default ThankYou; 