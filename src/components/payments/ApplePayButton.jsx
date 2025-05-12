import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, CircularProgress } from '@mui/material';
import { processWalletPayment, handlePaymentSuccess, handlePaymentError } from '../../services/paymentUtils';

const ApplePayButton = ({
  amount,
  currency = 'USD',
  items = [],
  email,
  onSuccess,
  onError,
  buttonType = 'plain',
  buttonColor = 'black',
  width = '100%',
  height = '40px',
  borderRadius = '4px',
  disabled = false
}) => {
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [applePaySession, setApplePaySession] = useState(null);

  // Apple Pay merchant identifier from environment variables
  const merchantIdentifier = import.meta.env.VITE_APPLE_PAY_MERCHANT_ID || 'merchant.com.yourcompany.domain';

  useEffect(() => {
    // Check if Apple Pay is available in this browser
    if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
      ApplePaySession.canMakePaymentsWithActiveCard(merchantIdentifier)
        .then((canMakePayments) => {
          setApplePayAvailable(canMakePayments);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error checking Apple Pay availability:", error);
          setApplePayAvailable(false);
          setIsLoading(false);
        });
    } else {
      setApplePayAvailable(false);
      setIsLoading(false);
    }
  }, [merchantIdentifier]);

  const createPaymentRequest = () => {
    return {
      countryCode: 'US',
      currencyCode: currency,
      supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
      merchantCapabilities: ['supports3DS'],
      total: {
        label: 'Your Purchase',
        amount: amount.toFixed(2),
        type: 'final'
      },
      lineItems: items.map(item => ({
        label: item.name,
        amount: (item.price * (item.quantity || 1)).toFixed(2)
      }))
    };
  };

  const handleButtonClick = () => {
    if (!applePayAvailable || disabled) return;

    try {
      const request = createPaymentRequest();
      const session = new ApplePaySession(3, request);

      // Set up event handlers for the Apple Pay session
      session.onvalidatemerchant = async (event) => {
        try {
          // Validate the merchant with your backend
          const response = await fetch('/api/payments/validate-apple-pay-merchant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              validationURL: event.validationURL
            })
          });

          const merchantSession = await response.json();
          session.completeMerchantValidation(merchantSession);
        } catch (error) {
          console.error('Error validating merchant:', error);
          session.abort();
          handlePaymentError(error, 'Apple Pay', onError);
        }
      };

      session.onpaymentauthorized = async (event) => {
        try {
          setIsLoading(true);
          
          // Process the payment with your backend
          const result = await processWalletPayment(
            'apple',
            event.payment,
            { amount, currency, items },
            email
          );

          session.completePayment(ApplePaySession.STATUS_SUCCESS);
          handlePaymentSuccess(result, onSuccess);
        } catch (error) {
          console.error('Payment authorization failed:', error);
          session.completePayment(ApplePaySession.STATUS_FAILURE);
          handlePaymentError(error, 'Apple Pay', onError);
        } finally {
          setIsLoading(false);
        }
      };

      session.oncancel = () => {
        console.log('Apple Pay payment cancelled by user');
      };

      session.begin();
      setApplePaySession(session);
    } catch (error) {
      console.error('Error starting Apple Pay session:', error);
      handlePaymentError(error, 'Apple Pay', onError);
    }
  };

  // Style the Apple Pay button based on props
  const buttonStyle = {
    width,
    height,
    borderRadius,
    WebkitAppearance: '-apple-pay-button',
    ApplePayButtonType: `-apple-pay-button-type-${buttonType}`,
    ApplePayButtonStyle: `-apple-pay-button-style-${buttonColor}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    pointerEvents: disabled || isLoading ? 'none' : 'auto'
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" width={width} height={height}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!applePayAvailable) {
    return null; // Don't render anything if Apple Pay is not available
  }

  return (
    <Box
      component="button"
      type="button"
      onClick={handleButtonClick}
      sx={{
        ...buttonStyle,
        '-apple-pay-button-type': buttonType,
        '-apple-pay-button-style': buttonColor
      }}
      aria-label="Pay with Apple Pay"
      disabled={disabled || isLoading}
    />
  );
};

ApplePayButton.propTypes = {
  amount: PropTypes.number.isRequired,
  currency: PropTypes.string,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      quantity: PropTypes.number
    })
  ),
  email: PropTypes.string.isRequired,
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
  buttonType: PropTypes.oneOf(['plain', 'buy', 'donate', 'checkout', 'book', 'subscribe']),
  buttonColor: PropTypes.oneOf(['black', 'white', 'white-outline']),
  width: PropTypes.string,
  height: PropTypes.string,
  borderRadius: PropTypes.string,
  disabled: PropTypes.bool
};

export default ApplePayButton; 