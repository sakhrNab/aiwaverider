const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');

// Diagnostic endpoint
router.get('/test', (req, res) => {
  logger.info('Payment routes test endpoint reached successfully');
  return res.status(200).json({ 
    status: 'success', 
    message: 'Payment routes are working correctly',
    timestamp: new Date().toISOString()
  });
});

// Stripe status endpoint
router.get('/stripe-status', async (req, res) => {
  try {
    // Check if Stripe is configured
    const stripeIsConfigured = !!process.env.STRIPE_SECRET_KEY;
    
    // Try to access Stripe API (lightweight check)
    let stripeApiAccessible = false;
    if (stripeIsConfigured) {
      try {
        const paymentMethods = await stripe.paymentMethods.list({
          limit: 1,
        });
        stripeApiAccessible = true;
      } catch (stripeError) {
        logger.error('Stripe API access error:', stripeError);
        stripeApiAccessible = false;
      }
    }
    
    logger.info('Stripe status check performed');
    return res.status(200).json({
      status: 'success',
      stripe: {
        configured: stripeIsConfigured,
        apiAccessible: stripeApiAccessible,
        publishableKeyLength: process.env.STRIPE_PUBLISHABLE_KEY ? process.env.STRIPE_PUBLISHABLE_KEY.length : 0,
        secretKeyLength: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.length : 0,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error checking Stripe status:', error);
    return res.status(500).json({ error: 'Failed to check Stripe status' });
  }
});

// Log helper
const logPayment = (type, action, data, error = null) => {
  const timestamp = new Date().toISOString();
  logger.info(`[${timestamp}] ${type} PAYMENT ${action}: ${error ? 'ERROR' : 'SUCCESS'}`);
  
  if (error) {
    logger.error(`Payment error details: ${error.message}`);
  }
};

// === PayPal Integration ===
// PayPal credentials from .env
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Generate an access token for PayPal API calls
async function generateAccessToken() {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_BASE_URL}/v1/oauth2/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      data: 'grant_type=client_credentials'
    });
    
    return response.data.access_token;
  } catch (error) {
    logger.error('Failed to generate PayPal access token:', error);
    throw new Error('Failed to generate PayPal access token');
  }
}

// Create a PayPal order
router.post('/create-paypal-order', async (req, res) => {
  try {
    const { cartTotal, items } = req.body;
    
    if (!cartTotal || !items || !items.length) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    const accessToken = await generateAccessToken();
    
    // Format line items for PayPal
    const lineItems = items.map(item => ({
      name: item.title || 'Product',
      unit_amount: {
        currency_code: 'USD',
        value: (item.price || 0).toFixed(2)
      },
      quantity: (item.quantity || 1).toString(),
      category: 'DIGITAL_GOODS'
    }));

    // Calculate total amount to ensure it matches
    const calculatedTotal = lineItems.reduce((sum, item) => {
      return sum + (parseFloat(item.unit_amount.value) * parseInt(item.quantity));
    }, 0);
    
    // Create order payload
    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: uuidv4(),
          amount: {
            currency_code: 'USD',
            value: calculatedTotal.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: calculatedTotal.toFixed(2)
              }
            }
          },
          items: lineItems
        }
      ],
      application_context: {
        brand_name: 'AI Wave Rider',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${req.protocol}://${req.get('host')}/thankyou`,
        cancel_url: `${req.protocol}://${req.get('host')}/checkout`
      }
    };
    
    try {
      // Make API request to create order
      const response = await axios({
        method: 'post',
        url: `${PAYPAL_BASE_URL}/v2/checkout/orders`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        data: payload
      });
      
      logPayment('PAYPAL', 'ORDER_CREATED', { id: response.data.id });
      return res.json({ id: response.data.id });
    } catch (apiError) {
      // Log detailed API error
      console.error('PayPal API Error:', apiError.response ? {
        status: apiError.response.status,
        data: apiError.response.data
      } : apiError.message);
      
      logPayment('PAYPAL', 'ORDER_CREATION_FAILED', null, apiError);
      return res.status(500).json({ error: 'Failed to create PayPal order: ' + (apiError.response?.data?.message || apiError.message) });
    }
  } catch (error) {
    logPayment('PAYPAL', 'ORDER_CREATION_FAILED', null, error);
    return res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

// Capture a PayPal payment
router.post('/capture-paypal-payment', async (req, res) => {
  try {
    const { orderID } = req.body;
    
    if (!orderID) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    const accessToken = await generateAccessToken();
    
    // Make API request to capture payment
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    // Save order details to your database here
    // ...
    
    logPayment('PAYPAL', 'PAYMENT_CAPTURED', { id: orderID, status: response.data.status });
    return res.json(response.data);
  } catch (error) {
    logPayment('PAYPAL', 'PAYMENT_CAPTURE_FAILED', { id: req.body.orderID }, error);
    return res.status(500).json({ error: 'Failed to capture PayPal payment' });
  }
});

// === Stripe Integration ===

// Helper to format amount for Stripe (converts dollars to cents)
const formatAmountForStripe = (amount, currency = 'usd') => {
  const multiplier = 100;
  return Math.round(amount * multiplier);
};

// Get supported payment methods based on country
const getPaymentMethodsForCountry = (countryCode = 'US') => {
  // Default payment methods (available everywhere)
  const methods = ['card'];
  
  // Add region-specific payment methods
  switch(countryCode) {
    case 'NL':
    case 'BE':
    case 'DE':
      methods.push('ideal'); // Netherlands, Belgium, Germany
      methods.push('sepa_debit'); // EU countries
      break;
    case 'IN':
      methods.push('upi'); // India
      break;
    case 'US':
    case 'CA':
    case 'GB':
    case 'AU':
      methods.push('afterpay_clearpay'); // US, CA, UK, AU
      break;
  }
  
  // Add globally available digital wallets
  methods.push('apple_pay', 'google_pay');
  
  return methods;
};

// Create Stripe checkout session
router.post('/create-stripe-checkout', async (req, res) => {
  try {
    const { 
      cartTotal, 
      items, 
      currency = 'usd', 
      countryCode = 'US',
      email,
      paymentMethodTypes = [],
      metadata = {}
    } = req.body;
    
    if (!cartTotal || !items || !items.length) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    // Format line items for Stripe
    const lineItems = items.map(item => ({
      price_data: {
        currency: currency.toLowerCase(),
        product_data: {
          name: item.title,
          images: item.imageUrl ? [item.imageUrl] : [],
          metadata: {
            product_id: item.id
          }
        },
        unit_amount: formatAmountForStripe(item.price, currency)
      },
      quantity: item.quantity
    }));
    
    // Get appropriate payment methods for the country
    // Use provided payment method types or fall back to country-based ones
    const payment_method_types = paymentMethodTypes.length > 0 
      ? paymentMethodTypes 
      : getPaymentMethodsForCountry(countryCode);
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/thankyou?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/checkout`,
      customer_email: email || undefined,
      payment_intent_data: {
        metadata: {
          ...metadata,
          order_id: uuidv4()
        },
        setup_future_usage: 'off_session', // Allows future reuse of payment method
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IN', 'NL', 'BE'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0, // For digital goods
              currency: currency.toLowerCase(),
            },
            display_name: 'Digital Delivery',
            delivery_estimate: {
              minimum: {
                unit: 'minute',
                value: 1,
              },
              maximum: {
                unit: 'minute',
                value: 5,
              },
            }
          }
        }
      ]
    });
    
    logPayment('STRIPE', 'SESSION_CREATED', { id: session.id });
    return res.json({ url: session.url, id: session.id });
  } catch (error) {
    logPayment('STRIPE', 'SESSION_CREATION_FAILED', null, error);
    return res.status(500).json({ error: 'Failed to create Stripe checkout session' });
  }
});

// Create a payment intent for Stripe Elements
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', paymentMethodTypes = ['card'] } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }
    
    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(amount, currency),
      currency: currency.toLowerCase(),
      payment_method_types: paymentMethodTypes,
      metadata: {
        order_id: uuidv4()
      }
    });
    
    logPayment('STRIPE', 'PAYMENT_INTENT_CREATED', { id: paymentIntent.id });
    return res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    });
  } catch (error) {
    logPayment('STRIPE', 'PAYMENT_INTENT_CREATION_FAILED', null, error);
    return res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

module.exports = router; 