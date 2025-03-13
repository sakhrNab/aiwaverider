const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_your_test_key');
const crypto = require('crypto');

// === PayPal Integration (Existing) ===
// Your PayPal credentials - STORE THESE IN .ENV FILE in production
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'YOUR_PAYPAL_CLIENT_SECRET';
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Log helper
const logPayment = (type, action, data, error = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${type} PAYMENT ${action}: ${error ? 'ERROR' : 'SUCCESS'}`);
  
  if (error) {
    console.error(`Error details:`, error);
  }
  
  // In production, you would log to a file or database
};

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
      name: item.title,
      unit_amount: {
        currency_code: 'USD',
        value: item.price.toFixed(2)
      },
      quantity: item.quantity.toString(),
      category: 'DIGITAL_GOODS'
    }));
    
    // Create order payload
    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: uuidv4(),
          amount: {
            currency_code: 'USD',
            value: cartTotal.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: cartTotal.toFixed(2)
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

// === Stripe Integration (New) ===

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
    const payment_method_types = getPaymentMethodsForCountry(countryCode);
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/thankyou?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`,
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
            display_name: 'Digital Delivery'
          },
        },
      ],
      locale: 'auto', // Automatically adjust language based on user's browser
    });
    
    logPayment('STRIPE', 'CHECKOUT_SESSION_CREATED', { id: session.id });
    return res.json({ id: session.id, url: session.url });
  } catch (error) {
    logPayment('STRIPE', 'CHECKOUT_SESSION_FAILED', null, error);
    return res.status(500).json({ error: 'Failed to create Stripe checkout session' });
  }
});

// Create Stripe payment intent (for custom payment flows with Elements)
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { 
      amount, 
      currency = 'usd', 
      paymentMethodTypes = ['card'],
      metadata = {},
      customerId = null
    } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }
    
    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(amount, currency),
      currency: currency.toLowerCase(),
      payment_method_types: paymentMethodTypes,
      metadata: {
        ...metadata,
        order_id: uuidv4()
      },
      customer: customerId || undefined,
      setup_future_usage: customerId ? 'off_session' : undefined,
    });
    
    logPayment('STRIPE', 'PAYMENT_INTENT_CREATED', { id: paymentIntent.id });
    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    logPayment('STRIPE', 'PAYMENT_INTENT_FAILED', null, error);
    return res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment status
router.get('/payment-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'payment_intent' } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }
    
    let status, result;
    
    if (type === 'payment_intent') {
      const paymentIntent = await stripe.paymentIntents.retrieve(id);
      status = paymentIntent.status;
      result = paymentIntent;
    } else if (type === 'checkout_session') {
      const session = await stripe.checkout.sessions.retrieve(id);
      status = session.payment_status;
      result = session;
    } else {
      return res.status(400).json({ error: 'Invalid payment type' });
    }
    
    return res.json({ status, result });
  } catch (error) {
    logPayment('STRIPE', 'PAYMENT_STATUS_CHECK_FAILED', { id: req.params.id }, error);
    return res.status(500).json({ error: 'Failed to check payment status' });
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
      // Update your database with payment success
      logPayment('STRIPE', 'PAYMENT_SUCCEEDED', { id: paymentIntent.id });
      // Fulfill the order here
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
      break;
    default:
      // Unexpected event type
      logPayment('STRIPE', `UNHANDLED_EVENT_${event.type}`, { id: event.id });
  }
  
  // Return a 200 response to acknowledge receipt of the event
  res.status(200).send({ received: true });
});

// === Crypto Payment Integration via BitPay ===
// This is a simplified implementation - you would need to set up a BitPay account and get API keys

router.post('/create-crypto-payment', async (req, res) => {
  try {
    const { cartTotal, items, currency = 'USD' } = req.body;
    
    if (!cartTotal || !items || !items.length) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    // In production, you would use the BitPay SDK here with your API credentials
    // This is a mock implementation to show the general flow
    
    // Generate a unique payment ID
    const paymentId = uuidv4();
    
    // Mock BitPay API call (replace with actual BitPay SDK usage)
    const mockBitPayResponse = {
      id: `BP_${paymentId}`,
      url: `https://bitpay.com/invoice?id=${paymentId}`,
      status: 'new',
      price: cartTotal,
      currency: currency,
      expirationTime: new Date(Date.now() + 15 * 60000).toISOString(), // 15 minutes
      paymentCurrencies: ['BTC', 'ETH', 'USDC'],
      redirectURL: `${req.protocol}://${req.get('host')}/thankyou?crypto_payment_id=${paymentId}`
    };
    
    logPayment('CRYPTO', 'PAYMENT_CREATED', { id: mockBitPayResponse.id });
    return res.json(mockBitPayResponse);
  } catch (error) {
    logPayment('CRYPTO', 'PAYMENT_CREATION_FAILED', null, error);
    return res.status(500).json({ error: 'Failed to create crypto payment' });
  }
});

// Check BitPay payment status
router.get('/crypto-payment-status/:id', (req, res) => {
  // In production, you would use the BitPay SDK to check payment status
  // This is a mock implementation
  
  const { id } = req.params;
  
  // Mock payment statuses: 'new', 'paid', 'confirmed', 'complete', 'expired', 'invalid'
  // In a real implementation, you'd fetch this from BitPay's API
  const statuses = ['new', 'paid', 'confirmed', 'complete', 'expired', 'invalid'];
  const randomStatus = statuses[Math.floor(Math.random() * 3)]; // For demo, use more positive statuses
  
  return res.json({
    id,
    status: randomStatus,
    // Additional data as needed
  });
});

// Redirect handler for thank you page after payment
router.get('/thankyou', (req, res) => {
  const { session_id } = req.query;
  // Get the frontend URL (default to localhost:5173 for development)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  // Redirect to the frontend thank you page with the session_id
  const redirectUrl = `${frontendUrl}/thankyou?session_id=${session_id}`;
  console.log(`Redirecting payment success to: ${redirectUrl}`);
  
  // Log the redirect
  logPayment('STRIPE', 'REDIRECT_TO_THANKYOU', { session_id, redirectUrl });
  
  return res.redirect(redirectUrl);
});

module.exports = router; 