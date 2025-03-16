const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51R2ydLCWt3snxVwEJxJQNsGNifhLhfQrJEBJgPPr9W4dRDfbjh11FvYLrxQ');
const logger = require('../utils/logger');

// Diagnostic endpoint - always responds with 200 OK to verify route is working
router.get('/test', (req, res) => {
  logger.info('Payment routes test endpoint reached successfully');
  console.log('Payment routes test endpoint reached successfully');
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
  console.log(`[${timestamp}] ${type} PAYMENT ${action}: ${error ? 'ERROR' : 'SUCCESS'}`);
  
  if (error) {
    console.error(`Payment error details:`, error);
  }
  
  // Also log to logger if available
  if (logger) {
    logger.info(`[${timestamp}] ${type} PAYMENT ${action}: ${error ? 'ERROR' : 'SUCCESS'}`);
    if (error) {
      logger.error(`Payment error details: ${error.message}`);
    }
  }
};

// === PayPal Integration ===
// PayPal credentials from .env
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'test_client_id';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'test_client_secret';
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
    console.error('Failed to generate PayPal access token:', error);
    if (logger) logger.error('Failed to generate PayPal access token:', error);
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
    
    // For testing/development, we can mock a successful response if credentials aren't set
    if (!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === 'test_client_id') {
      console.log('Using mock PayPal order (no real credentials)');
      return res.json({ id: `MOCK-PAYPAL-ORDER-${uuidv4()}` });
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
  
  // Note: google_pay and apple_pay are not direct payment methods in Stripe
  // They are handled through the card payment method with specific configuration
  
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
      metadata = {},
      billingDetails = {}
    } = req.body;
    
    console.log(`Creating Stripe checkout session:`, {
      currency,
      countryCode,
      paymentMethodTypes,
      email: email ? 'provided' : 'not provided',
      items: items.length
    });
    
    if (logger) {
      logger.info(`Creating Stripe checkout session: ${JSON.stringify({
        currency,
        countryCode,
        paymentMethodTypes,
        email: email ? 'provided' : 'not provided'
      })}`);
    }
    
    if (!cartTotal || !items || !items.length) {
      console.error('Invalid request body for Stripe checkout');
      if (logger) logger.error('Invalid request body for Stripe checkout');
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
    let payment_method_types = paymentMethodTypes.length > 0 
      ? paymentMethodTypes 
      : getPaymentMethodsForCountry(countryCode);
      
    // Filter out unsupported payment methods like 'google_pay' and 'apple_pay'
    // These are handled through the 'card' payment method
    const validPaymentMethods = [
      'card', 'acss_debit', 'affirm', 'afterpay_clearpay', 'alipay', 
      'au_becs_debit', 'bacs_debit', 'bancontact', 'blik', 'boleto', 
      'cashapp', 'customer_balance', 'eps', 'fpx', 'giropay', 'grabpay', 
      'ideal', 'klarna', 'konbini', 'link', 'multibanco', 'oxxo', 'p24', 
      'pay_by_bank', 'paynow', 'paypal', 'pix', 'promptpay', 'sepa_debit', 
      'sofort', 'swish', 'us_bank_account', 'wechat_pay', 'revolut_pay', 
      'mobilepay', 'zip', 'amazon_pay', 'alma', 'twint', 'kr_card', 
      'naver_pay', 'kakao_pay', 'payco', 'samsung_pay'
    ];
    
    payment_method_types = payment_method_types.filter(method => 
      validPaymentMethods.includes(method)
    );
    
    // Make sure 'card' is included for Google Pay support
    if (!payment_method_types.includes('card')) {
      payment_method_types.push('card');
    }
    
    console.log(`Using payment method types: ${payment_method_types.join(', ')}`);
    if (logger) logger.info(`Using payment method types: ${payment_method_types.join(', ')}`);
    
    // For testing/development, we can mock a successful response if Stripe is not properly configured
    const stripeConfigured = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_51R2ydLCWt3snxVwEJxJQNsGNifhLhfQrJEBJgPPr9W4dRDfbjh11FvYLrxQ';
    
    if (!stripeConfigured) {
      console.log('Using mock Stripe session (no real credentials)');
      // Create a mock checkout URL that will still redirect to the thank you page
      const mockSessionId = `mock_${uuidv4()}`;
      const mockUrl = `${req.protocol}://${req.get('host')}/thankyou?session_id=${mockSessionId}`;
      
      return res.json({ 
        id: mockSessionId, 
        url: mockUrl,
        mock: true,
        message: 'Mock Stripe checkout created (using fallback due to missing credentials)'
      });
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: payment_method_types,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/thankyou?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`,
      customer_email: email || undefined,
      payment_intent_data: payment_method_types.includes('ideal') || payment_method_types.includes('sepa_debit')
        ? { metadata: { ...metadata, order_id: uuidv4() } } // For methods that don't support setup_future_usage
        : {
            metadata: { ...metadata, order_id: uuidv4() },
            setup_future_usage: 'off_session', // Only for card payments and supported methods
          },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IN', 'NL', 'BE'],
      },
      // Simplified shipping option without delivery estimates to avoid validation errors
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0,
              currency: currency.toLowerCase(),
            },
            display_name: 'Digital Delivery',
          }
        }
      ]
    });
    
    console.log(`Stripe session created successfully: ${session.id}`);
    if (logger) logger.info(`Stripe session created successfully: ${session.id}`);
    logPayment('STRIPE', 'SESSION_CREATED', { id: session.id });
    return res.json({ url: session.url, id: session.id });
  } catch (error) {
    console.error(`Stripe session creation failed: ${error.message}`);
    if (logger) logger.error(`Stripe session creation failed: ${error.message}`);
    logPayment('STRIPE', 'SESSION_CREATION_FAILED', null, error);
    
    // Enhanced error handling for better frontend debugging
    let errorMessage = 'Failed to create Stripe checkout session';
    
    // Check if it's a Stripe API error
    if (error.type && error.type.startsWith('Stripe')) {
      errorMessage += `: ${error.message}`;
      
      // Add any additional details if available
      if (error.param) {
        errorMessage += ` (invalid parameter: ${error.param})`;
      }
    } else {
      errorMessage += ': ' + error.message;
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      details: error.type ? {
        type: error.type,
        code: error.code,
        param: error.param
      } : null
    });
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

// Diagnostic endpoint for payment methods
router.get('/payment-methods', (req, res) => {
  try {
    const { countryCode = 'US' } = req.query;
    
    // Get payment methods for the specified country
    const paymentMethods = getPaymentMethodsForCountry(countryCode);
    
    // Get detailed information about available payment methods
    const methodDetails = {
      card: {
        name: 'Credit or Debit Card',
        available: true,
        requirements: ['Any country'],
        endpoint: '/api/payments/create-stripe-checkout'
      },
      ideal: {
        name: 'iDEAL',
        available: paymentMethods.includes('ideal'),
        requirements: ['Netherlands or Belgium', 'EUR currency'],
        endpoint: '/api/payments/create-stripe-checkout'
      },
      sepa_debit: {
        name: 'SEPA Direct Debit',
        available: paymentMethods.includes('sepa_debit'),
        requirements: ['EU countries', 'EUR currency'],
        endpoint: '/api/payments/create-stripe-checkout'
      },
      upi: {
        name: 'UPI',
        available: paymentMethods.includes('upi'),
        requirements: ['India'],
        endpoint: '/api/payments/create-stripe-checkout'
      },
      afterpay_clearpay: {
        name: 'Afterpay/Clearpay',
        available: paymentMethods.includes('afterpay_clearpay'),
        requirements: ['US, CA, UK, AU'],
        endpoint: '/api/payments/create-stripe-checkout'
      },
      paypal: {
        name: 'PayPal',
        available: true,
        requirements: ['Any country'],
        endpoint: '/api/payments/create-paypal-order'
      }
    };
    
    console.log(`Payment methods diagnostic for country ${countryCode}: ${paymentMethods.join(', ')}`);
    if (logger) logger.info(`Payment methods diagnostic for country ${countryCode}: ${paymentMethods.join(', ')}`);
    
    return res.status(200).json({
      status: 'success',
      countryCode,
      availablePaymentMethods: paymentMethods,
      methodDetails,
      apiEndpoints: {
        stripeCheckout: '/api/payments/create-stripe-checkout',
        paypalOrder: '/api/payments/create-paypal-order',
        diagnostic: '/api/payments/payment-methods'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in payment methods diagnostic endpoint:', error);
    if (logger) logger.error('Error in payment methods diagnostic endpoint:', error);
    return res.status(500).json({ error: 'Error getting payment methods' });
  }
});

// Test connectivity to payment APIs
router.get('/test-connectivity', async (req, res) => {
  try {
    console.log('Payment API connectivity test requested');
    
    const results = {
      stripe: {
        status: 'unknown',
        error: null
      },
      paypal: {
        status: 'unknown',
        error: null
      },
      backend: {
        status: 'connected',  // We know backend is working if this endpoint is reached
        routes: [
          '/api/payments/test',
          '/api/payments/payment-methods', 
          '/api/payments/test-connectivity',
          '/api/payments/create-stripe-checkout',
          '/api/payments/create-paypal-order'
        ]
      }
    };
    
    // Test Stripe connectivity
    try {
      // If no API key is set, report a configuration issue rather than a connection error
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_51R2ydLCWt3snxVwEJxJQNsGNifhLhfQrJEBJgPPr9W4dRDfbjh11FvYLrxQ') {
        results.stripe.status = 'not_configured';
        results.stripe.error = 'Stripe API key not configured';
      } else {
        // Try to access Stripe API (lightweight check)
        const paymentMethods = await stripe.paymentMethods.list({
          limit: 1,
        });
        results.stripe.status = 'connected';
      }
    } catch (stripeError) {
      results.stripe.status = 'error';
      results.stripe.error = stripeError.message;
      console.error('Stripe API connection test failed:', stripeError);
      if (logger) logger.error('Stripe API connection test failed:', stripeError);
    }
    
    // Test PayPal connectivity
    try {
      if (!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === 'test_client_id') {
        results.paypal.status = 'not_configured';
        results.paypal.error = 'PayPal client ID not configured';
      } else {
        const accessToken = await generateAccessToken();
        results.paypal.status = 'connected';
      }
    } catch (paypalError) {
      results.paypal.status = 'error';
      results.paypal.error = paypalError.message;
      console.error('PayPal API connection test failed:', paypalError);
      if (logger) logger.error('PayPal API connection test failed:', paypalError);
    }
    
    console.log('Payment API connectivity test results:', results);
    if (logger) logger.info('Payment API connectivity test results:', JSON.stringify(results));
    
    return res.status(200).json({
      status: 'success',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in payment connectivity test endpoint:', error);
    if (logger) logger.error('Error in payment connectivity test endpoint:', error);
    return res.status(500).json({ error: 'Error testing payment API connectivity' });
  }
});

// Redirect handler for thank you page after payment
router.get('/thankyou', (req, res) => {
  const { session_id } = req.query;
  // Get the frontend URL (default to localhost:5173 for development)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  // Redirect to the frontend thank you page with the session_id
  const redirectUrl = `${frontendUrl}/thankyou?session_id=${session_id}`;
  console.log(`Redirecting payment success to: ${redirectUrl}`);
  if (logger) logger.info(`Redirecting payment success to: ${redirectUrl}`);
  
  return res.redirect(redirectUrl);
});

// Process Google Pay payment
router.post('/process-google-pay', async (req, res) => {
  try {
    const { paymentToken, amount, currency, items, email } = req.body;
    
    if (!paymentToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing payment token' 
      });
    }
    
    // Parse the payment token (it's a JSON string)
    let paymentData;
    try {
      paymentData = JSON.parse(paymentToken);
    } catch (error) {
      console.error('Error parsing Google Pay token:', error);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payment token format' 
      });
    }
    
    // Log the payment attempt
    console.log('Processing Google Pay payment:', {
      amount,
      currency,
      email: email || 'not provided',
      items: items ? items.length : 0
    });
    
    if (logger) {
      logger.info(`Processing Google Pay payment: ${JSON.stringify({
        amount,
        currency,
        email: email ? 'provided' : 'not provided'
      })}`);
    }
    
    // Create a payment method using the token
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: paymentData.id
      }
    });
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(amount, currency),
      currency: currency.toLowerCase(),
      payment_method: paymentMethod.id,
      confirmation_method: 'manual',
      confirm: true,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/thankyou`,
      metadata: {
        order_id: uuidv4(),
        email: email || 'anonymous'
      }
    });
    
    // Check payment intent status
    if (
      paymentIntent.status === 'succeeded' ||
      paymentIntent.status === 'processing' ||
      paymentIntent.next_action
    ) {
      // Generate order ID
      const orderId = paymentIntent.metadata.order_id;
      
      return res.json({
        success: true,
        orderId,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret
      });
    } else {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }
  } catch (error) {
    console.error('Google Pay payment processing error:', error);
    if (logger) logger.error(`Google Pay payment error: ${error.message}`);
    
    // Return detailed error information
    return res.status(500).json({
      success: false,
      error: error.message || 'Payment processing failed',
      details: error.type ? {
        type: error.type,
        code: error.code,
        param: error.param
      } : undefined
    });
  }
});

// Validate Apple Pay merchant
router.post('/validate-apple-pay-merchant', async (req, res) => {
  try {
    const { validationURL } = req.body;
    
    if (!validationURL) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing validation URL' 
      });
    }
    
    console.log('Validating Apple Pay merchant with URL:', validationURL);
    if (logger) logger.info(`Validating Apple Pay merchant with URL: ${validationURL}`);
    
    // Get the merchant session from Stripe
    const merchantSession = await stripe.applePayDomains.create({
      domain_name: req.get('host')
    });
    
    return res.json({
      success: true,
      merchantSession
    });
  } catch (error) {
    console.error('Apple Pay merchant validation error:', error);
    if (logger) logger.error(`Apple Pay merchant validation error: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Merchant validation failed'
    });
  }
});

// Process Apple Pay payment
router.post('/process-apple-pay', async (req, res) => {
  try {
    const { payment, amount, currency, items, email } = req.body;
    
    if (!payment || !payment.token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing payment token' 
      });
    }
    
    // Log the payment attempt
    console.log('Processing Apple Pay payment:', {
      amount,
      currency,
      email: email || 'not provided',
      items: items ? items.length : 0
    });
    
    if (logger) {
      logger.info(`Processing Apple Pay payment: ${JSON.stringify({
        amount,
        currency,
        email: email ? 'provided' : 'not provided'
      })}`);
    }
    
    // Create a payment method using the token
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: payment.token.id
      }
    });
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(amount, currency),
      currency: currency.toLowerCase(),
      payment_method: paymentMethod.id,
      confirmation_method: 'manual',
      confirm: true,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/thankyou`,
      metadata: {
        order_id: uuidv4(),
        email: email || 'anonymous'
      }
    });
    
    // Check payment intent status
    if (
      paymentIntent.status === 'succeeded' ||
      paymentIntent.status === 'processing' ||
      paymentIntent.next_action
    ) {
      // Generate order ID
      const orderId = paymentIntent.metadata.order_id;
      
      return res.json({
        success: true,
        orderId,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret
      });
    } else {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }
  } catch (error) {
    console.error('Apple Pay payment processing error:', error);
    if (logger) logger.error(`Apple Pay payment error: ${error.message}`);
    
    // Return detailed error information
    return res.status(500).json({
      success: false,
      error: error.message || 'Payment processing failed',
      details: error.type ? {
        type: error.type,
        code: error.code,
        param: error.param
      } : undefined
    });
  }
});

module.exports = router; 