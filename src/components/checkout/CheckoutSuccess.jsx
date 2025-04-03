import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPaymentStatus } from '../../services/paymentApi';
import { toast } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEnvelope, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import './CheckoutSuccess.css';

/**
 * Checkout success page that shows order confirmation
 * and displays a notification about the template being sent by email
 */
const CheckoutSuccess = () => {
  const [orderStatus, setOrderStatus] = useState('processing');
  const [orderId, setOrderId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
  
  // Parse payment info from URL parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const paymentId = queryParams.get('payment_id');
    const paymentType = queryParams.get('type') || 'payment_intent';
    const status = queryParams.get('status');
    
    if (status === 'success' && paymentId) {
      checkPaymentStatus(paymentId, paymentType);
    } else {
      setIsLoading(false);
      setError('Invalid payment information');
    }
  }, [location]);
  
  // Check payment status from server
  const checkPaymentStatus = async (paymentId, type) => {
    try {
      setIsLoading(true);
      
      // Get payment status from API
      const response = await getPaymentStatus(paymentId, type);
      
      if (response?.status === 'succeeded' || response?.status === 'processing') {
        setOrderStatus(response.status);
        
        // Get order ID from metadata if available
        if (response.result?.metadata?.order_id) {
          setOrderId(response.result.metadata.order_id);
        }
        
        // Show email notification toast
        toast.success(
          <div>
            <strong>Thank you for your purchase!</strong>
            <p>Your agent template has been sent to your email.</p>
          </div>,
          {
            duration: 6000,
            icon: <FontAwesomeIcon icon={faEnvelope} />,
            id: 'email-delivery-toast'
          }
        );
      } else {
        setOrderStatus('failed');
        setError('Payment could not be confirmed. Please contact support.');
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
      setError('Could not verify payment status');
      setOrderStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Return to home page
  const handleContinueShopping = () => {
    navigate('/');
  };
  
  // View order details
  const handleViewOrder = () => {
    navigate(`/account/orders/${orderId}`);
  };

  return (
    <div className="checkout-success-container">
      <div className="checkout-success-card">
        {isLoading ? (
          <div className="checkout-success-loading">
            <div className="spinner"></div>
            <p>Processing your order...</p>
          </div>
        ) : error ? (
          <div className="checkout-error">
            <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="error-icon" />
            <h2>Oops! Something went wrong</h2>
            <p>{error}</p>
            <button className="primary-button" onClick={handleContinueShopping}>
              Return to Home
            </button>
          </div>
        ) : (
          <div className="checkout-success-content">
            <FontAwesomeIcon icon={faCheckCircle} size="3x" className="success-icon" />
            <h1>Thank you for your purchase!</h1>
            <p>Your order has been {orderStatus === 'succeeded' ? 'completed' : 'is being processed'}.</p>
            
            {orderId && (
              <div className="order-info">
                <p>Order ID: <strong>{orderId}</strong></p>
              </div>
            )}
            
            <div className="email-notification">
              <FontAwesomeIcon icon={faEnvelope} className="email-icon" />
              <div>
                <h3>Check Your Email</h3>
                <p>We've sent your AI agent template to your email address. If you don't see it, please check your spam folder.</p>
              </div>
            </div>
            
            <div className="next-steps">
              <h3>What's Next?</h3>
              <ul>
                <li>Download your agent template from your email</li>
                <li>Follow the instructions to start using your new AI agent</li>
                <li>If you need help, contact our support team</li>
              </ul>
            </div>
            
            <div className="checkout-success-actions">
              {orderId && (
                <button className="secondary-button" onClick={handleViewOrder}>
                  View Order
                </button>
              )}
              <button className="primary-button" onClick={handleContinueShopping}>
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutSuccess; 