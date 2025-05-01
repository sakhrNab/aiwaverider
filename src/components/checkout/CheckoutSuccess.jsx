import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPaymentStatus } from '../../services/paymentApi';
import { toast } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEnvelope, faExclamationTriangle, faMoneyBillTransfer, faDownload } from '@fortawesome/free-solid-svg-icons';
import PaymentSuccessRecommendations from '../../components/PaymentSuccessRecommendations';
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
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isSimulated, setIsSimulated] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [downloadTemplates, setDownloadTemplates] = useState([]);

  const location = useLocation();
  const navigate = useNavigate();
  
  // Check for immediate download templates in session storage
  useEffect(() => {
    try {
      const templatesData = sessionStorage.getItem('downloadTemplates');
      const orderRef = sessionStorage.getItem('orderReference');
      
      if (templatesData) {
        const templates = JSON.parse(templatesData);
        setDownloadTemplates(templates);
        console.log(`Found ${templates.length} templates available for download`);
        
        // If we have an order reference in session but not from URL, use it
        if (orderRef && !orderId) {
          setOrderId(orderRef);
        }
      }
    } catch (err) {
      console.error('Error loading template download data:', err);
    }
  }, [orderId]);
  
  // Parse payment info from URL parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const paymentId = queryParams.get('payment_id');
    const paymentType = queryParams.get('type') || 'payment_intent';
    const status = queryParams.get('status');
    const simulated = queryParams.get('simulated') === 'true';
    
    setIsSimulated(simulated);
    setPaymentMethod(paymentType === 'sepa_credit_transfer' ? 'sepa' : 'card');
    
    // Try to get purchased items from localStorage
    try {
      const storedItems = localStorage.getItem('lastPurchasedItems');
      if (storedItems) {
        setPurchasedItems(JSON.parse(storedItems));
      }
    } catch (err) {
      console.error('Error loading purchased items:', err);
    }
    
    // Generate an order ID if not available
    const generateOrderId = () => {
      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `ORD-${timestamp.toString().substring(6)}${randomString}`;
    };
    
    if (paymentId && (status === 'success' || status === 'pending' || simulated)) {
      if (simulated) {
        // Handle simulated payment (test mode)
        console.log('Handling simulated payment');
        setOrderStatus('succeeded');
        setOrderId(paymentId);
        setIsLoading(false);
        
        // Show email notification toast
        toast.success(
          <div>
            <strong>SEPA Credit Transfer Initiated!</strong>
            <p>Your order has been processed in simulation mode.</p>
          </div>,
          {
            duration: 6000,
            icon: <FontAwesomeIcon icon={faMoneyBillTransfer} />,
            id: 'sepa-simulation-toast'
          }
        );
      } else if (paymentId === 'unknown') {
        // Handle case where payment ID is unknown but status is success
        // This happens with some payment methods where the ID isn't returned properly
        console.log('Payment successful but ID is unknown. Showing success page without API call.');
        setOrderStatus('succeeded');
        setOrderId(generateOrderId());
        setIsLoading(false);
        
        // Show success notification
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
        // Normal payment processing
        checkPaymentStatus(paymentId, paymentType);
      }
    } else {
      setIsLoading(false);
      setError('Invalid payment information');
    }
  }, [location]);
  
  // Check payment status from server
  const checkPaymentStatus = async (paymentId, type) => {
    try {
      setIsLoading(true);
      
      // Special handling for SEPA payments
      if (type === 'sepa_credit_transfer') {
        try {
          // Get payment status from API
          const response = await getPaymentStatus(paymentId, type);
          
          if (response?.status === 'pending' || 
              response?.status === 'processing' || 
              response?.status === 'completed' || 
              response?.status === 'simulated') {
            setOrderStatus(response.status);
            
            // Get order ID from metadata if available
            if (response.result?.metadata?.orderId || response.result?.metadata?.order_id) {
              setOrderId(response.result.metadata.orderId || response.result.metadata.order_id);
            } else {
              // Use payment ID as fallback order reference
              setOrderId(paymentId);
            }
            
            // Show appropriate notification toast
            toast.success(
              <div>
                <strong>SEPA Credit Transfer Initiated!</strong>
                <p>Your payment is being processed by your bank.</p>
              </div>,
              {
                duration: 6000,
                icon: <FontAwesomeIcon icon={faMoneyBillTransfer} />,
                id: 'sepa-payment-toast'
              }
            );
          } else {
            setOrderStatus('failed');
            setError('Payment could not be confirmed. Please contact support.');
          }
        } catch (sepaErr) {
          console.error('Error checking SEPA payment status:', sepaErr);
          // For SEPA, we'll still show a success page because the transfer has been initiated
          console.log('Using fallback success for SEPA payment');
          setOrderStatus('pending'); // SEPA payments start as pending
          setOrderId(paymentId);
        }
        
        setIsLoading(false);
        return;
      }
      
      // Standard payment processing for non-SEPA payments
      // Get payment status from API
      const response = await getPaymentStatus(paymentId, type);
      
      if (response?.status === 'succeeded' || response?.status === 'processing') {
        setOrderStatus(response.status || 'processing');
        
        // Get order ID from metadata if available
        if (response.data?.metadata?.order_id || response.data?.metadata?.orderId) {
          setOrderId(response.data.metadata.order_id || response.data.metadata.orderId);
        } else {
          // Use payment ID as fallback order reference
          setOrderId(paymentId);
        }
        
        // Show email delivery notification
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
      
      // If we get a 404 for the payment ID but status was success in URL params,
      // we should still show success page to the user
      const queryParams = new URLSearchParams(location.search);
      const status = queryParams.get('status');
      
      if (status === 'success') {
        console.log('Payment ID not found but URL indicates success. Showing success page.');
        setOrderStatus('succeeded');
        setOrderId(`ORD-${Date.now().toString().substring(6)}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
      } else {
        setError('Could not verify payment status');
        setOrderStatus('failed');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Return to agents page
  const handleContinueShopping = () => {
    navigate('/agents');
  };
  
  // View order details
  const handleViewOrder = () => {
    navigate(`/account/orders/${orderId}`);
  };
  
  // Render download buttons for available templates
  const renderDownloadButtons = () => {
    if (!downloadTemplates || downloadTemplates.length === 0) {
      return null;
    }
    
    return (
      <div className="download-templates-section">
        <h3>Your Templates Are Ready</h3>
        <p>You can download your purchased templates immediately:</p>
        
        <div className="template-download-buttons">
          {downloadTemplates.map((template, index) => (
            <a 
              key={index}
              href={template.downloadUrl}
              className="download-template-button"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faDownload} className="download-icon" />
              Download: {template.agentName || `Template ${index + 1}`}
            </a>
          ))}
        </div>
        <p className="download-note">
          Your download links will also be sent to your email and remain active for 30 days.
        </p>
      </div>
    );
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
            
            {paymentMethod === 'sepa' ? (
              <>
                <h1>SEPA Credit Transfer Initiated!</h1>
                <p>
                  {isSimulated 
                    ? 'Your SEPA Credit Transfer has been simulated successfully.' 
                    : 'Your payment request has been sent to your bank for processing.'}
                </p>
                
                {orderId && (
                  <div className="order-info">
                    <p>Payment Reference: <strong>{orderId}</strong></p>
                  </div>
                )}
                
                {/* Render immediate download buttons if available */}
                {renderDownloadButtons()}
                
                <div className="sepa-notification">
                  <FontAwesomeIcon icon={faMoneyBillTransfer} className="sepa-icon" />
                  <div>
                    <h3>SEPA Payment Information</h3>
                    <p>
                      {isSimulated
                        ? 'This is a simulated payment for testing purposes. In a real transaction, your bank would process the payment within 1-2 business days.'
                        : 'SEPA Credit Transfers typically take 1-2 business days to complete. You will receive confirmation when the payment is processed.'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1>Thank you for your purchase!</h1>
                <p>Your order {orderStatus === 'succeeded' ? 'has been completed' : 'is being processed'}.</p>
                
                {orderId && (
                  <div className="order-info">
                    <p>Order ID: <strong>{orderId}</strong></p>
                  </div>
                )}
                
                {/* Render immediate download buttons if available */}
                {renderDownloadButtons()}
                
                <div className="email-notification">
                  <FontAwesomeIcon icon={faEnvelope} className="email-icon" />
                  <div>
                    <h3>Check Your Email</h3>
                    <p>We've sent your AI agent template to your email address. If you don't see it, please check your spam folder.</p>
                  </div>
                </div>
              </>
            )}
            
            <div className="next-steps">
              <h3>What's Next?</h3>
              <ul>
                {paymentMethod === 'sepa' ? (
                  <>
                    <li>Your order will be processed once payment is confirmed</li>
                    <li>You'll receive an email with your purchase details</li>
                    <li>If you have questions, please contact our support team</li>
                  </>
                ) : (
                  <>
                    <li>Download your agent template from your email</li>
                    <li>Follow the instructions to start using your new AI agent</li>
                    <li>If you need help, contact our support team</li>
                  </>
                )}
              </ul>
            </div>
            
            {/* Recommendation section */}
            <div className="success-recommendations-section">
              <PaymentSuccessRecommendations 
                purchasedItems={purchasedItems}
                currency="EUR"
                limit={3}
              />
            </div>
            
            <div className="checkout-success-actions">
              {orderId && !isSimulated && (
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