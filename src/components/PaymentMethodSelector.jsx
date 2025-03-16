import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import GooglePayButton from './GooglePayButton';
import ApplePayButton from './ApplePayButton';
import { createStripeCheckout } from '../services/paymentApi';

const PaymentMethodSelector = ({
  cartTotal,
  items,
  email,
  onSuccess,
  onError,
  className = ''
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
  
  return (
    <div className={`payment-method-selector ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Select Payment Method</h3>
      
      <form onSubmit={handlePaymentSubmit}>
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
          <button
            type="submit"
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
      </form>
    </div>
  );
};

export default PaymentMethodSelector; 