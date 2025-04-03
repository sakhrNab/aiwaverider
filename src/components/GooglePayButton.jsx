/**
 * GOOGLE PAY BUTTON - MIGRATION TO PRODUCTION
 * ===========================================
 * 
 * When migrating this Google Pay integration to production, take the following steps:
 * 
 * 1. ENVIRONMENT CONFIGURATION
 *    - Change the Google Pay environment from 'TEST' to 'PRODUCTION'
 *    - Update the baseCardPaymentMethod.parameters.gateway to your live Stripe gateway
 *    - Ensure your production Stripe publishable key is being used
 * 
 * 2. DOMAIN VERIFICATION
 *    - Verify your domain with Google Pay in the Google Pay & Wallet Console
 *    - Complete domain verification by adding the required DNS TXT record
 *    - For Android app integration, register your app's signature
 * 
 * 3. MERCHANT CONFIGURATION
 *    - Update merchantInfo with your production merchant name
 *    - Set your actual merchant ID obtained from the Google Pay & Wallet Console
 *    - For US merchants: Apply for the Google Pay API Card Payment Method standard integration
 * 
 * 4. BUSINESS REQUIREMENTS
 *    - Ensure your privacy policy and terms of service are accessible
 *    - Your checkout page must display supported payment card networks
 *    - Follow Google's brand guidelines for Google Pay button presentation
 * 
 * 5. TESTING
 *    - Test the integration with real cards in production environment
 *    - Verify the payment flow works across different browsers
 *    - Test on actual Android devices with Google Pay enabled
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const GooglePayButton = ({ 
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
  const [googlePayClient, setGooglePayClient] = useState(null);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);

  // Available payment networks
  const allowedPaymentMethods = [
    {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
      },
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        parameters: {
          gateway: 'stripe',
          'stripe:version': '2018-10-31',
          'stripe:publishableKey': import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_yourStripeKey'
        }
      }
    }
  ];

  useEffect(() => {
    // Load Google Pay API
    const script = document.createElement('script');
    script.src = 'https://pay.google.com/gp/p/js/pay.js';
    script.async = true;
    script.onload = initializeGooglePay;
    document.body.appendChild(script);
    
    return () => {
      // Clean up script if component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const initializeGooglePay = () => {
    if (!window.google || !window.google.payments) {
      console.error('Google Pay API not found');
      return;
    }
    
    const client = new window.google.payments.api.PaymentsClient({
      environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST'
    });
    
    setGooglePayClient(client);
    
    // Check if Google Pay is available for the user
    client.isReadyToPay({
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: allowedPaymentMethods
    })
    .then(response => {
      setGooglePayAvailable(response.result);
    })
    .catch(error => {
      console.error('Google Pay availability check failed:', error);
      setGooglePayAvailable(false);
    });
  };

  const handleGooglePayClick = async () => {
    if (!googlePayClient) return;
    
    setIsLoading(true);
    
    // Create payment data request
    const paymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: allowedPaymentMethods,
      merchantInfo: {
        merchantId: import.meta.env.VITE_GOOGLE_MERCHANT_ID || '12345678901234567890',
        merchantName: 'Your Store Name'
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: cartTotal.toString(),
        currencyCode: currency.toUpperCase(),
        countryCode: countryCode
      }
    };
    
    try {
      // Show Google Pay payment sheet
      const paymentData = await googlePayClient.loadPaymentData(paymentDataRequest);
      
      // Process payment with backend
      const response = await axios.post(`${API_URL}/api/payments/process-google-pay`, {
        paymentToken: paymentData.paymentMethodData.tokenizationData.token,
        amount: cartTotal,
        currency: currency,
        items: items,
        email: email
      });
      
      if (response.data.success) {
        toast.success('Payment successful!');
        if (onSuccess) onSuccess(response.data);
        
        // Check if backend provided a redirect URL
        if (response.data.redirectUrl) {
          window.location.href = response.data.redirectUrl;
        } else {
          // Use checkout/success with payment info for redirection
          window.location.href = `/checkout/success?payment_id=${response.data.orderId || 'unknown'}&status=success&type=payment_intent`;
        }
      } else {
        throw new Error(response.data.error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Google Pay error:', error);
      
      // Don't show error for user cancellation
      if (error.statusCode === 'CANCELED') {
        console.log('User canceled Google Pay');
      } else {
        toast.error(`Google Pay payment failed: ${error.message || 'Unknown error'}`);
        if (onError) onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // If Google Pay is not available, don't render the button
  if (!googlePayAvailable) {
    return null;
  }

  return (
    <button
      onClick={handleGooglePayClick}
      disabled={isLoading}
      className={`google-pay-button ${className} ${isLoading ? 'loading' : ''}`}
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
          <img 
            src="https://www.gstatic.com/instantbuy/svg/dark_gpay.svg" 
            alt="Google Pay"
            style={{ height: '18px', marginRight: '8px' }}
          />
          <span>Pay with Google Pay</span>
        </>
      )}
    </button>
  );
};

export default GooglePayButton; 