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
import PropTypes from 'prop-types';
import { Box, Typography, CircularProgress } from '@mui/material';
import {
  processWalletPayment,
  handlePaymentSuccess,
  handlePaymentError,
  getCountryConfig
} from '../services/paymentUtils';

const GooglePayButton = ({
  amount,
  cartTotal,
  currency = 'USD',
  items = [],
  email,
  onSuccess,
  onError,
  buttonStyle = {},
  buttonType = 'standard',
  buttonColor = 'black',
  disabled = false
}) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [googlePayClient, setGooglePayClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use cartTotal if amount is not provided
  const paymentAmount = amount !== undefined ? amount : cartTotal;

  // Debug props
  console.log('GooglePayButton props:', { amount, cartTotal, paymentAmount, currency, items, email });

  // Google Pay styling
  const defaultButtonStyle = {
    width: '100%',
    height: '48px',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'opacity 0.2s ease',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: buttonColor === 'black' ? '#000' : '#fff',
    color: buttonColor === 'black' ? '#fff' : '#000',
    border: buttonColor === 'black' ? 'none' : '1px solid #000'
  };

  // Initialize Google Pay
  useEffect(() => {
    const initGooglePay = async () => {
      try {
        if (!window.google || !window.google.payments) {
          const script = document.createElement('script');
          script.src = 'https://pay.google.com/gp/p/js/pay.js';
          script.async = true;
          script.onload = () => checkGooglePayAvailability();
          document.body.appendChild(script);
        } else {
          checkGooglePayAvailability();
        }
      } catch (error) {
        console.error('Error initializing Google Pay:', error);
        setIsAvailable(false);
        setIsLoading(false);
      }
    };

    const checkGooglePayAvailability = async () => {
      try {
        const countryConfig = getCountryConfig(currency === 'GBP' ? 'GB' : currency === 'CAD' ? 'CA' : 'US');
        
        // Get environment from env vars or fallback to TEST
        const environment = import.meta.env.VITE_GOOGLE_PAY_ENVIRONMENT || 'TEST';
        console.log(`Initializing Google Pay in ${environment} environment`);
        
        const googlePayClient = new window.google.payments.api.PaymentsClient({
          environment: environment
        });

        const isReadyToPayRequest = {
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [{
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['VISA', 'MASTERCARD']
            }
          }]
        };

        const result = await googlePayClient.isReadyToPay(isReadyToPayRequest);
        setIsAvailable(result.result);
        setGooglePayClient(googlePayClient);
      } catch (error) {
        console.error('Google Pay availability check failed:', error);
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    initGooglePay();
  }, [currency]);

  const handlePaymentRequest = async () => {
    if (disabled || !isAvailable || !googlePayClient) return;
    
    // Validate amount
    if (paymentAmount === undefined || paymentAmount === null || isNaN(parseFloat(paymentAmount))) {
      console.error('Google Pay error: Invalid amount provided', { amount, cartTotal, paymentAmount });
      handlePaymentError(new Error('Invalid payment amount'), 'Google Pay', onError);
      return;
    }

    try {
      console.log('Starting Google Pay payment flow', { 
        amount: paymentAmount,
        currency,
        isTestMode: true
      });
      
      const countryConfig = getCountryConfig(currency === 'GBP' ? 'GB' : currency === 'CAD' ? 'CA' : 'US');
      
      // Use parseFloat to ensure amount is a number
      const parsedAmount = parseFloat(paymentAmount).toFixed(2);
      
      // Create payment request
      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['VISA', 'MASTERCARD'],
            billingAddressRequired: false
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: import.meta.env.VITE_GOOGLE_PAY_GATEWAY || 'stripe',
              'stripe:version': '2020-08-27',
              'stripe:publishableKey': import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
            }
          }
        }],
        merchantInfo: {
          merchantName: 'AI Wave Rider'
        },
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: parsedAmount,
          currencyCode: currency.toUpperCase()
        }
      };
      
      console.log('Google Pay request configuration:', JSON.stringify(paymentDataRequest, null, 2));

      // Add line items if provided
      if (items.length > 0) {
        paymentDataRequest.transactionInfo.displayItems = items.map(item => ({
          label: item.name || 'Product',
          price: (parseFloat(item.price) || 0).toFixed(2),
          type: 'LINE_ITEM'
        }));
      }
      
      // Load payment data
      const paymentData = await googlePayClient.loadPaymentData(paymentDataRequest);
      
      // Process the payment
      const orderDetails = {
        amount,
        currency,
        items
      };
      
      const result = await processWalletPayment(
        'google',
        paymentData,
        orderDetails,
        email
      );
      
      // Handle success
      handlePaymentSuccess(result, onSuccess);
    } catch (error) {
      if (error.statusCode === 'CANCELED') {
        console.log('Google Pay payment cancelled by user');
      } else {
        console.error('Google Pay payment failed:', error);
      }
      
      // Handle error
      handlePaymentError(error, 'Google Pay', onError);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="48px">
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!isAvailable) {
    return null;
  }

  return (
    <Box
      role="button"
      onClick={handlePaymentRequest}
      aria-label="Pay with Google Pay"
      sx={{
        ...defaultButtonStyle,
        ...buttonStyle
      }}
    >
      {buttonType === 'standard' ? (
        <img 
          src={buttonColor === 'black' 
               ? 'https://www.gstatic.com/instantbuy/svg/dark_gpay.svg' 
               : 'https://www.gstatic.com/instantbuy/svg/light_gpay.svg'} 
          alt="Google Pay" 
          height="24px"
        />
      ) : (
        <Typography variant="button">
          Pay with Google Pay
        </Typography>
      )}
    </Box>
  );
};

GooglePayButton.propTypes = {
  amount: PropTypes.number,
  cartTotal: PropTypes.number,
  currency: PropTypes.string,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired
    })
  ),
  email: PropTypes.string.isRequired,
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
  buttonStyle: PropTypes.object,
  buttonType: PropTypes.oneOf(['standard', 'text']),
  buttonColor: PropTypes.oneOf(['black', 'white']),
  disabled: PropTypes.bool
};

// Custom validation to ensure either amount or cartTotal is provided
GooglePayButton.propTypes.amount = function(props, propName, componentName) {
  if (props.amount === undefined && props.cartTotal === undefined) {
    return new Error(
      `One of 'amount' or 'cartTotal' is required in '${componentName}'.`
    );
  }
};

export default GooglePayButton; 