import React, { useState, useEffect, useCallback,useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaInfoCircle, FaMinus, FaPlus, FaTrashAlt, FaShoppingCart, FaCreditCard, FaBitcoin, FaEuroSign, FaPaypal, FaApple, FaGooglePay } from 'react-icons/fa';
import { SiStripe, SiApple, SiVisa, SiMastercard, SiAmericanexpress, SiPaypal } from 'react-icons/si';
import { toast } from 'react-toastify';
import { useCart } from '../contexts/CartContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { 
  createStripeCheckout, 
  createPayPalOrder, 
  capturePayPalPayment, 
  createPaymentIntent, 
  createCryptoPayment, 
  detectUserCountry
} from '../services/paymentApi.js';
import { validateIban, getBicFromIban } from '../services/bankingServices.js';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import GooglePayButton from '../components/payments/GooglePayButton.jsx';
import ApplePayButton from '../components/payments/ApplePayButton.jsx';
import PaymentSuccessRecommendations from '../components/payments/PaymentSuccessRecommendations.jsx';
import './CheckoutPage.css';

import { HashLoader } from 'react-spinners';

// Add some style fixes for the Stripe Elements and form fields
const styleFixesCSS = `
.card-element-container {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  min-height: 42px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.form-group input, 
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  margin-top: 5px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

/* Fix for the Stripe iframe */
iframe.StripeElement {
  width: 100% !important;
  min-height: 42px !important;
}

/* Styles for payment buttons */
.pay-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #f8f8f8;
  color: #888;
  border: 1px solid #ddd;
}

.pay-button:not(:disabled) {
  cursor: pointer;
  background-color: #007bff;
  color: white;
}

.card-error {
  color: #e4584c;
  font-size: 14px;
  margin-top: 8px;
}

/* Style for focused payment methods (Apple Pay, Google Pay) */
.payment-method-focus {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-top: 10px;
  background-color: #f9f9f9;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.payment-method-focus h3 {
  margin-top: 0;
  color: #333;
  font-size: 18px;
  margin-bottom: 10px;
}

.payment-method-focus .payment-info-note {
  margin-top: 15px;
  font-size: 14px;
  color: #666;
}
`;
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
// Initialize Stripe with your publishable key
// // Use environment variable now that we've fixed the .env.local file
// const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51R2112HlDxuwLTKvZuzoJTkH5l9gKERbMTvhYVVROWdmkzcN6WzLCMvZa8j71BSeOVDtrWAYGbCfDmb8AGjKr0YS00m8aH9BD8';
// console.log('Stripe key available:', !!stripeKey, 'Key length:', stripeKey ? stripeKey.length : 0);
// // Added extra logging to debug
// console.log('Environment variables:', {
//   VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
//   VITE_API_URL: import.meta.env.VITE_API_URL,
//   NODE_ENV: import.meta.env.NODE_ENV
// });

/**
 * PAYMENT METHODS MIGRATION TO PRODUCTION
 * 
 * ===== STRIPE CARD PAYMENTS =====
 * Migration steps:
 * 1. Get production API keys from Stripe dashboard (https://dashboard.stripe.com/apikeys)
 * 2. Replace test publishable key with production key in environment variables:
 *    - Update VITE_STRIPE_PUBLISHABLE_KEY in .env.production with "pk_live_..." key
 *    - Update the server-side secret key to "sk_live_..." in your backend environment
 * 3. Test the complete payment flow in a staging environment
 * 4. Ensure your Stripe account has completed all verification requirements
 * 5. Update webhook endpoints to production URLs and update webhook signing secrets
 * 6. Set up appropriate monitoring and alerts for production transactions
 * 
 * ===== PAYPAL =====
 * Migration steps:
 * 1. Create/login to PayPal Developer account and navigate to the app dashboard
 * 2. Switch from Sandbox to Live accounts in PayPal Developer Dashboard
 * 3. Create a live app and obtain production client ID and secret
 * 4. Update environment variables in your deployment:
 *    - VITE_PAYPAL_CLIENT_ID = "live client ID" (front-end)
 *    - PAYPAL_SECRET = "live secret" (back-end)
 * 5. Modify PayPalScriptProvider in your app entry point:
 *    - Ensure "options" has "intent: 'capture'" for production
 *    - Set the correct currency and client-id
 * 6. Set up IPN (Instant Payment Notification) for production URLs
 * 7. Enable appropriate transaction logging and monitoring
 * 
 * ===== GOOGLE PAY =====
 * Migration steps:
 * 1. Update Google Pay API configuration in GooglePayButton component:
 *    - Change environment from 'TEST' to 'PRODUCTION'
 *    - Update merchantId with your production merchant ID from Google Pay console
 * 2. Ensure your domain is verified and approved in the Google Pay console
 * 3. Update gateway merchant ID if using a payment processor
 * 4. Test thoroughly with real cards in a staging environment
 * 5. Update your privacy policy to include Google Pay information
 * 6. Enable proper logging and monitoring for Google Pay transactions
 * 
 * ===== APPLE PAY =====
 * Migration steps:
 * 1. Complete Apple Pay merchant validation with your production domain:
 *    - Register your domain in the Apple Pay Developer Dashboard
 *    - Generate a merchant identity certificate for production use
 * 2. Update ApplePayButton component configuration:
 *    - Replace test merchantIdentifier with production identifier
 *    - Update to production gateway if using a payment processor
 * 3. Ensure your server properly validates the Apple Pay session
 * 4. Verify Apple Pay button is only displayed on compatible devices
 * 5. Update your payment processing backend to handle production Apple Pay tokens
 * 
 * ===== SEPA DIRECT DEBIT =====
 * Migration steps:
 * 1. Ensure your Stripe account is fully verified for SEPA payments in production
 * 2. Update your Stripe keys to production keys as described in Stripe section
 * 3. Obtain necessary legal compliance for SEPA processing:
 *    - Update your terms of service and privacy policy
 *    - Implement appropriate mandate text and consent flows
 * 4. Update the payment_method_types to include 'sepa_debit' in production calls
 * 5. Implement proper SEPA-specific error handling and retry mechanisms
 * 6. Consider longer processing time for SEPA in production (typically 1-2 business days)
 * 7. Set up SEPA mandate management and notifications for users
 * 
 * ===== iDEAL =====
 * Migration steps:
 * 1. Verify your Stripe account has iDEAL payments enabled for production
 * 2. Update Stripe API keys to production as described in Stripe section
 * 3. Ensure your business details are correct in Stripe dashboard
 * 4. Add required legal text for iDEAL payments in checkout flow
 * 5. Implement proper bank selection interface in production
 * 6. Set appropriate redirect URLs for successful/failed payments
 * 7. Implement proper handling for iDEAL's synchronous notification system
 * 8. Update webhook handlers to process iDEAL payment confirmations
 * 
 * ===== UPI =====
 * Migration steps:
 * 1. Complete Stripe verification for UPI payments in India
 * 2. Update Stripe API keys to production as described in Stripe section
 * 3. Register with NPCI (National Payments Corporation of India) if direct integration
 * 4. Update payment_method_types to include 'upi' in production environment
 * 5. Implement proper VPA (Virtual Payment Address) validation
 * 6. Set up appropriate success/failure redirect URLs
 * 7. Implement webhook handlers for asynchronous payment completion
 * 8. Add proper UPI transaction reference IDs in production
 * 
 * ===== CRYPTO PAYMENTS =====
 * Migration steps:
 * 1. Select a production cryptocurrency payment processor (BitPay, Coinbase Commerce, etc.)
 * 2. Create an account and complete verification with the provider
 * 3. Obtain production API keys and replace test keys
 * 4. Update webhook endpoints to production URLs
 * 5. Implement proper crypto payment verification mechanisms
 * 6. Consider exchange rate volatility handling in production
 * 7. Implement appropriate refund policies for crypto payments
 * 8. Update your terms of service to cover cryptocurrency payment details
 */

// Explicitly create a new Promise for Stripe loading
const stripePromise = new Promise((resolve) => {
  console.log('Loading Stripe with key:', stripeKey);
  
  // Add a slight delay to ensure DOM is ready
  setTimeout(() => {
    loadStripe(stripeKey)
      .then(stripeInstance => {
        console.log('Stripe loaded successfully:', !!stripeInstance);
        resolve(stripeInstance);
      })
      .catch(err => {
        console.error('Stripe initialization error:', err);
        resolve(null);
      });
  }, 100);
});



// Log Stripe availability only once
const stripeAvailable = !!stripeKey;
if (process.env.NODE_ENV === 'development') {
  console.log('Stripe key available:', stripeAvailable, stripeKey ? `Key length: ${stripeKey.length}` : '');
  console.log('Environment variables:', import.meta.env);
}



// Define available payment methods
const PAYMENT_METHODS = {
  CARD: 'card',
  PAYPAL: 'paypal',
  IDEAL: 'ideal',
  SEPA: 'sepa',
  UPI: 'upi',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
  CRYPTO: 'crypto',
  AFTERPAY: 'afterpay',
};

// Define payment methods by region
const REGION_PAYMENT_METHODS = {
  US: [PAYMENT_METHODS.PAYPAL, PAYMENT_METHODS.APPLE_PAY, PAYMENT_METHODS.GOOGLE_PAY, PAYMENT_METHODS.CARD, PAYMENT_METHODS.AFTERPAY, PAYMENT_METHODS.CRYPTO],
  EU: [PAYMENT_METHODS.PAYPAL, PAYMENT_METHODS.APPLE_PAY, PAYMENT_METHODS.GOOGLE_PAY, PAYMENT_METHODS.CARD, PAYMENT_METHODS.SEPA, PAYMENT_METHODS.IDEAL, PAYMENT_METHODS.CRYPTO],
  IN: [PAYMENT_METHODS.CARD, PAYMENT_METHODS.UPI, PAYMENT_METHODS.PAYPAL, PAYMENT_METHODS.GOOGLE_PAY, PAYMENT_METHODS.CRYPTO],
  DEFAULT: [PAYMENT_METHODS.CARD, PAYMENT_METHODS.PAYPAL, PAYMENT_METHODS.APPLE_PAY, PAYMENT_METHODS.GOOGLE_PAY, PAYMENT_METHODS.CRYPTO],
};

// Get EU region countries
const EU_COUNTRIES = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'PT', 'AT', 'FI', 'IE', 'LU', 'MT', 'CY', 'GR', 'SI', 'SK', 'LV', 'LT', 'EE'];

// Get payment methods for a specific country
const getPaymentMethodsForCountry = (countryCode) => {
  if (countryCode === 'IN') {
    return REGION_PAYMENT_METHODS.IN;
  } else if (EU_COUNTRIES.includes(countryCode)) {
    return REGION_PAYMENT_METHODS.EU;
  } else if (countryCode === 'US') {
    return REGION_PAYMENT_METHODS.US;
  }
  return REGION_PAYMENT_METHODS.DEFAULT;
};

// Stripe Elements Form
const CheckoutForm = ({ finalTotal, currency, email, handlePaymentSuccess, isSubmitting, setIsSubmitting, zipCode, cardName }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardElementReady, setCardElementReady] = useState(false);
  
  // Debug logs for Stripe initialization
  useEffect(() => {
    console.log("Stripe Elements status:", {
      stripeAvailable: !!stripe,
      elementsAvailable: !!elements
    });
    
    // Check every 1 second if Stripe is loaded for up to 10 seconds
    const checkInterval = setInterval(() => {
      if (stripe && elements) {
        console.log("Stripe and elements are now available");
        clearInterval(checkInterval);
        setCardElementReady(true);
      }
    }, 1000);
    
    // Clear interval after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      if (!stripe || !elements) {
        console.error("Stripe or elements couldn't be loaded after timeout");
      }
    }, 10000);
    
    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [stripe, elements]);
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      console.error('Stripe or Elements not loaded yet');
      setError('Payment processing is not ready yet. Please try again in a moment.');
      return;
    }
    
    setProcessing(true);
    setIsSubmitting(true);
    
    try {
      // Create payment intent on the server
      const { clientSecret, orderId } = await createPaymentIntent({
        amount: finalTotal,
        currency: currency.toLowerCase(),
        email: email, // Send email for order confirmation
        paymentMethodTypes: ['card'], // Specify card payment
        metadata: {
          source: 'checkout-form',
          paymentType: 'card',
          postalCode: zipCode // Add postal code to metadata for record-keeping
        }
      });
      
      console.log('Payment intent created with order ID:', orderId);
      
      // Confirm the payment with billing details
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            email: email,
            name: cardName || undefined,
            address: {
              postal_code: zipCode || undefined
            }
          },
        },
      });
      
      if (result.error) {
        setError(result.error.message);
        toast.error(result.error.message);
        console.error('Payment confirmation error:', result.error);
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          toast.success('Payment successful! Thank you for your purchase.');
          // Pass the result object with both payment ID and order ID
          handlePaymentSuccess({
            id: result.paymentIntent.id,
            orderId: orderId // Pass the order ID from createPaymentIntent
          });
        }
      }
    } catch (err) {
      console.error('Payment processing error:', err);
      setError(err.message || 'An unexpected error occurred');
      toast.error(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <div className="form-group">
        <label htmlFor="card-element">Credit or debit card</label>
        <div className="card-element-container" style={{ minHeight: '42px' }}>
          {cardElementReady ? (
            <CardElement
              id="card-element"
              onChange={(e) => {
                setCardComplete(e.complete);
                if (e.error) {
                  setError(e.error.message);
                } else {
                  setError(null);
                }
                console.log('Card element change:', e);
              }}
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                    fontSmoothing: 'antialiased',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
                hidePostalCode: true, // We collect postal code separately in the parent form
              }}
            />
          ) : (
            <div className="card-element-loading-indicator">
              Loading card input field...
            </div>
          )}
        </div>
      </div>
      
      {error && <div className="card-error">{error}</div>}
      
      <div className="card-brands">
        <SiVisa size={24} />
        <SiMastercard size={24} />
        <SiAmericanexpress size={24} />
        <span>and more...</span>
      </div>
      
      <button
        type="submit"
        className="pay-button"
        disabled={!stripe || processing || isSubmitting || !cardComplete}
      >
        {processing ? 'Processing...' : `Pay ${currency.toUpperCase()} ${(finalTotal || 0).toFixed(2)}`}
      </button>
      
      {(!stripe || !elements) && (
        <div className="stripe-loading-message" style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          Waiting for payment system to initialize...
        </div>
      )}
    </form>
  );
};

// Main Checkout Component
const Checkout = () => {
  const { cart, cartTotal, removeFromCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();
  const [{ isPending }] = usePayPalScriptReducer();
  const { user } = useAuth();
  const isAuthenticated = !!user; // User is authenticated if user object exists
  
  // Add loading state for the initial page load
  const [isLoading, setIsLoading] = useState(true);
  
  // Add ref for dynamic style element
  const styleRef = useRef(null);
  
  // Various form state
  
  const [email, setEmail] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [country, setCountry] = useState('United States');
  const [countryCode, setCountryCode] = useState('US');
  const [zipCode, setZipCode] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [newsletter, setNewsletter] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CARD);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [clientSecret, setClientSecret] = useState('');
  const [stripeLoading, setStripeLoading] = useState(false);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [sepaIban, setSepaIban] = useState('');
  const [sepaIbanValid, setSepaIbanValid] = useState(null);
  const [sepaBic, setSepaBic] = useState('');
  const [sepaBicValid, setSepaBicValid] = useState(null);
  const [sepaBicManualRequired, setSepaBicManualRequired] = useState(false);
  const [sepaConsent, setSepaConsent] = useState(false);
  const [orderReference, setOrderReference] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Calculate VAT (variable based on country)
  const vatRate = country === 'United States' ? 0 : 0.2; // 20% VAT for non-US
  const vatAmount = (cartTotal - discountAmount) * vatRate;
  
  // Calculate final total
  const finalTotal = cartTotal - discountAmount + vatAmount;
  
  // Generate a stable order reference when component mounts
  useEffect(() => {
    // Format: ORDER-{YYMMDDhhmm}-{random4digits}
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const reference = `ORDER-${year}${month}${day}${hour}${minute}-${randomDigits}`;
    setOrderReference(reference);
  }, []);
  
  // Get available payment methods based on user location
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const detectedCountry = await detectUserCountry();
        setCountryCode(detectedCountry);
        
        // Set country name based on code
        // This would be better with a comprehensive country mapping
        switch (detectedCountry) {
          case 'US':
            setCountry('United States');
            setCurrency('USD');
            break;
          case 'GB':
            setCountry('United Kingdom');
            setCurrency('GBP');
            break;
          case 'IN':
            setCountry('India');
            setCurrency('INR');
            break;
          case 'DE':
          case 'FR':
          case 'IT':
          case 'ES':
          case 'NL':
          case 'BE':
            // Set EU countries
            const countryNames = {
              DE: 'Germany',
              FR: 'France',
              IT: 'Italy',
              ES: 'Spain',
              NL: 'Netherlands',
              BE: 'Belgium',
            };
            setCountry(countryNames[detectedCountry] || 'European Union');
            setCurrency('EUR');
            break;
          default:
            setCountry('United States');  // Default
            setCurrency('USD');
        }
        
        // Set available payment methods
        setAvailablePaymentMethods(getPaymentMethodsForCountry(detectedCountry));
        
        // Set default payment method
        setPaymentMethod(PAYMENT_METHODS.CARD);
      } catch (error) {
        console.error('Error detecting country:', error);
        // Fallback to default
        setCountryCode('US');
        setCountry('United States');
        setCurrency('USD');
        setAvailablePaymentMethods(REGION_PAYMENT_METHODS.DEFAULT);
      }
    };
    
    detectCountry();
  }, []);
  
  // Set email from authenticated user when component mounts
  useEffect(() => {
    if (isAuthenticated && user && user.email) {
      setEmail(user.email);
    }
  }, [isAuthenticated, user]);
  
  const handleQuantityChange = (id, newQuantity) => {
    if (newQuantity >= 1) {
      updateQuantity(id, newQuantity);
    }
  };
  
  const handleRemoveItem = (id) => {
    removeFromCart(id);
    toast.info('Item removed from cart');
  };
  
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };
  
  const handleCardNumberChange = (e) => {
    const formattedValue = formatCardNumber(e.target.value);
    setCardNumber(formattedValue);
  };
  
  const handleExpiryChange = (e) => {
    let value = e.target.value;
    value = value.replace(/[^\d]/g, '');
    
    if (value.length <= 2) {
      setCardExpiry(value);
    } else if (value.length > 2) {
      setCardExpiry(value.slice(0, 2) + '/' + value.slice(2, 4));
    }
  };
  
  const applyDiscount = () => {
    if (discountCode.toLowerCase() === 'welcome10') {
      const discount = cartTotal * 0.1; // 10% discount
      setDiscountAmount(discount);
      setDiscountApplied(true);
      toast.success('Discount applied: 10% off');
    } else {
      toast.error('Invalid discount code');
    }
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    
    // Reset any previous errors
    setIsSubmitting(false);
  };
  
  const handlePaymentSuccess = (result) => {
    // Save purchased items to localStorage for the success page to use
    try {
      localStorage.setItem('lastPurchasedItems', JSON.stringify(cart));
    } catch (err) {
      console.error('Error saving cart to localStorage:', err);
    }
    
    clearCart();
    
    // If we have a payment result with a redirect URL, use that
    if (result && result.redirectUrl) {
      window.location.href = result.redirectUrl;
      return;
    }
    
    // Otherwise construct a generic success URL
    // Include orderId if available for card payments (this is the key fix)
    const paymentId = result?.id || 'unknown';
    const orderId = result?.orderId || '';
    const orderIdParam = orderId ? `&order_id=${orderId}` : '';
    
    const successUrl = `/checkout/success?payment_id=${paymentId}&status=success&type=payment_intent${orderIdParam}`;
    console.log('Redirecting to success page with params:', { paymentId, orderId });
    navigate(successUrl);
  };
  
  // Handle Stripe checkout redirect
  const handleStripeCheckout = async () => {
    setIsSubmitting(true);
    
    try {
      const checkout = await createStripeCheckout({
        cartTotal: finalTotal,
        items: cart,
        currency: currency.toLowerCase(),
        countryCode: countryCode,
        email: email || undefined,
        metadata: {
          discount: discountApplied ? 'welcome10' : '',
        },
      });
      
      // Redirect to Stripe Checkout
      window.location.href = checkout.url;
    } catch (error) {
      toast.error(error.message || 'Failed to initialize checkout. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  // Handle SEPA Direct Debit
  const handleSepaPayment = async () => {
    setIsSubmitting(true);
    
    try {
      // Import logging service
      const { logInfo, logError, logTransaction } = await import('../services/logService.js');
      
      logInfo('Starting SEPA payment process', { currency, totalAmount: finalTotal }, 'handleSepaPayment');
      
      // SEPA requires EUR as the currency
      if (currency.toLowerCase() !== 'eur') {
        toast.error('SEPA payments require EUR as the currency. Please switch to EUR.');
        logError('Currency not EUR for SEPA payment', { currency }, 'handleSepaPayment');
        setIsSubmitting(false);
        return;
      }
      
      // Validate IBAN one more time
      const ibanValidation = validateIban(sepaIban);
      if (!ibanValidation.isValid) {
        toast.error(`Invalid IBAN: ${ibanValidation.reason}`);
        logError('Invalid IBAN for SEPA payment', { reason: ibanValidation.reason }, 'handleSepaPayment');
        setIsSubmitting(false);
        return;
      }
      
      // Get email based on authentication status
      const userEmail = isAuthenticated && user?.email ? user.email : email;
      
      // Add debugging for email issues
      console.log('Email details:', {
        isAuthenticated, 
        userEmail, 
        email,
        'user?.email': user?.email
      });
      
      // Log the email source for debugging
      if (isAuthenticated && user?.email) {
        logInfo(`Using authenticated user email: ${user.email}`, {}, 'handleSepaPayment');
      } else if (email) {
        logInfo(`Using manually entered email: ${email}`, {}, 'handleSepaPayment');
      } else {
        logInfo('No email provided for order confirmation', {}, 'handleSepaPayment');
      }
      
      // Only validate email if it's provided (but not empty) and not from an authenticated user
      if (!isAuthenticated && email && !email.includes('@')) {
        toast.error('Please enter a valid email address for payment confirmation');
        setIsSubmitting(false);
        return;
      }
      
      // Create a unique endToEndId
      const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
      const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const endToEndId = `AIWR${timestamp.substring(0, 8)}${randomSuffix}`;
      
      // Safety check for cart items
      if (!cart || !Array.isArray(cart) || cart.length === 0) {
        toast.error('Your cart appears to be empty. Please add items before proceeding.');
        logError('Empty cart for SEPA payment', {}, 'handleSepaPayment');
        setIsSubmitting(false);
        return;
      }
      
      // Get ordered items summary with additional error handling
      let itemsDescription;
      try {
        itemsDescription = cart.map(item => {
          if (!item) return 'Unknown item';
          const quantity = item.quantity || 1;
          const title = (item.title || item.name || 'Product').substring(0, 20);
          return `${quantity}x ${title}`;
        }).join(', ');
        
        // Limit overall length
        if (itemsDescription.length > 140) {
          itemsDescription = itemsDescription.substring(0, 137) + '...';
        }
      } catch (descError) {
        logError(descError, { cart }, 'handleSepaPayment');
        itemsDescription = 'Order items';  // Fallback
      }
      
      // Create SEPA Credit Transfer payload
      const sepaPayload = {
        paymentType: 'sepa_credit_transfer',
        debtorInfo: {
        name: cardName,
          iban: sepaIban.replace(/\s+/g, ''),
          bic: sepaBic || undefined, // Optional, only include if provided
          email: userEmail || email || '', // Always include email, even if empty
          ...(userEmail && userEmail.includes('@') ? { email: userEmail } : {}) // Only include email if valid
        },
        creditorInfo: {
          name: 'AI Wave Rider Ltd',
          iban: 'DE89370400440532013000', // Your company's IBAN
          bic: 'DEUTDEDBXXX' // Your company's BIC
        },
        paymentInfo: {
          endToEndId: endToEndId,
          amount: finalTotal.toFixed(2),
          currency: 'EUR',
          executionDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
          remittanceInfo: `${orderReference} - ${itemsDescription}`
        },
        metadata: {
          orderId: orderReference,
          items: cart.map(item => {
            if (!item) return { id: 'unknown', title: 'Unknown Product', price: 0, quantity: 1 };
            return {
              id: item.id || 'unknown',
              title: item.title || item.name || 'Product',
              price: typeof item.price === 'number' ? item.price : 0,
              quantity: typeof item.quantity === 'number' ? item.quantity : 1
            };
          }),
          customerConsent: true,
          totalAmount: finalTotal,
          discountApplied: discountApplied ? 'welcome10' : '',
          email: userEmail || email || '', // Add email to metadata as well
          userEmail: userEmail || null, // Always include email in metadata even if not provided
          ...(isAuthenticated && user?.uid ? { userId: user.uid } : {}) // Include user ID for authenticated users
        }
      };
      
      // For debugging - log the payload
      console.log('SEPA payload:', sepaPayload);
      
      // Log the transaction start (with sensitive data redacted)
      logTransaction(endToEndId, 'initiated', 'sepa_credit_transfer', { 
        amount: finalTotal.toFixed(2),
        currency: 'EUR',
        items: cart.length,
        hasEmail: !!userEmail
      });
      
      // Log whether user provided email or not
      if (userEmail) {
        logInfo(`User provided email for order confirmation: ${userEmail}`, {}, 'handleSepaPayment');
      } else {
        logInfo('No email provided for order confirmation', {}, 'handleSepaPayment');
      }
      
      // Check environment to determine whether to simulate payment
      const isProduction = import.meta.env.VITE_NODE_ENV === 'production' || 
                          import.meta.env.MODE === 'production';
      
      // Use explicit env var if available, otherwise base on environment
      const enableSimulation = import.meta.env.VITE_ENABLE_PAYMENT_SIMULATION === 'true' || 
                              (!isProduction && import.meta.env.DEV);
      
      // Create a Stripe tracking reference for webhook events
      let stripeReference = null;
      try {
        // Create a Stripe PaymentIntent for tracking and webhook events
        const stripeApi = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/payments/stripe`;
        console.log('Creating Stripe tracking reference at:', stripeApi);
        
        const stripePaymentResponse = await fetch(`${stripeApi}/create-sepa-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: finalTotal,
            currency: 'eur',
            description: `Order ${orderReference} - SEPA Transfer`,
            metadata: {
              orderReference,
              paymentType: 'sepa_credit_transfer',
              simulationMode: enableSimulation ? 'true' : 'false',
              email: userEmail || email || '',
              endToEndId
            }
          })
        });
        
        if (stripePaymentResponse.ok) {
          const stripeData = await stripePaymentResponse.json();
          console.log('Created Stripe tracking reference:', stripeData.id);
          stripeReference = stripeData.id;
          
          // Add the Stripe reference to the SEPA payload
          sepaPayload.stripeReference = stripeData.id;
          sepaPayload.metadata.stripeReference = stripeData.id;
        } else {
          const errorData = await stripePaymentResponse.json().catch(() => ({}));
          console.warn('Failed to create Stripe tracking reference for webhooks:', errorData);
        }
      } catch (stripeErr) {
        console.error('Error creating Stripe tracking reference:', stripeErr);
        // Continue with payment even if Stripe reference fails
      }
      
      // Simulation path for testing in development
      if (enableSimulation) {
        logInfo('Simulating SEPA payment in non-production environment', 
               { endToEndId, amount: finalTotal }, 
               'handleSepaPayment');
        
        // Define API URL - this was missing before
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        
        // Instead of just simulating locally, we still need to call the backend API
        // even in simulation mode to ensure email sending works properly
        try {
          logInfo('Sending simulated SEPA payment to backend', 
                  { endpoint: `${apiUrl}/api/payments/sepa-credit-transfer`, simulation: true }, 
                  'handleSepaPayment');
          
          // Add a simulation flag to the payload
          const simulationPayload = {
            ...sepaPayload,
            simulationMode: true, // Tell backend this is a simulation
          };
          
          // Call the backend API with the simulation payload
          const response = await fetch(`${apiUrl}/api/payments/sepa-credit-transfer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(simulationPayload)
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            logError('Simulated API call failed', { 
              status: response.status, 
              statusText: response.statusText,
              errorData
            }, 'handleSepaPayment-simulationApi');
            
            // Continue with local simulation even if API call fails
            logInfo('Continuing with local simulation after API call failure', {}, 'handleSepaPayment');
          } else {
            const result = await response.json();
            logInfo('Simulated SEPA payment API response received', { 
              success: result.success,
              hasPayment: !!result.payment,
              hasRedirect: !!result.redirectUrl
            }, 'handleSepaPayment');
            
            // If the API call includes order processing results, log them
            if (result.payment?.orderProcessed) {
              logInfo('Order processed on backend during simulation', {
                orderId: result.payment.orderId,
                emailSent: result.payment.emailStatus
              }, 'handleSepaPayment');
              
              // Handle email status information
              const emailStatus = result.payment?.emailStatus || 'unknown';
              
              // Log email status
              logInfo(`Email confirmation status: ${emailStatus}`, 
                     { message: result.payment?.emailMessage }, 
                     'handleSepaPayment-email');
              
              // Customize the email toast based on email status
              setTimeout(() => {
                if (emailStatus === 'sent' || emailStatus === 'completed') {
                  toast.success(`Order confirmation email sent to ${userEmail || 'your email address'}`, {
                    autoClose: 5000,
                    position: 'bottom-right',
                    icon: '📧'
                  });
                } else if (emailStatus === 'failed') {
                  toast.error(`Could not send confirmation email: ${result.payment?.emailError || 'Unknown error'}`, {
                    autoClose: 5000,
                    position: 'bottom-right',
                    icon: '❌'
                  });
                } else if (emailStatus === 'skipped') {
                  toast.warning('No confirmation email sent - no email address provided', {
                    autoClose: 5000,
                    position: 'bottom-right',
                    icon: '⚠️'
                  });
                } else {
                  // Default fallback toast
                  toast.info('Order registered. Check your email for confirmation.', {
                    autoClose: 5000,
                    position: 'bottom-right',
                    icon: '📧'
                  });
                }
              }, 3000);
            }
          }
        } catch (apiError) {
          logError('Error calling backend API in simulation mode', apiError, 'handleSepaPayment');
          // Continue with local simulation even if API call fails
        }
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Show success message
        toast.success('SEPA Credit Transfer initiated successfully! (SIMULATION MODE)');
        
        // Save purchased items to localStorage for the success page to use
        try {
          localStorage.setItem('lastPurchasedItems', JSON.stringify(cart));
        } catch (err) {
          logError(err, { cart: 'cart storage failed' }, 'handleSepaPayment');
        }
        
        // Flag that payment is completed to show recommendations
        setPaymentCompleted(true);
        setShowRecommendations(true);
        
        // Log the simulated transaction
        logTransaction(endToEndId, 'simulated', 'sepa_credit_transfer', { 
          amount: finalTotal.toFixed(2),
          currency: 'EUR'
        });
        
        // Extra toast to inform user about recommendations
        setTimeout(() => {
          toast.info('Looking for similar products you might like...', {
            autoClose: 4000,
            position: 'bottom-right'
          });
        }, 1000);
        
        // Wait for a longer period to let user see the recommendations
        // Then continue with redirect
        setTimeout(() => {
          // Clear the cart
          clearCart();
          
          // Redirect to success page with the reference
          navigate(`/checkout/success?payment_id=${endToEndId}&status=pending&type=sepa_credit_transfer&simulated=true`);
        }, 8000); // Display recommendations for 8 seconds before redirecting
        
        return;
      }
      
      // Production path - Check API connectivity before proceeding
      try {
        logInfo('Checking API connectivity before SEPA payment', {}, 'handleSepaPayment');
        const { checkApiConnectivity } = await import('../services/paymentApi.js');
        const connectivityCheck = await checkApiConnectivity();
        
        if (!connectivityCheck.ok) {
          logError('API connectivity check failed before SEPA payment', 
                  connectivityCheck, 
                  'handleSepaPayment');
          
          if (connectivityCheck.fallbackOk) {
            toast.error(`Payment system issue: ${connectivityCheck.error}. Please try again in a few minutes.`);
          } else {
            toast.error(`Could not connect to payment server: ${connectivityCheck.error}`);
          }
          
          setIsSubmitting(false);
          return;
        }
      } catch (connectivityError) {
        logError(connectivityError, {}, 'handleSepaPayment-apiConnectivity');
        toast.error('Could not verify payment system availability. Trying to proceed anyway...');
      }
      
      // Send the SEPA Credit Transfer request to our backend
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      logInfo('Sending SEPA payment to backend', { endpoint: `${apiUrl}/api/payments/sepa-credit-transfer` }, 'handleSepaPayment');
      
      const response = await fetch(`${apiUrl}/api/payments/sepa-credit-transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sepaPayload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Server returned ${response.status} ${response.statusText}`;
        
        logError(errorMessage, { 
          status: response.status, 
          statusText: response.statusText,
          errorData
        }, 'handleSepaPayment-apiResponse');
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // Handle the response
      if (result.success) {
        // Log successful transaction
        logTransaction(endToEndId, 'success', 'sepa_credit_transfer', { 
          amount: finalTotal.toFixed(2),
          orderId: orderReference,
          email: userEmail || email || '' // Log email for tracking
        });
        
        // Check email status from the response
        const emailStatus = result.payment?.emailStatus || 'unknown';
        
        // Show status-specific toast based on email sending status
        if (emailStatus === 'sent' || emailStatus === 'completed') {
          toast.success(`Order confirmation email sent to ${userEmail || 'your email address'}`, {
            autoClose: 5000,
            position: 'bottom-right',
            icon: '📧'
          });
        } else if (emailStatus === 'failed') {
          toast.error(`Could not send confirmation email: ${result.payment?.emailError || 'Unknown error'}`, {
            autoClose: 7000,
            position: 'bottom-right',
            icon: '❌'
          });
        } else if (emailStatus === 'skipped') {
          toast.warning('No confirmation email sent - no email address provided', {
            autoClose: 5000,
            position: 'bottom-right',
            icon: '⚠️'
          });
        }
        
        // Show general success message with email notification
        const emailMsg = userEmail || email 
          ? 'Your order confirmation has been sent to your email.'
          : 'Please contact support if you need an order confirmation email.';
          
        toast.success(`SEPA Credit Transfer initiated successfully! ${emailMsg}`);
        
        // Check if templates are available for immediate download
        if (result.payment && result.payment.templates && result.payment.templates.length > 0) {
          // Log available templates
          logInfo('Templates available for immediate download', { 
            count: result.payment.templates.length,
            templates: result.payment.templates.map(t => t.agentId)
          }, 'handleSepaPayment');
          
          // Store download URLs in session storage for access after redirect
          try {
            sessionStorage.setItem('downloadTemplates', JSON.stringify(result.payment.templates));
            sessionStorage.setItem('orderReference', result.payment.orderId || orderReference);
            
            // If we have a direct download URL, show immediate download button
            if (result.payment.directDownloadUrl) {
              // Show toast with download button
              toast.success(
                <div>
                  <p>Your template is ready for immediate download!</p>
                  <button 
                    onClick={() => window.open(result.payment.directDownloadUrl, '_blank')}
                    style={{ 
                      background: '#4a86e8', 
                      color: 'white', 
                      border: 'none', 
                      padding: '8px 15px', 
                      borderRadius: '4px',
                      marginTop: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Download Now
                  </button>
                </div>,
                {
                  autoClose: false,
                  closeOnClick: false,
                  position: 'bottom-center',
                  icon: '📥'
                }
              );
            }
          } catch (storageError) {
            logError('Failed to store template download links in session storage', storageError, 'handleSepaPayment');
          }
        }
        
        // Save purchased items to localStorage for the success page to use
        try {
          localStorage.setItem('lastPurchasedItems', JSON.stringify(cart));
          // Also store the email for confirmation purposes
          if (userEmail || email) {
            sessionStorage.setItem('confirmationEmail', userEmail || email);
          }
        } catch (err) {
          logError(err, {}, 'handleSepaPayment-localStorage');
        }
        
        // Show payment recommendations before redirecting
        setPaymentCompleted(true);
        setShowRecommendations(true);
        
        // Extra toast to inform user about recommendations
        setTimeout(() => {
          toast.info('Looking for similar products you might like...', {
            autoClose: 4000,
            position: 'bottom-right'
          });
        }, 1000);
        
        // Wait for a longer period to let user see the recommendations
        setTimeout(() => {
          // Clear the cart
          clearCart();
          
          // Redirect to success page with the reference
          navigate(`/checkout/success?payment_id=${endToEndId}&status=pending&type=sepa_credit_transfer`);
        }, 8000); // Display recommendations for 8 seconds before redirecting
        } else {
        logError('SEPA payment failed', result, 'handleSepaPayment-resultFailure');
        throw new Error(result.message || 'Failed to initiate SEPA Credit Transfer');
      }
    } catch (error) {
      const { logError } = await import('../services/logService.js').catch(() => ({ 
        logError: (err) => console.error('Error logging service unavailable:', err)
      }));
      
      logError(error, { 
        sepaIban: sepaIban ? '***REDACTED***' : undefined,
        sepaBic: sepaBic ? '***REDACTED***' : undefined,
        finalTotal,
        currency
      }, 'handleSepaPayment');
      
      console.error('SEPA payment error:', error);
      toast.error(error.message || 'SEPA Credit Transfer failed. Please try again or use another payment method.');
      setIsSubmitting(false);
    }
  };
  
  // Handle iDEAL payment
  const handleIdealPayment = async () => {
    setIsSubmitting(true);
    
    try {
      // iDEAL requires EUR as the currency
      if (currency.toLowerCase() !== 'eur') {
        toast.error('iDEAL payments require EUR as the currency. Please switch to EUR to use iDEAL.');
        setIsSubmitting(false);
        return;
      }
      
      // Check if country is Netherlands or Belgium
      if (countryCode !== 'NL' && countryCode !== 'BE') {
        toast.warning('iDEAL works best for customers in the Netherlands or Belgium.');
      }
      
      console.log('iDEAL payment initiated with details:', {
        name: cardName,
        email: email,
        currency: currency,
        countryCode: countryCode
      });
      
      // Check API connectivity before proceeding
      try {
        const { checkApiConnectivity } = await import('../services/paymentApi.js');
        const connectivityCheck = await checkApiConnectivity();
        
        if (!connectivityCheck.ok) {
          console.error('API connectivity check failed:', connectivityCheck.error);
          
          if (connectivityCheck.fallbackOk) {
            toast.error(`Payment system issue: ${connectivityCheck.error}. Please try again in a few minutes.`);
          } else {
            toast.error(`Could not connect to payment server: ${connectivityCheck.error}`);
          }
          
          setIsSubmitting(false);
          return;
        }
      } catch (connectivityError) {
        console.error('Error checking API connectivity:', connectivityError);
        toast.error('Could not verify payment system availability. Trying to proceed anyway...');
        // Continue despite connectivity check error - the actual payment might still work
      }
      
      // Create a checkout session for iDEAL
      try {
        const { url } = await createStripeCheckout({
          cartTotal: finalTotal,
          items: cart.map(item => ({
            id: item.id,
            title: item.title,
            price: item.price,
            quantity: item.quantity
          })),
          currency: 'eur', // Force EUR for iDEAL
          countryCode,
          email,
          paymentMethodTypes: ['ideal'],
          billingDetails: {
            name: cardName,
            email: email,
          }
        });
        
        console.log('iDEAL checkout URL:', url);
        
        if (!url) {
          throw new Error('No checkout URL returned from the server');
        }
        
        // Redirect to checkout
        window.location.href = url;
      } catch (checkoutError) {
        console.error('iDEAL checkout creation error:', checkoutError);
        
        // Handle specific error cases
        if (checkoutError.message.includes('timed out')) {
          toast.error('Payment system is taking too long to respond. Please try again in a few minutes.');
        } else if (checkoutError.message.includes('Failed to fetch') || 
                   checkoutError.message.includes('NetworkError')) {
          toast.error('Cannot connect to payment system. Please check your internet connection and try again.');
        } else {
          toast.error(checkoutError.message || 'Failed to initialize iDEAL payment. Please try another payment method.');
        }
        
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('iDEAL payment error:', error);
      toast.error(error.message || 'iDEAL payment failed. Please try another payment method.');
      setIsSubmitting(false);
    }
  };
  
  // Handle UPI payment
  const handleUpiPayment = async () => {
    setIsSubmitting(true);
    
    try {
      toast.info('Redirecting to UPI payment...');
      const checkout = await createStripeCheckout({
        cartTotal: finalTotal,
        items: cart,
        currency: 'inr', // UPI uses INR
        countryCode: 'IN', // UPI is specific to India
        email: email || undefined,
        metadata: {
          payment_method: 'upi',
        },
      });
      
      // Redirect to Stripe Checkout with UPI option
      window.location.href = checkout.url;
    } catch (error) {
      toast.error(error.message || 'Failed to initialize UPI payment. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  // Handle Afterpay/Clearpay payment
  const handleAfterpayPayment = async () => {
    setIsSubmitting(true);
    
    try {
      toast.info('Redirecting to Afterpay...');
      const checkout = await createStripeCheckout({
        cartTotal: finalTotal,
        items: cart,
        currency: currency.toLowerCase(),
        countryCode: countryCode,
        email: email || undefined,
        metadata: {
          payment_method: 'afterpay_clearpay',
        },
      });
      
      // Redirect to Stripe Checkout with Afterpay option
      window.location.href = checkout.url;
    } catch (error) {
      toast.error(error.message || 'Failed to initialize Afterpay. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  // Handle crypto payment via BitPay
  const handleCryptoPayment = async () => {
    setIsSubmitting(true);
    
    try {
      const { url } = await createCryptoPayment({
        cartTotal: finalTotal,
        items: cart,
        currency: currency,
      });
      
      // Redirect to BitPay
      window.location.href = url;
    } catch (error) {
      toast.error(error.message || 'Failed to initialize crypto payment. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  // PayPal button handlers
  const createPaypalOrder = async () => {
    try {
      // Call backend to create PayPal order
      const orderData = {
        cartTotal: finalTotal,
        items: cart
      };
      const { id } = await createPayPalOrder(orderData);
      return id;
    } catch (error) {
      toast.error("Could not initiate PayPal checkout. Please try again.");
      console.error('PayPal order creation error:', error);
      throw error;
    }
  };
  
  const onPayPalApprove = async (data) => {
    try {
      // Prepare metadata for the payment
      const metadata = {
        items: JSON.stringify(cart),
        email: email || '',
        userId: localStorage.getItem('userId') || '',
        userEmail: email || '',
        payment_method: 'paypal'
      };
      
      // Call backend to capture funds with metadata
      await capturePayPalPayment(data.orderID, metadata);
      
      toast.success('Payment successful! Thank you for your purchase.');
      handlePaymentSuccess();
    } catch (error) {
      toast.error("There was a problem with your payment. Please try again.");
      console.error('PayPal payment capture error:', error);
    }
  };
  
  // Helper to render payment method icon
  const renderPaymentMethodIcon = (method) => {
    switch (method) {
      case PAYMENT_METHODS.CARD:
        return <FaCreditCard />;
      case PAYMENT_METHODS.PAYPAL:
        return <SiPaypal />;
      case PAYMENT_METHODS.IDEAL:
        return <FaEuroSign />;
      case PAYMENT_METHODS.SEPA:
        return <FaEuroSign />;
      case PAYMENT_METHODS.UPI:
        return <span style={{ fontWeight: 'bold' }}>UPI</span>;
      case PAYMENT_METHODS.APPLE_PAY:
        return <SiApple />;
      case PAYMENT_METHODS.GOOGLE_PAY:
        return <FaGooglePay />;
      case PAYMENT_METHODS.CRYPTO:
        return <FaBitcoin />;
      case PAYMENT_METHODS.AFTERPAY:
        return <span style={{ fontWeight: 'bold' }}>AP</span>;
      default:
        return <FaCreditCard />;
    }
  };
  
  // Helper to render payment method name
  const getPaymentMethodName = (method) => {
    switch (method) {
      case PAYMENT_METHODS.CARD:
        return 'Card';
      case PAYMENT_METHODS.PAYPAL:
        return 'PayPal';
      case PAYMENT_METHODS.IDEAL:
        return 'iDEAL';
      case PAYMENT_METHODS.SEPA:
        return 'SEPA';
      case PAYMENT_METHODS.UPI:
        return 'UPI';
      case PAYMENT_METHODS.APPLE_PAY:
        return 'Apple Pay';
      case PAYMENT_METHODS.GOOGLE_PAY:
        return 'Google Pay';
      case PAYMENT_METHODS.CRYPTO:
        return 'Crypto';
      case PAYMENT_METHODS.AFTERPAY:
        return countryCode === 'GB' ? 'Clearpay' : 'Afterpay';
      default:
        return 'Other';
    }
  };
  
  // Create Stripe Elements key and update when currency changes
  useEffect(() => {
    if (paymentMethod === PAYMENT_METHODS.CARD) {
      console.log('Setting up Stripe Elements for currency:', currency);
      setStripeLoading(true);
      
      // This forces Elements to re-initialize when currency changes
      setClientSecret('');
      
      // Simulate completion of initialization
      setTimeout(() => {
        setStripeLoading(false);
      }, 500);
    }
  }, [currency, paymentMethod]);
  
  // Apply CSS fixes when component mounts
  useEffect(() => {
    // Add CSS fixes to head
    if (!styleRef.current) {
      const style = document.createElement('style');
      style.textContent = styleFixesCSS;
      document.head.appendChild(style);
      styleRef.current = style;
      
      // Fix for touchstart passive event listener warning
      const originalAddEventListener = document.addEventListener;
      document.addEventListener = function(type, listener, options) {
        let modifiedOptions = options;
        if (type === 'touchstart' || type === 'touchmove') {
          if (typeof options === 'object') {
            modifiedOptions = { ...options, passive: true };
          } else {
            modifiedOptions = { passive: true };
          }
        }
        return originalAddEventListener.call(this, type, listener, modifiedOptions);
      };
    }
    
    // Cleanup function
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, []);
  
  // Add useEffect for the loading state
  useEffect(() => {
    // Simulate loading state to ensure all components are ready
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Add useEffect for payment methods loading
  useEffect(() => {
    // Allow time for payment method components to load
    const paymentMethodsTimer = setTimeout(() => {
      setPaymentMethodsLoading(false);
    }, 1500);
    
    return () => clearTimeout(paymentMethodsTimer);
  }, [paymentMethod, currency]); // Re-run when payment method or currency changes
  
  // Empty cart view
  if (cart.length === 0) {
    return (
      <div className="checkout-container">
        <div className="checkout-header">
          <Link to="/" className="back-link">
            <FaArrowLeft /> Continue Shopping
          </Link>
          <h1>Checkout</h1>
        </div>
        
        <div className="empty-cart">
          <div className="empty-cart-icon">
            <FaShoppingCart />
          </div>
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added any products to your cart yet.</p>
          <Link to="/agents" className="continue-shopping-btn">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }
  
  // Show loading screen initially
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-b from-gray-900 to-blue-900">
        <div className="mb-8">
          <HashLoader color="#4FD1C5" size={70} speedMultiplier={0.8} />
        </div>
        <div className="text-white text-xl font-semibold mt-4">
          Loading Checkout
        </div>
        <div className="text-blue-300 text-sm mt-2">
          Preparing your shopping cart...
        </div>
      </div>
    );
  }
  
  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <Link to="/" className="back-link">
          <FaArrowLeft /> Continue Shopping
        </Link>
        <h1>Checkout</h1>
      </div>
      
      <div className="checkout-content">
        <div className="checkout-items">
          <h2>Your Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})</h2>
          
          {cart.map(item => (
            <div key={item.id} className="cart-item">
              <div className="item-image">
                <img src={item.imageUrl} alt={item.title} />
              </div>
              
              <div className="item-details">
                <h3>{item.title}</h3>
                <p className="item-price">{currency} {(item.price || 0).toFixed(2)}</p>
                
                <div className="item-actions">
                  <div className="quantity-controls">
                    <button 
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <FaMinus />
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => handleQuantityChange(item.id, item.quantity + 1)}>
                      <FaPlus />
                    </button>
                  </div>
                  
                  <button 
                    className="remove-button"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <FaTrashAlt /> Remove
                  </button>
                </div>
              </div>
              
              <div className="item-total">
                {currency} {((item.price || 0) * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
          
          <div className="discount-section">
            <input
              type="text"
              placeholder="Discount code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              disabled={discountApplied}
            />
            <button 
              onClick={applyDiscount}
              disabled={discountApplied || !discountCode}
            >
              Apply
            </button>
          </div>
          
          {/* Currency selection */}
          <div className="currency-selector">
            <label htmlFor="currency">Currency</label>
            <select 
              id="currency" 
              value={currency}
              onChange={(e) => {
                const newCurrency = e.target.value;
                setCurrency(newCurrency);
                console.log('Currency changed to:', newCurrency);
                
                // Check and toggle payment methods based on currency
                if (paymentMethod === PAYMENT_METHODS.SEPA || paymentMethod === PAYMENT_METHODS.IDEAL) {
                  if (newCurrency !== 'EUR') {
                    // If currently using SEPA/iDEAL but changed away from EUR, switch to card
                    setPaymentMethod(PAYMENT_METHODS.CARD);
                    toast.info(`Switched to card payment as ${getPaymentMethodName(paymentMethod)} requires EUR`);
                  }
                }
              }}
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="INR">INR - Indian Rupee</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="AUD">AUD - Australian Dollar</option>
              <option value="JPY">JPY - Japanese Yen</option>
            </select>
          </div>
        </div>
        
        <div className="checkout-summary">
          <h2>Order Summary</h2>
          
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{currency} {(cartTotal || 0).toFixed(2)}</span>
          </div>
          
          {discountApplied && (
            <div className="summary-row discount">
              <span>Discount</span>
              <span>-{currency} {(discountAmount || 0).toFixed(2)}</span>
            </div>
          )}
          
          <div className="summary-row">
            <span>
              VAT {vatRate > 0 ? `(${vatRate * 100}%)` : ''}
              {vatRate === 0 && (
                <span className="info-icon">
                  <FaInfoCircle title="No VAT for US customers" />
                </span>
              )}
            </span>
            <span>{currency} {(vatAmount || 0).toFixed(2)}</span>
          </div>
          
          <div className="summary-row total">
            <span>Total</span>
            <span>{currency} {(finalTotal || 0).toFixed(2)}</span>
          </div>
          
          {/* Payment method toggle */}
          <div className="payment-methods-container">
            <h3>Choose Payment Method</h3>
            
            {paymentMethodsLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <HashLoader color="#4FD1C5" size={50} speedMultiplier={0.8} />
                <p className="mt-4 text-center text-gray-600">Loading payment options...</p>
              </div>
            ) : (
            <div className="payment-methods grid grid-cols-3 gap-4">
              {/* First Row: Card, SEPA, iDEAL */}
              <div 
                className={`payment-method-toggle ${paymentMethod === PAYMENT_METHODS.CARD ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange(PAYMENT_METHODS.CARD)}
              >
                <div className="method-icon">{renderPaymentMethodIcon(PAYMENT_METHODS.CARD)}</div>
                <span>Card</span>
              </div>
              
              <div 
                className={`payment-method-toggle ${paymentMethod === PAYMENT_METHODS.SEPA ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange(PAYMENT_METHODS.SEPA)}
              >
                <div className="method-icon">{renderPaymentMethodIcon(PAYMENT_METHODS.SEPA)}</div>
                <span>SEPA</span>
              </div>
              
              <div 
                className={`payment-method-toggle ${paymentMethod === PAYMENT_METHODS.IDEAL ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange(PAYMENT_METHODS.IDEAL)}
              >
                <div className="method-icon">{renderPaymentMethodIcon(PAYMENT_METHODS.IDEAL)}</div>
                <span>iDEAL</span>
              </div>
              
              {/* Second Row: PayPal, Google Pay, Apple Pay */}
              <div 
                className={`payment-method-toggle ${paymentMethod === PAYMENT_METHODS.PAYPAL ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange(PAYMENT_METHODS.PAYPAL)}
              >
                <div className="method-icon">{renderPaymentMethodIcon(PAYMENT_METHODS.PAYPAL)}</div>
                <span>PayPal</span>
              </div>
              
              <div 
                className={`payment-method-toggle ${paymentMethod === PAYMENT_METHODS.GOOGLE_PAY ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange(PAYMENT_METHODS.GOOGLE_PAY)}
              >
                <div className="method-icon">{renderPaymentMethodIcon(PAYMENT_METHODS.GOOGLE_PAY)}</div>
                <span>Google Pay</span>
              </div>

              <div 
                className={`payment-method-toggle ${paymentMethod === PAYMENT_METHODS.APPLE_PAY ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange(PAYMENT_METHODS.APPLE_PAY)}
              >
                <div className="method-icon">{renderPaymentMethodIcon(PAYMENT_METHODS.APPLE_PAY)}</div>
                <span>Apple Pay</span>
              </div>
              
              {/* Third Row: Crypto (centered) */}
              <div className="col-span-3 flex justify-center">
                <div 
                  className={`payment-method-toggle ${paymentMethod === PAYMENT_METHODS.CRYPTO ? 'active' : ''}`}
                  onClick={() => handlePaymentMethodChange(PAYMENT_METHODS.CRYPTO)}
                  style={{ width: '33%' }}
                >
                  <div className="method-icon">{renderPaymentMethodIcon(PAYMENT_METHODS.CRYPTO)}</div>
                  <span>Crypto</span>
                </div>
              </div>
            </div>
            )}
          </div>
          
          {/* Common customer information */}
          {paymentMethodsLoading ? (
            <div className="payment-method-loading mt-8 flex flex-col items-center justify-center py-6">
              <HashLoader color="#4FD1C5" size={40} speedMultiplier={0.8} />
              <p className="mt-4 text-center text-gray-600">Preparing payment form...</p>
            </div>
          ) : (
            paymentMethod !== PAYMENT_METHODS.GOOGLE_PAY && 
           paymentMethod !== PAYMENT_METHODS.APPLE_PAY && 
           paymentMethod !== PAYMENT_METHODS.PAYPAL && 
           paymentMethod !== PAYMENT_METHODS.SEPA && (
            <>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Your email address"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="cardName">Name on Card</label>
                <input
                  type="text"
                  id="cardName"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  required
                  placeholder="Full name as it appears on card"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="country">Country</label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    // Update payment methods based on country
                    let code = 'US';
                    if (e.target.value === 'United States') code = 'US';
                    else if (e.target.value === 'United Kingdom') code = 'GB';
                    else if (e.target.value === 'India') code = 'IN';
                    else if (e.target.value === 'Germany') code = 'DE';
                    else if (e.target.value === 'France') code = 'FR';
                    else if (e.target.value === 'Netherlands') code = 'NL';
                    setCountryCode(code);
                    setAvailablePaymentMethods(getPaymentMethodsForCountry(code));
                  }}
                  required
                >
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Netherlands">Netherlands</option>
                  <option value="Belgium">Belgium</option>
                  <option value="India">India</option>
                  <option value="Japan">Japan</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="zipCode">Zip/Postal Code</label>
                <input
                  type="text"
                  id="zipCode"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  required
                  placeholder="Your postal code"
                />
              </div>
            </>
            )
          )}
          
          {/* Payment method specific forms */}
          {paymentMethod === PAYMENT_METHODS.PAYPAL && (
            <div className="paypal-container payment-method-focus">
              <h3>PayPal Checkout</h3>
              <p>Complete your payment quickly and securely with PayPal:</p>
              {/* 
                PRODUCTION MIGRATION:
                - Update PayPalScriptProvider with production client ID
                - Verify webhook and IPN endpoints for production
                - Enable production-appropriate logging and error handling
              */}
              {isPending ? (
                <div className="paypal-loading">Loading PayPal buttons...</div>
              ) : (
                <>
                  <PayPalButtons
                    style={{
                      layout: 'vertical',
                      color: 'blue',
                      shape: 'rect',
                      label: 'pay',
                      height: 40,
                    }}
                    disabled={isSubmitting}
                    forceReRender={[finalTotal, currency]}
                    createOrder={createPaypalOrder}
                    onApprove={onPayPalApprove}
                    onError={(err) => {
                      console.error('PayPal error:', err);
                      toast.error('PayPal encountered an error. Please try again or use a different payment method.');
                      setIsSubmitting(false);
                    }}
                    onCancel={() => {
                      toast.info('PayPal payment cancelled. Please try again or use a different payment method.');
                      setIsSubmitting(false);
                    }}
                  />
                  <div className="payment-security-note">
                    <SiPaypal size={20} style={{ marginRight: '8px' }} />
                    <span>PayPal securely processes your payment information</span>
                  </div>
                </>
              )}
              <p className="payment-info-note">
                You can pay with your PayPal account or credit/debit card via PayPal without creating an account.
              </p>
            </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.APPLE_PAY && (
            <div className="apple-pay-container payment-method-focus">
              <h3>Apple Pay Checkout</h3>
              <p>Complete your payment quickly and securely with Apple Pay:</p>
              {/* 
                PRODUCTION MIGRATION:
                - Register production domain with Apple Pay
                - Generate production merchant identity certificate
                - Update merchantIdentifier to production value
                - Ensure proper session validation on server side
              */}
              <ApplePayButton
                cartTotal={finalTotal}
                items={cart.map(item => ({
                  id: item.id,
                  title: item.title || item.name,
                  price: item.price,
                  quantity: item.quantity,
                  imageUrl: item.image || item.imageUrl
                }))}
                currency={currency}
                countryCode={countryCode}
                email={email}
                onSuccess={handlePaymentSuccess}
                onError={(error) => {
                  setIsSubmitting(false);
                  toast.error(`Apple Pay error: ${error.message || 'Unknown error'}`);
                }}
                className="w-full"
              />
              <p className="payment-info-note">
                Your order details will be securely transferred to Apple Pay.
              </p>
            </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.GOOGLE_PAY && (
            <div className="google-pay-container payment-method-focus">
              <h3>Express Card Checkout</h3>
              <p>Complete your payment quickly and securely:</p>
              
              {!isAuthenticated && (
                <div className="payment-warning">
                  <p>Please provide a valid email address to receive your order confirmation.</p>
                  <div className="email-input-container">
                    <input
                      type="email"
                      value={email || ''}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => {
                        // Only validate on blur to prevent issues while typing
                        if (email && !email.includes('@')) {
                          toast.warning('Please enter a valid email address with @ symbol');
                        }
                      }}
                      placeholder="Your email address"
                      className={email && !email.includes('@') ? 'invalid' : ''}
                    />
                    {email && !email.includes('@') && (
                      <div className="field-error">Please enter a valid email address with @ symbol</div>
                    )}
                  </div>
                </div>
              )}
              
              {(isAuthenticated || (email && email.includes('@'))) && (
                <GooglePayButton
                  cartTotal={finalTotal}
                  items={cart.map(item => ({
                    id: item.id,
                    title: item.title || item.name,
                    price: item.price,
                    quantity: item.quantity,
                    imageUrl: item.image || item.imageUrl
                  }))}
                  currency={currency}
                  countryCode={countryCode}
                  email={isAuthenticated ? user?.email : email}
                  onSuccess={handlePaymentSuccess}
                  onError={(error) => {
                    setIsSubmitting(false);
                    toast.error(`Payment error: ${error.message || 'Unknown error'}`);
                  }}
                  className="w-full"
                />
              )}
              
              <p className="payment-info-note">
                Your order details will be securely processed for immediate checkout.
              </p>
              <p className="email-note">
                <strong>Note:</strong> A valid email address is required to receive your order confirmation.
                {isAuthenticated && user?.email && (
                  <span> Using your account email: {user.email}</span>
                )}
              </p>
            </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.CARD && (
                      <div>
                        {/* 
                          PRODUCTION MIGRATION:
                          - Replace stripePromise with production key (pk_live_...)
                          - Ensure proper error handling and logging for production
                          - Update backend to use sk_live_... secret key
                          - Complete Strong Customer Authentication (SCA) compliance for production
                        */}
                        {stripeLoading ? (
                          <div className="card-element-loading">
                            <p>Loading payment form...</p>
                          </div>
                        ) : (
                          <Elements stripe={stripePromise} options={{
                            locale: 'auto',
                            currency: currency.toLowerCase(),
                            appearance: {
                              theme: 'stripe',
                              variables: {
                                colorPrimary: '#007bff',
                              },
                            },
                            loader: 'auto', // Show a loading indicator while Stripe loads
                          }}>
                            <div className="stripe-card-container">
                              <CheckoutForm
                                finalTotal={finalTotal}
                                currency={currency}
                                email={email}
                                handlePaymentSuccess={handlePaymentSuccess}
                                isSubmitting={isSubmitting}
                                setIsSubmitting={setIsSubmitting}
                                zipCode={zipCode}
                                cardName={cardName}
                              />
                            </div>
                          </Elements>
                        )}
                      </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.SEPA && (
            <div className="sepa-container payment-method-focus">
              <h3>SEPA Credit Transfer</h3>
              <p>Pay directly from your European bank account via SEPA</p>
              {/* 
                PRODUCTION MIGRATION:
                - Implement SEPA mandate management
                - Add required legal disclosures for SEPA in production
                - Consider 1-2 day settlement time in production UX
                - Ensure Stripe account is fully verified for SEPA in production
              */}
              {currency.toLowerCase() !== 'eur' ? (
                <div className="payment-warning">
                  <p>SEPA payments require EUR as the currency. Please switch to EUR to use SEPA.</p>
                  <button
                    onClick={() => setCurrency('EUR')}
                    className="currency-switch-button"
                  >
                    Switch to EUR
                  </button>
                </div>
              ) : isProcessing ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <HashLoader color="#4FD1C5" size={60} speedMultiplier={0.8} />
                  <p className="mt-4 text-center text-gray-600">Initiating SEPA transfer...</p>
                </div>
              ) : (
                <>
                  <div className="sepa-form">
                    <div className="form-group">
                      <label htmlFor="accountHolder">Account Holder Name*</label>
                      <input
                        type="text"
                        id="accountHolder"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        required
                        placeholder="Full name of the account holder"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="iban">IBAN (International Bank Account Number)*</label>
                      <input
                        type="text"
                        id="iban"
                        value={sepaIban || ''}
                        onChange={(e) => {
                          // Format and validate IBAN
                          const formattedIban = e.target.value.replace(/\s+/g, '').toUpperCase();
                          setSepaIban(formattedIban);
                          
                          // Basic IBAN validation
                          if (formattedIban.length > 4) {
                            try {
                              const { isValid } = validateIban(formattedIban);
                              setSepaIbanValid(isValid);
                              
                              // Auto-fill BIC if IBAN is valid and BIC is empty
                              if (isValid && (!sepaBic || sepaBic.trim() === '')) {
                                // Use an immediately invoked async function
                                (async () => {
                                  try {
                                    const result = await getBicFromIban(formattedIban);
                                    
                                    if (result.bic) {
                                      setSepaBic(result.bic);
                                      setSepaBicValid(true);
                                      
                                      // If BIC was automatically detected
                                      if (!result.requiresManualEntry) {
                                        toast.info(`BIC auto-detected: ${result.bic}${result.bankName ? ` (${result.bankName})` : ''}`, { 
                                          autoClose: 3000,
                                          hideProgressBar: true,
                                          position: 'bottom-right'
                                        });
                                      } 
                                      // If BIC was generated as a fallback
                                      else if (result.isGenerated) {
                                        toast.warning('BIC service unavailable. A possible BIC has been generated, but please verify it.', {
                                          autoClose: 5000,
                                          position: 'bottom-right'
                                        });
                                      }
                                    } 
                                    // If BIC could not be detected and manual entry is required
                                    else if (result.requiresManualEntry) {
                                      // Make BIC field required by showing a warning toast
                                      toast.warning(result.error || 'Please enter BIC manually.', {
                                        autoClose: 5000,
                                        position: 'bottom-right'
                                      });
                                      
                                      // Mark that manual BIC entry is required
                                      setSepaBicManualRequired(true);
                                      
                                      // Clear any previous value and set to invalid
                                      setSepaBic('');
                                      setSepaBicValid(false);
                                    }
                                  } catch (bicError) {
                                    console.error('Error auto-detecting BIC:', bicError);
                                    toast.error('Could not detect BIC. Please enter it manually.', {
                                      autoClose: 5000,
                                      position: 'bottom-right'
                                    });
                                    
                                    // Mark that manual BIC entry is required
                                    setSepaBicManualRequired(true);
                                  }
                                })();
                              }
                            } catch (error) {
                              setSepaIbanValid(false);
                            }
                          } else {
                            setSepaIbanValid(null);
                          }
                        }}
                        required
                        placeholder="e.g. DE89 3704 0044 0532 0130 00"
                        className={sepaIbanValid === false ? 'invalid' : sepaIbanValid === true ? 'valid' : ''}
                      />
                      {sepaIbanValid === false && (
                        <div className="field-error">Please enter a valid IBAN</div>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="bic">
                        BIC {sepaBicManualRequired ? '(Required)' : '(Optional for many EU countries)'}
                        {sepaBicManualRequired && <span className="required-indicator">*</span>}
                      </label>
                      <input
                        type="text"
                        id="bic"
                        value={sepaBic || ''}
                        onChange={(e) => {
                          // Format and validate BIC
                          const formattedBic = e.target.value.replace(/\s+/g, '').toUpperCase();
                          setSepaBic(formattedBic);
                          
                          // Basic BIC validation
                          if (formattedBic.length > 0) {
                            setSepaBicValid(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(formattedBic));
                          } else {
                            setSepaBicValid(null);
                          }
                        }}
                        required={sepaBicManualRequired}
                        placeholder="e.g. DEUTDEDBBER"
                        className={`${sepaBicValid === false ? 'invalid' : sepaBicValid === true ? 'valid' : ''} ${sepaBicManualRequired ? 'required-field' : ''}`}
                      />
                      {sepaBicValid === false && (
                        <div className="field-error">Please enter a valid BIC</div>
                      )}
                      {sepaBicManualRequired && !sepaBic && sepaBicValid !== false && (
                        <div className="field-info">BIC could not be auto-detected. Please enter it manually.</div>
                      )}
                    </div>
                    
                    {/* Only show email field for non-authenticated users */}
                    {!isAuthenticated && (
                      <div className="form-group">
                        <label htmlFor="sepaEmail">Email Address (For Payment Confirmation)</label>
                        <input
                          type="email"
                          id="sepaEmail"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Your email address for payment confirmation"
                          className={email && !email.includes('@') ? 'invalid' : ''}
                        />
                        {email && !email.includes('@') && (
                          <div className="field-error">Please enter a valid email address</div>
                        )}
                      </div>
                    )}
                    
                    <div className="sepa-reference-container">
                      <div className="reference-title">Payment Details:</div>
                      <div className="reference-item">
                        <span className="reference-label">Amount:</span>
                        <span className="reference-value">{currency.toUpperCase()} {(finalTotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="reference-item">
                        <span className="reference-label">Reference:</span>
                        <span className="reference-value">{orderReference}</span>
                      </div>
                      <div className="reference-item">
                        <span className="reference-label">Recipient:</span>
                        <span className="reference-value">AI Wave Rider Ltd</span>
                      </div>
                    </div>
                    
                    <div className="sepa-consent-container">
                      <div className="consent-wrapper">
                        <input
                          type="checkbox"
                          id="sepaConsent"
                          checked={sepaConsent || false}
                          onChange={(e) => setSepaConsent(e.target.checked)}
                          required
                        />
                        <label htmlFor="sepaConsent">
                          I authorize the initiation of a SEPA Credit Transfer for the amount shown above and confirm that the IBAN and account holder details are correct.
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleSepaPayment}
                    className="pay-button"
                    disabled={isSubmitting || 
                              !cardName || 
                              !sepaIban || 
                              sepaIbanValid === false || 
                              (sepaBicManualRequired && (!sepaBic || sepaBicValid === false)) || 
                              !sepaConsent ||
                              (!isAuthenticated && email && !email.includes('@'))} // Only validate email if it's provided
                  >
                    {isSubmitting ? 'Processing...' : `Initiate SEPA Transfer`}
                  </button>
                  <p className="payment-info-note">
                    SEPA Credit Transfers typically take 1-2 business days to complete. You'll receive confirmation by email once the payment is processed.
                  </p>
                </>
              )}
            </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.IDEAL && (
            <div className="ideal-container">
              <p>Pay with iDEAL (Netherlands)</p>
              {/* 
                PRODUCTION MIGRATION:
                - Ensure proper bank selection interface is implemented
                - Add required iDEAL legal disclosures for production
                - Update webhook handlers to properly process iDEAL notifications
                - Verify Stripe account is approved for iDEAL in production
              */}
              {currency.toLowerCase() !== 'eur' ? (
                <div className="payment-warning">
                  <p>iDEAL payments require EUR as the currency. Please switch to EUR to use iDEAL.</p>
                  <button
                    onClick={() => setCurrency('EUR')}
                    className="currency-switch-button"
                  >
                    Switch to EUR
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={handleIdealPayment}
                    className="pay-button"
                    disabled={isSubmitting || !email || !cardName}
                  >
                    {isSubmitting ? 'Processing...' : `Pay with iDEAL`}
                  </button>
                  <p className="payment-info-note">
                    You'll be redirected to your bank to complete payment.
                  </p>
                </>
              )}
            </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.UPI && (
            <div className="upi-container">
              <p>Pay with UPI (India):</p>
              {/* 
                PRODUCTION MIGRATION:
                - Complete NPCI compliance if using direct integration
                - Implement proper VPA validation
                - Update to production UPI endpoints
                - Add appropriate transaction reference IDs for production
              */}
              <button 
                onClick={handleUpiPayment}
                className="pay-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : `Pay ${currency} ${(finalTotal || 0).toFixed(2)} with UPI`}
              </button>
              <p className="payment-info-note">
                You will be asked to enter your UPI ID or scan a QR code.
              </p>
            </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.CRYPTO && (
            <div className="crypto-container">
              <p>Pay with cryptocurrency:</p>
              {/* 
                PRODUCTION MIGRATION:
                - Update to production API keys for crypto processor
                - Implement proper exchange rate handling for production
                - Create clear refund policy for crypto payments
                - Set up production webhook endpoints
              */}
              <div className="crypto-options">
                <span>BTC</span>
                <span>ETH</span>
                <span>USDC</span>
                <span>+more</span>
              </div>
              <button 
                onClick={handleCryptoPayment}
                className="pay-button crypto-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : `Pay with Crypto`}
              </button>
              <p className="payment-info-note">
                You'll be redirected to BitPay to complete your cryptocurrency payment.
              </p>
            </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.AFTERPAY && (
            <div className="afterpay-container">
              <p>Pay in 4 interest-free installments:</p>
              {/* 
                PRODUCTION MIGRATION:
                - Complete Stripe verification for Afterpay/Clearpay
                - Update to production Stripe keys
                - Add required legal disclosures for installment payments
                - Implement proper handling for regional differences (Afterpay vs Clearpay)
              */}
              <button 
                onClick={handleAfterpayPayment}
                className="pay-button afterpay-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : `Pay with ${countryCode === 'GB' ? 'Clearpay' : 'Afterpay'}`}
              </button>
              <div className="afterpay-installments">
                <p>4 payments of {currency} {((finalTotal || 0) / 4).toFixed(2)}</p>
              </div>
              <p className="payment-info-note">
                You'll be redirected to complete your {countryCode === 'GB' ? 'Clearpay' : 'Afterpay'} payment.
              </p>
            </div>
          )}
          
          <div className="form-group checkbox newsletter-checkbox">
            <input
              type="checkbox"
              id="newsletter"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
            />
            <label htmlFor="newsletter">
              Subscribe to our newsletter for updates and exclusive offers
            </label>
          </div>
          
          <p className="security-note">
            <small>
              Your payment information is secured with industry-standard encryption.
              We do not store your full payment details.
            </small>
          </p>
          
          <div className="payment-badges">
            <SiStripe size={32} title="Powered by Stripe" />
            <span className="secure-badge">SSL Secured</span>
            <span className="pci-badge">PCI DSS Compliant</span>
          </div>
        </div>
      </div>
      
      {/* Add the recommendations component at the end */}
      {showRecommendations && paymentCompleted && (
        <PaymentSuccessRecommendations 
          purchasedItems={cart}
          currency={currency}
          limit={3}
        />
      )}
      
      {!paymentCompleted && cart.length > 0 && (
        <PaymentSuccessRecommendations 
          purchasedItems={[cart[0]]}
          currency={currency}
          limit={3}
        />
      )}
    </div>
  );
};

export default Checkout; 