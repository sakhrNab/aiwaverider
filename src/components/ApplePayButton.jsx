import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const ApplePayButton = ({ 
  cartTotal, 
  items, 
  currency = 'usd', 
  countryCode = 'US',
  email,
  onSuccess,
  onError,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const merchantIdentifier = import.meta.env.VITE_APPLE_MERCHANT_ID || 'merchant.com.yourcompany.app';

  useEffect(() => {
    checkApplePayAvailability();
  }, []);

  const checkApplePayAvailability = () => {
    // Check if Apple Pay is available in the browser
    if (!window.ApplePaySession) {
      console.log('Apple Pay is not available in this browser');
      setApplePayAvailable(false);
      return;
    }

    // Check if the device/browser supports Apple Pay
    if (!ApplePaySession.canMakePayments()) {
      console.log('This device does not support Apple Pay');
      setApplePayAvailable(false);
      return;
    }

    // Check if the user has an active card in Wallet
    ApplePaySession.canMakePaymentsWithActiveCard(merchantIdentifier)
      .then(canMakePayments => {
        if (canMakePayments) {
          console.log('Apple Pay is available with active cards');
          setApplePayAvailable(true);
        } else {
          console.log('Apple Pay is available but no active cards');
          setApplePayAvailable(false);
        }
      })
      .catch(error => {
        console.error('Error checking Apple Pay availability:', error);
        setApplePayAvailable(false);
      });
  };

  const handleApplePayClick = async () => {
    if (!applePayAvailable) return;
    
    setIsLoading(true);
    
    try {
      // Apple Pay payment request configuration
      const paymentRequest = {
        countryCode: countryCode,
        currencyCode: currency.toUpperCase(),
        supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
        merchantCapabilities: ['supports3DS'],
        total: {
          label: 'Your Store Name',
          amount: cartTotal.toString()
        },
        lineItems: items.map(item => ({
          label: item.title || item.name,
          amount: (item.price * item.quantity).toString()
        }))
      };
      
      // Create an Apple Pay session
      const session = new ApplePaySession(3, paymentRequest);
      
      // Handle validation
      session.onvalidatemerchant = async (event) => {
        try {
          // Get the validation from your server
          const response = await axios.post(`${API_URL}/api/payments/validate-apple-pay-merchant`, {
            validationURL: event.validationURL
          });
          
          if (response.data && response.data.merchantSession) {
            // Complete merchant validation
            session.completeMerchantValidation(response.data.merchantSession);
          } else {
            throw new Error('Invalid merchant validation response');
          }
        } catch (error) {
          console.error('Merchant validation failed:', error);
          session.abort();
          setIsLoading(false);
          toast.error('Apple Pay initialization failed');
        }
      };
      
      // Handle payment authorization
      session.onpaymentauthorized = async (event) => {
        try {
          // Process the payment with your server
          const response = await axios.post(`${API_URL}/api/payments/process-apple-pay`, {
            payment: event.payment,
            amount: cartTotal,
            currency: currency,
            items: items,
            email: email
          });
          
          if (response.data.success) {
            // Complete the payment successfully
            session.completePayment(ApplePaySession.STATUS_SUCCESS);
            toast.success('Payment successful!');
            
            if (onSuccess) {
              onSuccess(response.data);
            }
            
            // Redirect to thank you page
            window.location.href = `/thankyou?order_id=${response.data.orderId}`;
          } else {
            // Payment processing failed
            session.completePayment(ApplePaySession.STATUS_FAILURE);
            throw new Error(response.data.error || 'Payment processing failed');
          }
        } catch (error) {
          console.error('Payment processing failed:', error);
          session.completePayment(ApplePaySession.STATUS_FAILURE);
          toast.error(`Apple Pay payment failed: ${error.message || 'Unknown error'}`);
          if (onError) onError(error);
        } finally {
          setIsLoading(false);
        }
      };
      
      // Handle cancellation
      session.oncancel = (event) => {
        console.log('Apple Pay session canceled', event);
        setIsLoading(false);
      };
      
      // Begin the Apple Pay session
      session.begin();
      
    } catch (error) {
      console.error('Apple Pay initialization error:', error);
      setIsLoading(false);
      toast.error(`Apple Pay initialization failed: ${error.message || 'Unknown error'}`);
      if (onError) onError(error);
    }
  };

  // If Apple Pay is not available or loading, don't render the button
  if (!applePayAvailable) {
    return null;
  }

  return (
    <button
      onClick={handleApplePayClick}
      disabled={isLoading}
      className={`apple-pay-button ${className} ${isLoading ? 'loading' : ''}`}
      style={{
        backgroundColor: '#000',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        padding: '12px 24px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isLoading ? 'wait' : 'pointer',
        opacity: isLoading ? 0.8 : 1,
      }}
    >
      {isLoading ? (
        <span>Processing...</span>
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ marginRight: '8px' }}>
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          <span>Pay with Apple Pay</span>
        </>
      )}
    </button>
  );
};

export default ApplePayButton; 