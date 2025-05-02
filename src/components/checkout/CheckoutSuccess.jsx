import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPaymentStatus } from '../../services/paymentApi';
import { toast } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEnvelope, faExclamationTriangle, faMoneyBillTransfer, faDownload } from '@fortawesome/free-solid-svg-icons';
import PaymentSuccessRecommendations from '../../components/PaymentSuccessRecommendations';
import { HashLoader } from 'react-spinners';
import './CheckoutSuccess.css';

/**
 * Checkout success page that shows order confirmation
 * and displays a notification about the template being sent by email
 */
const CheckoutSuccess = () => {
  // Define the API URL from environment variables or use a default
  const apiUrl = import.meta.env.VITE_APP_URL || '';
  
  // Add the missing ref for statusCheckInterval
  const statusCheckInterval = useRef(null);
  
  const [orderStatus, setOrderStatus] = useState('processing');
  const [orderId, setOrderId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isSimulated, setIsSimulated] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [downloadTemplates, setDownloadTemplates] = useState([]);
  const [paymentType, setPaymentType] = useState('card');
  const [paymentId, setPaymentId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusColor, setStatusColor] = useState('text-blue-600');
  const [sepaDetails, setSepaDetails] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({});
  const [hasDownloadLinks, setHasDownloadLinks] = useState(false);
  const [templates, setTemplates] = useState([]);

  const location = useLocation();
  const navigate = useNavigate();
  
  // Check for immediate download templates in session storage
  useEffect(() => {
    try {
      const templatesData = sessionStorage.getItem('downloadTemplates');
      const orderRef = sessionStorage.getItem('orderReference');
      const confirmationEmail = sessionStorage.getItem('confirmationEmail');
      
      // Store the confirmation email if available
      if (confirmationEmail) {
        setPaymentDetails(prev => ({
          ...prev,
          confirmationEmail
        }));
      }
      
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
    const orderIdFromParams = queryParams.get('order_id'); // Get order_id from URL parameters
    
    setIsSimulated(simulated);
    setPaymentMethod(paymentType === 'sepa_credit_transfer' ? 'sepa' : 'card');
    setPaymentType(paymentType);
    setPaymentId(paymentId);
    
    // If we have an order ID from URL parameters, use it directly
    if (orderIdFromParams) {
      setOrderId(orderIdFromParams);
      console.log(`Using order ID from URL params: ${orderIdFromParams}`);
    }
    
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
      } else if (paymentId === 'unknown' && orderIdFromParams) {
        // Special handling for credit card payments where we have an order ID but payment ID is unknown
        console.log('Payment successful with unknown ID but order_id is available:', orderIdFromParams);
        setOrderStatus('succeeded');
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
        checkPaymentStatus();
      }
    } else {
      setIsLoading(false);
      setError('Invalid payment information');
    }
  }, [location]);
  
  // Function to check payment status periodically
  const checkPaymentStatus = useCallback(async () => {
    try {
      // If payment ID is unknown but we have an order ID, we can skip the status check
      // as this is likely a credit card payment with a direct confirmation
      if (paymentId === 'unknown' && orderId) {
        console.log(`Skipping status check for unknown payment ID with order ID: ${orderId}`);
        setOrderStatus('succeeded');
        setIsLoading(false);
        clearInterval(statusCheckInterval.current);
        return;
      }

      // Determine the correct API endpoint based on payment type
      let endpoint;
      
      if (paymentType === 'sepa_credit_transfer') {
        endpoint = `/api/payments/sepa-credit-transfer/${paymentId}`;
        console.log(`Checking SEPA payment status for ID: ${paymentId}`);
      } else if (paymentType === 'crypto') {
        endpoint = `/api/payments/crypto/${paymentId}`;
      } else if (paymentType.startsWith('stripe') || paymentId.startsWith('pi_')) {
        // Handle Stripe payments, including SEPA through Stripe
        endpoint = `/api/payments/stripe/${paymentId}`;
      } else {
        console.warn(`Unknown payment type for status check: ${paymentType}`);
        setIsLoading(false); // Add this to stop loading if payment type is unknown
        return; // Exit if we don't know how to check this payment type
      }
      
      const response = await fetch(`${apiUrl}${endpoint}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Payment status check failed:', data.error);
        setIsLoading(false); // Add this to stop loading on error
        return;
      }
      
      // Update payment status
      setOrderStatus(data.status);
      setIsLoading(false); // Ensure loading state is cleared
      
      // If payment completed successfully, update UI accordingly
      if (data.status === 'completed' || data.status === 'successful' || data.status === 'succeeded') {
        setStatusMessage('Your payment has been confirmed and your order is complete!');
        setStatusColor('text-green-600');
        clearInterval(statusCheckInterval.current);
        
        // Check for download links
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates);
          setHasDownloadLinks(true);
        }
      } else if (data.status === 'processing') {
        setStatusMessage('Your payment is being processed. This typically takes a few moments...');
        setStatusColor('text-blue-600');
      } else if (data.status === 'pending') {
        // For SEPA payments, provide specific instructions
        if (paymentType === 'sepa_credit_transfer') {
          setStatusMessage('Your bank transfer is pending. Please complete the transfer using the bank details below.');
          setSepaDetails(data.bankDetails);
        } else {
          setStatusMessage('Your payment is pending confirmation...');
        }
        setStatusColor('text-yellow-600');
      } else if (data.status === 'failed' || data.status === 'canceled') {
        setStatusMessage('Your payment could not be processed. Please try again or contact support.');
        setStatusColor('text-red-600');
        clearInterval(statusCheckInterval.current);
      }
      
      // Add Stripe-specific status information if available
      if (data.stripeStatus) {
        setPaymentDetails(prev => ({
          ...prev,
          stripeStatus: data.stripeStatus,
          lastUpdated: data.lastUpdated
        }));
      }
      
    } catch (error) {
      console.error('Error checking payment status:', error);
      setIsLoading(false); // Add this to stop loading on error
    }
  }, [apiUrl, paymentId, paymentType, orderId]);
  
  // Setup interval for checking payment status
  useEffect(() => {
    if (paymentId && !isSimulated && (paymentType === 'sepa_credit_transfer' || paymentType.startsWith('stripe'))) {
      // Initial check
      checkPaymentStatus();
      
      // Set up interval for periodic checks (every 10 seconds)
      statusCheckInterval.current = setInterval(checkPaymentStatus, 10000);
      
      // Clear interval on component unmount
      return () => {
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
        }
      };
    } else {
      // For other cases, just stop loading
      setIsLoading(false);
    }
  }, [checkPaymentStatus, paymentId, isSimulated, paymentType]);
  
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

  // Add this function inside the component, before the return statement
  const renderCardPaymentStatus = () => {
    if (!paymentDetails || !paymentId) return null;
    
    // Different statuses for card payments
    let statusIcon;
    let statusText;
    let statusClass;
    
    switch (orderStatus) {
      case 'succeeded':
      case 'completed':
      case 'successful':
        statusIcon = <FontAwesomeIcon icon={faCheckCircle} className="status-icon success" />;
        statusText = 'Payment Successful';
        statusClass = 'status-success';
        break;
      case 'processing':
        statusIcon = <HashLoader color="#4299e1" size={24} />;
        statusText = 'Processing Payment';
        statusClass = 'status-processing';
        break;
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        statusIcon = <FontAwesomeIcon icon={faExclamationTriangle} className="status-icon warning" />;
        statusText = 'Action Required';
        statusClass = 'status-warning';
        break;
      case 'failed':
      case 'canceled':
        statusIcon = <FontAwesomeIcon icon={faExclamationTriangle} className="status-icon error" />;
        statusText = 'Payment Failed';
        statusClass = 'status-error';
        break;
      default:
        statusIcon = <FontAwesomeIcon icon={faExclamationTriangle} className="status-icon" />;
        statusText = 'Unknown Status';
        statusClass = 'status-unknown';
    }
    
    return (
      <div className={`payment-status-indicator ${statusClass}`}>
        <div className="status-icon-container">
          {statusIcon}
        </div>
        <div className="status-text">
          {statusText}
          <span className="status-time">
            {paymentDetails.lastUpdated ? 
              new Date(paymentDetails.lastUpdated).toLocaleTimeString() : 
              new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="checkout-success-container">
      <div className="checkout-success-card">
        {isLoading ? (
          <div className="checkout-success-loading">
            <HashLoader color="#4FD1C5" size={60} speedMultiplier={0.8} />
            <p className="mt-4">Processing your order...</p>
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
            
            {paymentMethod !== 'sepa' ? (
              <>
                <h1>Thank you for your purchase!</h1>
                <p>Your order {orderStatus === 'succeeded' || orderStatus === 'completed' ? 'has been completed' : 'is being processed'}.</p>
                
                {/* Display payment status indicator */}
                {renderCardPaymentStatus()}
                
                {orderId && (
                  <div className="order-info">
                    <p>Order ID: <strong>{orderId}</strong></p>
                    {paymentDetails.confirmationEmail && (
                      <p>Confirmation sent to: <strong>{paymentDetails.confirmationEmail}</strong></p>
                    )}
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
                
                {/* Add card-specific info for failed payments */}
                {orderStatus === 'failed' && (
                  <div className="payment-error-help">
                    <h3>Having trouble with your payment?</h3>
                    <ul>
                      <li>Check your card details and try again</li>
                      <li>Contact your bank to make sure there are no restrictions</li>
                      <li>Try a different payment method or card</li>
                      <li>Contact our support team for assistance</li>
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <h1>Thank you for your purchase!</h1>
                <p>
                  {isSimulated 
                    ? 'Your SEPA Credit Transfer has been simulated successfully.' 
                    : 'Your payment request has been sent to your bank for processing.'}
                </p>
                
                {orderId && (
                  <div className="order-info">
                    <p>Payment Reference: <strong>{orderId}</strong></p>
                    {paymentDetails.confirmationEmail && (
                      <p>Confirmation sent to: <strong>{paymentDetails.confirmationEmail}</strong></p>
                    )}
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