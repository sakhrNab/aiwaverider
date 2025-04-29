const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * PAYMENT SYSTEM MIGRATION TO PRODUCTION
 * ======================================
 * 
 * This file contains server-side payment route handlers. Below are the necessary steps
 * to migrate from test to production:
 * 
 * 1. STRIPE API KEYS
 *    - Replace the test secret key with a production key from your Stripe dashboard
 *    - Set STRIPE_SECRET_KEY in your production environment to your "sk_live_..." key
 *    - Ensure you NEVER commit live API keys to your repository
 *    - Consider using a secrets manager service for production keys
 * 
 * 2. WEBHOOK HANDLING
 *    - Create a new webhook endpoint in your Stripe dashboard pointing to your production URL:
 *      https://your-production-domain.com/api/payments/stripe-webhook
 *    - Set the new webhook signing secret as STRIPE_WEBHOOK_SECRET in your production environment
 *    - Test your webhook with the Stripe CLI using your live webhook secret:
 *      stripe listen --forward-to your-production-domain.com/api/payments/stripe-webhook
 * 
 * 3. PAYMENT PROCESSING
 *    - The logic in the test and production environments is the same, but ensure:
 *      - Error logging is properly set up for production
 *      - Proper monitoring is established to track payment failures
 *      - Financial reconciliation processes are in place
 * 
 * 4. SUPPORTED PAYMENT METHODS
 *    - Verify that all payment methods you're using are activated in your Stripe dashboard
 *    - Some payment methods may require additional application forms or verification:
 *      - SEPA Direct Debit requires a registered SEPA Creditor ID
 *      - iDEAL requires activation and potentially additional verification
 *      - ACH, Alipay, and other methods may have unique requirements
 * 
 * 5. SECURITY CONSIDERATIONS
 *    - Ensure PCI compliance requirements are met for your level of processing
 *    - Set up fraud detection tools like Stripe Radar or configure risk rules
 *    - Implement proper logging of sensitive operations (without logging card details)
 *    - Ensure you're storing no sensitive payment details in your own database
 * 
 * 6. TESTING BEFORE GOING LIVE
 *    - Perform test transactions using Stripe's test clock feature
 *    - Test the complete user journey in staging with both successful and failed payments
 *    - Test refund and dispute handling processes
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51R2ydLCWt3snxVwEJxJQNsGNifhLhfQrJEBJgPPr9W4dRDfbjh11FvYLrxQ');
const logger = require('../utils/logger');
const orderController = require('../controllers/orderController');
const notificationService = require('../utils/notificationService');
const { db } = require('../config/firebase');

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
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?payment_id=${uuidv4()}&status=success&type=paypal_order`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout?canceled=true`
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
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, successUrl, cancelUrl, customerId, metadata = {} } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty items array' });
    }
    
    // Create line items for the checkout session
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.image ? [item.image] : [],
        },
        unit_amount: formatAmountForStripe(item.price, 'usd'),
      },
      quantity: item.quantity || 1,
    }));
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer: customerId || undefined,
      success_url: successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?payment_id={CHECKOUT_SESSION_ID}&status=success&type=checkout_session`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout?canceled=true`,
      metadata: {
        ...metadata,
        order_id: uuidv4()
      },
    });
    
    logPayment('STRIPE', 'CHECKOUT_SESSION_CREATED', { id: session.id });
    return res.json({ id: session.id, url: session.url });
  } catch (error) {
    logPayment('STRIPE', 'CHECKOUT_SESSION_FAILED', null, error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
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
  
  // Redirect to the new checkout success page with the session_id
  const redirectUrl = `${frontendUrl}/checkout/success?payment_id=${session_id}&status=success&type=checkout_session`;
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
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?payment_id={PAYMENT_INTENT_ID}&status=success&type=payment_intent`,
      metadata: {
        order_id: uuidv4(),
        email: email || 'anonymous',
        items: JSON.stringify(items)
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
      
      // Prepare the redirect URL
      const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?payment_id=${paymentIntent.id}&status=success&type=payment_intent`;
      
      return res.json({
        success: true,
        orderId,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
        redirectUrl: successUrl
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
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?payment_id={PAYMENT_INTENT_ID}&status=success&type=payment_intent`,
      metadata: {
        order_id: uuidv4(),
        email: email || 'anonymous',
        items: JSON.stringify(items)
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
      
      // Prepare the redirect URL
      const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?payment_id=${paymentIntent.id}&status=success&type=payment_intent`;
      
      return res.json({
        success: true,
        orderId,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
        redirectUrl: successUrl
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

// Stripe webhook handler
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    logPayment('STRIPE', 'WEBHOOK_SIGNATURE_FAILED', null, err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Log the successful payment
      logPayment('STRIPE', 'PAYMENT_SUCCEEDED', { id: paymentIntent.id });
      
      try {
        // Get cart items from metadata or fetch them based on the order ID
        const metadata = paymentIntent.metadata || {};
        const orderId = metadata.order_id || uuidv4();
        logger.info(`Processing payment intent with order ID: ${orderId}`);
        
        // Try to retrieve items from metadata
        let items = [];
        try {
          if (metadata.items) {
            items = JSON.parse(metadata.items);
          } else if (metadata.cart_id) {
            // Fetch cart items from database using cart_id
            items = await fetchCartItemsFromDatabase(metadata.cart_id);
          }
        } catch (parseError) {
          logger.error(`Error parsing items metadata: ${parseError.message}`, parseError);
        }
        
        // Process the payment and deliver agent templates
        const result = await orderController.processPaymentSuccess({
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          payment_method_types: paymentIntent.payment_method_types,
          metadata: {
            ...metadata,
            order_id: orderId // Ensure the orderId is passed to the controller
          },
          customer: paymentIntent.customer ? {
            id: paymentIntent.customer,
            email: metadata.email // Use email from metadata if available
          } : null,
          items: items
        });
        
        // Log success with the order ID from the result
        logger.info(`Order processed successfully: ${result.orderId}`, {
          orderId: result.orderId, // Include orderId in the log data
          deliveryStatus: result.deliveryStatus,
          successCount: result.deliveryResults?.filter(r => r.success).length || 0,
          failureCount: result.deliveryResults?.filter(r => !r.success).length || 0
        });
        
        // If we have a notification service, send a success notification
        try {
          if (process.env.ENABLE_NOTIFICATIONS !== 'false' && metadata.email) {
            logger.info(`Sending order success notification for order: ${result.orderId}`);
            
            // Send order success notification
            await notificationService.sendOrderSuccessNotification({
              orderId: result.orderId,
              email: metadata.email,
              userId: metadata.userId,
              items: items,
              orderTotal: paymentIntent.amount / 100, // Convert cents to dollars
              agent: items.length === 1 ? items[0] : null
            });
          }
        } catch (notificationError) {
          logger.error(`Failed to send notification for order ${result.orderId}: ${notificationError.message}`);
          // Non-critical error, don't throw
        }
      } catch (error) {
        logger.error(`Error processing order after payment: ${error.message}`, error);
      }
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      // Handle failed payment
      logPayment('STRIPE', 'PAYMENT_FAILED', { id: failedPayment.id });
      break;
    case 'checkout.session.completed':
      const session = event.data.object;
      // Fulfill the purchase
      logPayment('STRIPE', 'CHECKOUT_COMPLETED', { id: session.id });
      
      try {
        // Extract orderId from metadata
        const metadata = session.metadata || {};
        const orderId = metadata.order_id || uuidv4();
        logger.info(`Processing checkout session with order ID: ${orderId}`);
        
        // Get line items from the checkout session
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const items = lineItems.data.map(item => ({
          id: item.price?.product || item.price?.id || uuidv4(),
          name: item.description,
          price: item.price?.unit_amount / 100,
          quantity: item.quantity || 1
        }));
        
        // Process the payment and deliver agent templates
        const result = await orderController.processPaymentSuccess({
          id: session.id,
          amount: session.amount_total,
          currency: session.currency,
          payment_method_types: [session.payment_method_types?.[0] || 'card'],
          metadata: {
            ...metadata,
            order_id: orderId // Ensure the orderId is passed to the controller
          },
          customer: session.customer ? {
            id: session.customer,
            email: session.customer_email || session.customer_details?.email
          } : null,
          items: items
        });
        
        // Log success with the order ID from the result
        logger.info(`Checkout order processed successfully: ${result.orderId}`, {
          orderId: result.orderId, // Include orderId in the log data
          deliveryStatus: result.deliveryStatus,
          successCount: result.deliveryResults?.filter(r => r.success).length || 0,
          failureCount: result.deliveryResults?.filter(r => !r.success).length || 0
        });
        
        // If we have a notification service, send a success notification
        try {
          // This could be an internal notification service or a third-party service
          if (process.env.ENABLE_NOTIFICATIONS !== 'false' && (metadata.email || session.customer_email || session.customer_details?.email)) {
            // Get the customer email from various possible sources
            const customerEmail = metadata.email || session.customer_email || session.customer_details?.email;
            logger.info(`Sending order success notification for order: ${result.orderId} to ${customerEmail}`);
            
            // Send order success notification
            await notificationService.sendOrderSuccessNotification({
              orderId: result.orderId,
              email: customerEmail,
              userId: metadata.userId,
              items: items,
              orderTotal: session.amount_total / 100, // Convert cents to dollars
              agent: items.length === 1 ? items[0] : null
            });
          }
        } catch (notificationError) {
          logger.error(`Failed to send notification for order ${result.orderId}: ${notificationError.message}`);
          // Non-critical error, don't throw
        }
      } catch (error) {
        logger.error(`Error processing order after checkout: ${error.message}`, error);
      }
      break;
    default:
      // Unexpected event type
      logPayment('STRIPE', `UNHANDLED_EVENT_${event.type}`, { id: event.id });
  }
  
  // Return a 200 response to acknowledge receipt of the event
  res.status(200).send({ received: true });
});

/**
 * Fetch cart items from database
 * @param {string} cartId - Cart ID
 * @returns {Promise<Array>} - Cart items
 */
const fetchCartItemsFromDatabase = async (cartId) => {
  try {
    if (!cartId) {
      logger.warn('No cart ID provided to fetchCartItemsFromDatabase');
      return [];
    }
    
    logger.info(`Fetching cart items for cart_id: ${cartId}`);
    
    // Try to find cart in Firestore - first check the carts collection
    const cartDoc = await db.collection('carts').doc(cartId).get();
    
    if (cartDoc.exists) {
      const cartData = cartDoc.data();
      logger.info(`Found cart in 'carts' collection: ${cartId}, items: ${cartData.items?.length || 0}`);
      return Array.isArray(cartData.items) ? cartData.items : [];
    }
    
    // If not found in carts collection, check if it's stored in userCarts subcollection
    // Some implementations store carts under user documents
    const userCartsQuery = await db.collectionGroup('userCarts')
      .where('id', '==', cartId)
      .limit(1)
      .get();
    
    if (!userCartsQuery.empty) {
      const cartData = userCartsQuery.docs[0].data();
      logger.info(`Found cart in 'userCarts' subcollection: ${cartId}, items: ${cartData.items?.length || 0}`);
      return Array.isArray(cartData.items) ? cartData.items : [];
    }
    
    // As a last resort, check if it's a userId instead of cartId (some implementations store the cart directly on the user)
    const userDoc = await db.collection('users').doc(cartId).get();
    
    if (userDoc.exists && userDoc.data().cart) {
      const userData = userDoc.data();
      logger.info(`Found cart in 'users' collection: ${cartId}, items: ${userData.cart.items?.length || 0}`);
      return Array.isArray(userData.cart.items) ? userData.cart.items : [];
    }
    
    logger.warn(`Cart not found for cart_id: ${cartId}`);
    return [];
  } catch (error) {
    logger.error(`Error fetching cart items from database: ${error.message}`, error);
    return [];
  }
};

module.exports = router; 