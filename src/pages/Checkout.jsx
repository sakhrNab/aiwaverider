import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaInfoCircle, FaMinus, FaPlus, FaTrashAlt, FaShoppingCart, FaCreditCard, FaBitcoin, FaEuroSign, FaPaypal, FaApple, FaGooglePay } from 'react-icons/fa';
import { SiStripe, SiApple, SiVisa, SiMastercard, SiAmericanexpress, SiPaypal } from 'react-icons/si';
import { toast } from 'react-toastify';
import { useCart } from '../contexts/CartContext.jsx';
import { getRelatedProducts } from '../utils/productData';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { 
  createPayPalOrder, 
  capturePayPalPayment, 
  createStripeCheckout, 
  createPaymentIntent, 
  createCryptoPayment, 
  detectUserCountry 
} from '../services/paymentApi';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import '../styles/Checkout.css';

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
`;

// Initialize Stripe with your publishable key
// Use environment variable now that we've fixed the .env.local file
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51R2112HlDxuwLTKvZuzoJTkH5l9gKERbMTvhYVVROWdmkzcN6WzLCMvZa8j71BSeOVDtrWAYGbCfDmb8AGjKr0YS00m8aH9BD8';
console.log('Stripe key available:', !!stripeKey, 'Key length:', stripeKey ? stripeKey.length : 0);
// Added extra logging to debug
console.log('Environment variables:', {
  VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NODE_ENV: import.meta.env.NODE_ENV
});

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

// Warn if no Stripe key is available
if (!stripeKey) {
  console.warn('No Stripe publishable key available. Stripe payments will not work. Make sure VITE_STRIPE_PUBLISHABLE_KEY is set in your .env.local file.');
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
  US: [PAYMENT_METHODS.CARD, PAYMENT_METHODS.PAYPAL, PAYMENT_METHODS.APPLE_PAY, PAYMENT_METHODS.GOOGLE_PAY, PAYMENT_METHODS.AFTERPAY, PAYMENT_METHODS.CRYPTO],
  EU: [PAYMENT_METHODS.CARD, PAYMENT_METHODS.PAYPAL, PAYMENT_METHODS.SEPA, PAYMENT_METHODS.IDEAL, PAYMENT_METHODS.APPLE_PAY, PAYMENT_METHODS.GOOGLE_PAY, PAYMENT_METHODS.CRYPTO],
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
const CheckoutForm = ({ finalTotal, currency, email, handlePaymentSuccess, isSubmitting, setIsSubmitting }) => {
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
      const { clientSecret } = await createPaymentIntent({
        amount: finalTotal,
        currency: currency.toLowerCase(),
      });
      
      // Confirm the payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            email: email,
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
          handlePaymentSuccess();
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
                hidePostalCode: true,
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
        {processing ? 'Processing...' : `Pay ${currency.toUpperCase()} ${finalTotal.toFixed(2)}`}
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
  
  // Add ref for dynamic style element
  const styleRef = React.useRef(null);
  
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
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CARD);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [clientSecret, setClientSecret] = useState('');
  const [stripeLoading, setStripeLoading] = useState(false);
  
  // Calculate VAT (variable based on country)
  const vatRate = country === 'United States' ? 0 : 0.2; // 20% VAT for non-US
  const vatAmount = (cartTotal - discountAmount) * vatRate;
  
  // Calculate final total
  const finalTotal = cartTotal - discountAmount + vatAmount;
  
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
  
  // Get related products
  useEffect(() => {
    if (cart.length > 0) {
      const related = getRelatedProducts(cart[0].id, 3);
      setRelatedProducts(related);
    }
  }, [cart]);
  
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
  
  const handlePaymentSuccess = () => {
    clearCart();
    navigate('/thankyou');
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
      // SEPA requires EUR as the currency
      if (currency.toLowerCase() !== 'eur') {
        toast.error('SEPA payments require EUR as the currency. Please switch to EUR.');
        setIsSubmitting(false);
        return;
      }
      
      console.log('SEPA payment initiated with details:', {
        name: cardName,
        email: email,
        currency: currency
      });
      
      // Create a checkout session for SEPA
      const { url } = await createStripeCheckout({
        cartTotal: finalTotal,
        items: cart.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity
        })),
        currency: 'eur', // Force EUR for SEPA
        countryCode, 
        email,
        paymentMethodTypes: ['sepa_debit'],
        billingDetails: {
          name: cardName,
          email: email,
        }
      });
      
      console.log('SEPA checkout URL:', url);
      
      // Redirect to checkout
      window.location.href = url;
    } catch (error) {
      console.error('SEPA payment error:', error);
      toast.error(error.message || 'SEPA payment failed. Please try another payment method.');
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
      
      // Create a checkout session for iDEAL
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
      
      // Redirect to checkout
      window.location.href = url;
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
      // Call backend to capture funds
      await capturePayPalPayment(data.orderID);
      
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
                <p className="item-price">{currency} {item.price.toFixed(2)}</p>
                
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
                {currency} {(item.price * item.quantity).toFixed(2)}
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
            <span>{currency} {cartTotal.toFixed(2)}</span>
          </div>
          
          {discountApplied && (
            <div className="summary-row discount">
              <span>Discount</span>
              <span>-{currency} {discountAmount.toFixed(2)}</span>
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
            <span>{currency} {vatAmount.toFixed(2)}</span>
          </div>
          
          <div className="summary-row total">
            <span>Total</span>
            <span>{currency} {finalTotal.toFixed(2)}</span>
          </div>
          
          {/* Payment method toggle */}
          <div className="payment-methods-container">
            <h3>Choose Payment Method</h3>
            <div className="payment-methods">
              {availablePaymentMethods.map(method => (
                <div 
                  key={method}
                  className={`payment-method-toggle ${paymentMethod === method ? 'active' : ''}`}
                  onClick={() => handlePaymentMethodChange(method)}
                >
                  <div className="method-icon">{renderPaymentMethodIcon(method)}</div>
                  <span>{getPaymentMethodName(method)}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Common customer information */}
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
          
          {/* Payment method specific forms */}
          {paymentMethod === PAYMENT_METHODS.CARD && (
            <div>
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
                    />
                  </div>
                </Elements>
              )}
            </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.PAYPAL && (
            <div className="paypal-container">
              {isPending ? (
                <div className="paypal-loading">Loading PayPal buttons...</div>
              ) : (
                <>
                  <p>Pay with PayPal or credit/debit card via PayPal:</p>
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
            </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.SEPA && (
            <div className="sepa-container">
              <p>Pay with SEPA Direct Debit (European bank accounts only)</p>
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
              ) : (
                <>
                  <button 
                    onClick={handleSepaPayment}
                    className="pay-button"
                    disabled={isSubmitting || !email || !cardName}
                  >
                    {isSubmitting ? 'Processing...' : `Pay with SEPA Direct Debit`}
                  </button>
                  <p className="payment-info-note">
                    You'll be redirected to a secure checkout page to complete your payment.
                  </p>
                </>
              )}
            </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.IDEAL && (
            <div className="ideal-container">
              <p>Pay with iDEAL (Netherlands)</p>
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
              <button 
                onClick={handleUpiPayment}
                className="pay-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : `Pay ${currency} ${finalTotal.toFixed(2)} with UPI`}
              </button>
              <p className="payment-info-note">
                You will be asked to enter your UPI ID or scan a QR code.
              </p>
            </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.APPLE_PAY && (
            <div className="apple-pay-container">
              <p>Pay with Apple Pay for faster checkout:</p>
              <button 
                onClick={handleStripeCheckout}
                className="pay-button apple-pay-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : `Pay with Apple Pay`}
              </button>
              <p className="payment-info-note">
                You'll be redirected to a secure checkout where Apple Pay is available.
              </p>
            </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.GOOGLE_PAY && (
            <div className="google-pay-container">
              <p>Pay with Google Pay for faster checkout:</p>
              <button 
                onClick={handleStripeCheckout}
                className="pay-button google-pay-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : `Pay with Google Pay`}
              </button>
              <p className="payment-info-note">
                You'll be redirected to a secure checkout where Google Pay is available.
              </p>
            </div>
          )}
          
          {paymentMethod === PAYMENT_METHODS.CRYPTO && (
            <div className="crypto-container">
              <p>Pay with cryptocurrency:</p>
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
              <button 
                onClick={handleAfterpayPayment}
                className="pay-button afterpay-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : `Pay with ${countryCode === 'GB' ? 'Clearpay' : 'Afterpay'}`}
              </button>
              <div className="afterpay-installments">
                <p>4 payments of {currency} {(finalTotal / 4).toFixed(2)}</p>
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
      
      {relatedProducts.length > 0 && (
        <div className="related-products">
          <h2>You Might Also Like</h2>
          <div className="related-grid">
            {relatedProducts.map(product => (
              <div key={product.id} className="related-product">
                <img src={product.imageUrl} alt={product.title} />
                <h3>{product.title}</h3>
                <p>
                  {product.price > 0 
                    ? `${currency} ${product.price.toFixed(2)}` 
                    : 'Free'}
                </p>
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

export default Checkout; 