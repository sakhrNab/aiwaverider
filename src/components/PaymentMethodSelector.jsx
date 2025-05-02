import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import GooglePayButton from './GooglePayButton';
import ApplePayButton from './ApplePayButton';
import { createStripeCheckout, createPaymentIntent } from '../services/paymentApi';
import { SiVisa, SiMastercard, SiAmericanexpress } from 'react-icons/si';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe with publishable key
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = loadStripe(stripeKey);

// Card Element Form Component
const CardPaymentForm = ({ amount, currency, email, onPaymentSuccess, onPaymentError, disabled, paymentMethodType = 'card', items = [], userId = null }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      setError('Payment system is still loading. Please try again in a moment.');
      return;
    }
    
    setProcessing(true);
    
    try {
      // Create payment intent on the server with metadata for email notification
      const { clientSecret, orderId } = await createPaymentIntent({
        amount,
        currency: currency.toLowerCase(),
        email,
        paymentMethodTypes: [paymentMethodType],
        metadata: {
          items: items,
          userId: userId,
          process_immediately: true, // Flag to process the order immediately
          userEmail: email,
          country: navigator.language || 'en-US'
        }
      });
      
      // Confirm the payment with the card details
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { email }
        }
      });
      
      if (result.error) {
        setError(result.error.message);
        if (onPaymentError) onPaymentError(result.error);
      } else if (result.paymentIntent.status === 'succeeded') {
        // Pass the orderId in the success handler
        if (onPaymentSuccess) onPaymentSuccess({
          ...result.paymentIntent,
          orderId: orderId
        });
      }
    } catch (err) {
      setError(err.message || 'Payment processing failed');
      if (onPaymentError) onPaymentError(err);
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="card-payment-form">
      <div className="card-element-container">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': { color: '#aab7c4' }
              },
              invalid: { color: '#9e2146' }
            },
            hidePostalCode: true
          }}
        />
      </div>
      
      {error && <div className="card-error">{error}</div>}
      
      <div className="card-brands mt-2 flex space-x-2">
        <SiVisa size={24} />
        <SiMastercard size={24} />
        <SiAmericanexpress size={24} />
      </div>
      
      <button 
        type="submit" 
        disabled={processing || disabled || !stripe}
        className={`pay-button mt-4 w-full ${processing || disabled ? 'opacity-60' : ''}`}
      >
        {processing ? 'Processing...' : `Pay ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency
        }).format(amount)}`}
      </button>
    </form>
  );
};

const PaymentMethodSelector = ({
  cartTotal,
  items,
  email,
  onSuccess,
  onError,
  className = '',
  userId = null
}) => {
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [isLoading, setIsLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('US');
  const [currency, setCurrency] = useState('usd');
  
  // Detect user's country and set appropriate currency
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.country_code) {
          setCountryCode(data.country_code);
          
          // Set currency based on country
          switch (data.country_code) {
            case 'GB':
              setCurrency('gbp');
              break;
            case 'DE':
            case 'FR':
            case 'IT':
            case 'ES':
            case 'NL':
            case 'BE':
              setCurrency('eur');
              break;
            default:
              setCurrency('usd');
          }
        }
      } catch (error) {
        console.error('Error detecting country:', error);
      }
    };
    
    detectCountry();
  }, []);
  
  const handlePaymentMethodChange = (e) => {
    setSelectedMethod(e.target.value);
  };
  
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!cartTotal || cartTotal <= 0) {
      toast.error('Invalid cart total');
      return;
    }
    
    if (!items || items.length === 0) {
      toast.error('No items in cart');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Determine payment method types based on selection
      let paymentMethodTypes = ['card']; // Default to card
      
      if (selectedMethod === 'sepa') {
        paymentMethodTypes = ['sepa_debit'];
      } else if (selectedMethod === 'ideal') {
        paymentMethodTypes = ['ideal'];
      }
      
      const response = await createStripeCheckout({
        cartTotal,
        items,
        currency,
        countryCode,
        email,
        paymentMethodTypes
      });
      
      if (response && response.url) {
        window.location.href = response.url;
        if (onSuccess) onSuccess(response);
      } else if (response && response.clientSecret) {
        // Handle direct payment intents (if the API returns a client secret instead of URL)
        toast.success('Payment initiated. Please complete the process.');
        if (onSuccess) onSuccess(response);
      } else {
        throw new Error('Invalid response from payment server');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(`Payment failed: ${error.message || 'Unknown error'}`);
      if (onError) onError(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle card payment success
  const handleCardPaymentSuccess = (paymentIntent) => {
    toast.success('Payment successful!');
    if (onSuccess) onSuccess({ id: paymentIntent.id, status: 'succeeded' });
  };
  
  // Handle card payment error
  const handleCardPaymentError = (error) => {
    toast.error(`Payment failed: ${error.message || 'Unknown error'}`);
    if (onError) onError(error);
  };
  
  // Function that renders the card payment option
  const renderCardPayment = () => {
    return (
      <div className="card-payment-container">
        <Elements stripe={stripePromise}>
          <CardPaymentForm
            amount={cartTotal}
            currency={currency}
            email={email}
            onPaymentSuccess={handleCardPaymentSuccess}
            onPaymentError={handleCardPaymentError}
            disabled={isLoading}
            paymentMethodType={selectedMethod}
            items={items}
            userId={userId}
          />
        </Elements>
      </div>
    );
  };
  
  return (
    <div className={`payment-method-selector ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Select Payment Method</h3>
      
      <div className="space-y-4 mb-6">
        <div className="flex flex-col space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={selectedMethod === 'card'}
              onChange={handlePaymentMethodChange}
              className="form-radio"
            />
            <span>Credit/Debit Card</span>
          </label>
          
          {countryCode === 'NL' || countryCode === 'BE' || countryCode === 'DE' && (
            <>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="ideal"
                  checked={selectedMethod === 'ideal'}
                  onChange={handlePaymentMethodChange}
                  className="form-radio"
                />
                <span>iDEAL</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="sepa"
                  checked={selectedMethod === 'sepa'}
                  onChange={handlePaymentMethodChange}
                  className="form-radio"
                />
                <span>SEPA Direct Debit</span>
              </label>
            </>
          )}
        </div>
      </div>
      
      <div className="flex flex-col space-y-4">
        {selectedMethod === 'card' ? (
          renderCardPayment()
        ) : (
          <button
            type="button"
            onClick={handlePaymentSubmit}
            disabled={isLoading}
            className={`bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Processing...' : `Pay ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency
            }).format(cartTotal)}`}
          </button>
        )}
        
        <div className="flex flex-col space-y-2">
          <GooglePayButton
            cartTotal={cartTotal}
            items={items}
            currency={currency}
            countryCode={countryCode}
            email={email}
            onSuccess={onSuccess}
            onError={onError}
            className="w-full"
          />
          
          <ApplePayButton
            cartTotal={cartTotal}
            items={items}
            currency={currency}
            countryCode={countryCode}
            email={email}
            onSuccess={onSuccess}
            onError={onError}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelector; 