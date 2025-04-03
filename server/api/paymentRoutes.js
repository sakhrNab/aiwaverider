const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_your_test_key');
const crypto = require('crypto');
const orderController = require('../../backend/controllers/orderController');
const logger = require('../../backend/utils/logger');
const { db } = require('../../backend/config/firebase');
const notificationService = require('../../backend/utils/notificationService');

/**
 * SERVER API PAYMENT ROUTES - MIGRATION TO PRODUCTION
 * ==================================================
 * 
 * This file contains the API payment routes that handle various payment methods.
 * Follow these steps when migrating from test to production:
 * 
 * 1. API KEYS & SECRETS
 *    - Update the Stripe secret key to use your production "sk_live_..." key
 *    - Update all other payment provider credentials (PayPal, etc.) to production values
 *    - Set up proper environment variable management in your production environment
 *    - Consider using a secrets manager in production (AWS Secrets Manager, HashiCorp Vault, etc.)
 * 
 * 2. WEBHOOKS CONFIGURATION
 *    - Create new webhook endpoints in your Stripe dashboard for production:
 *      - Point to: https://your-production-domain.com/api/payments/stripe-webhook
 *      - Set the new STRIPE_WEBHOOK_SECRET in your production environment
 *    - Test webhooks thoroughly before going live (Stripe provides webhook testing tools)
 *    - Implement proper error handling and retries for webhook failures
 *    - Set up logging to capture and alert on webhook processing errors
 * 
 * 3. PAYMENT PROCESSING SETTINGS
 *    - In your Stripe dashboard, configure:
 *      - Statement descriptor (what appears on customer credit card statements)
 *      - Billing address collection requirements
 *      - Email receipt settings
 *      - Account settings for your business type
 * 
 * 4. COMPLIANCE & SECURITY
 *    - Ensure your server environment is secure for production payments:
 *      - HTTPS for all connections
 *      - Proper firewall and network security
 *      - Regular security audits
 *    - Set up monitoring for suspicious payment patterns
 *    - Ensure proper data handling compliant with:
 *      - PCI DSS standards if handling card data
 *      - GDPR or CCPA if applicable to your users
 * 
 * 5. TESTING IN STAGING
 *    - Before switching to production:
 *      - Test all payment flows in a staging environment using live API mode
 *      - Verify successful payment handling
 *      - Verify webhook processing for asynchronous payments
 *      - Test refund functionality
 *      - Verify error handling and reporting
 */

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
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?payment_id=${uuidv4()}&status=success&type=paypal_order`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout?canceled=true`
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
  
  // Note: google_pay and apple_pay are not direct payment methods in Stripe
  // They are handled through the card payment method with specific configuration
  
  return methods;
};

/**
 * Save cart to database for tracking and history
 * @param {string} userId - User ID or anonymous ID
 * @param {Array} items - Cart items
 * @param {string} orderId - Order ID if available
 * @returns {Promise<string>} - Cart ID
 */
const saveCartToDatabase = async (userId, items, orderId = null) => {
  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      logger.warn('Attempted to save empty cart to database');
      return null;
    }
    
    // Generate a unique cart ID
    const cartId = uuidv4();
    
    // Create cart object
    const cart = {
      id: cartId,
      userId: userId || 'anonymous',
      items: items,
      total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      itemCount: items.reduce((count, item) => count + item.quantity, 0),
      orderId: orderId,
      status: orderId ? 'completed' : 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to carts collection
    await db.collection('carts').doc(cartId).set(cart);
    
    // If we have a user ID, also save to user's carts subcollection
    if (userId && userId !== 'anonymous') {
      await db.collection('users').doc(userId).collection('carts').doc(cartId).set(cart);
    }
    
    logger.info(`Saved cart to database: ${cartId}, items: ${items.length}`);
    return cartId;
  } catch (error) {
    logger.error(`Error saving cart to database: ${error.message}`, error);
    return null;
  }
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
    
    // Save cart to database if we have items
    let cartId = null;
    try {
      const userId = metadata.userId || 'anonymous';
      cartId = await saveCartToDatabase(userId, items);
    } catch (cartError) {
      logger.error(`Failed to save cart: ${cartError.message}`, cartError);
      // Don't fail the checkout process if cart saving fails
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
    
    // Create session data object
    const sessionData = {
      payment_method_types: payment_method_types,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?payment_id={CHECKOUT_SESSION_ID}&status=success&type=checkout_session`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout?canceled=true`,
      customer_email: email || undefined,
      payment_intent_data: payment_method_types.includes('ideal') || payment_method_types.includes('sepa_debit')
        ? { metadata: { ...metadata, cart_id: cartId, order_id: uuidv4() } } // For methods that don't support setup_future_usage
        : {
            metadata: { ...metadata, cart_id: cartId, order_id: uuidv4() },
            setup_future_usage: 'off_session', // Only for card payments and supported methods
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
      metadata: {
        ...metadata,
        cart_id: cartId, // Add the cart ID to the metadata for later retrieval
      }
    };
    
    // Create session
    const session = await stripe.checkout.sessions.create(sessionData);
    
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
 * Fetch cart items from database (placeholder function)
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

// === Crypto Payment Integration via BitPay ===
// This is a simplified implementation - you would need to set up a BitPay account and get API keys

router.post('/create-crypto-payment', async (req, res) => {
  try {
    const { cartTotal, items, currency = 'USD' } = req.body;
    
    if (!cartTotal || !items || !items.length) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    // Save cart to database if we have items
    let cartId = null;
    try {
      const userId = req.body.metadata?.userId || 'anonymous';
      cartId = await saveCartToDatabase(userId, items);
    } catch (cartError) {
      logger.error(`Failed to save cart: ${cartError.message}`, cartError);
      // Don't fail the payment process if cart saving fails
    }
    
    // In production, you would use the BitPay SDK here with your API credentials
    // This is a mock implementation to show the general flow
    
    // Generate a unique payment ID and order ID
    const paymentId = uuidv4();
    const orderId = uuidv4();
    
    // Mock BitPay API call (replace with actual BitPay SDK usage)
    const mockBitPayResponse = {
      id: `BP_${paymentId}`,
      url: `https://bitpay.com/invoice?id=${paymentId}`,
      status: 'new',
      price: cartTotal,
      currency: currency,
      expirationTime: new Date(Date.now() + 15 * 60000).toISOString(), // 15 minutes
      paymentCurrencies: ['BTC', 'ETH', 'USDC'],
      metadata: {
        order_id: orderId,
        cart_id: cartId
      },
      redirectURL: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?payment_id=${paymentId}&order_id=${orderId}&status=success&type=crypto`
    };
    
    logPayment('CRYPTO', 'PAYMENT_CREATED', { id: mockBitPayResponse.id, orderId });
    return res.json(mockBitPayResponse);
  } catch (error) {
    logPayment('CRYPTO', 'PAYMENT_CREATION_FAILED', null, error);
    return res.status(500).json({ error: 'Failed to create crypto payment' });
  }
});

// Check crypto payment status
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
  
  // Redirect to the new checkout success page with the session_id

   const redirectUrl = `${frontendUrl}/checkout/success?payment_id=${session_id}&status=success&type=checkout_session`;
  console.log(`Redirecting payment success to: ${redirectUrl}`); logger.info(`Redirecting payment success to: ${redirectUrl}`);
  
  // Log the redirect
  logPayment('STRIPE', 'REDIRECT_TO_CHECKOUT_SUCCESS', { session_id, redirectUrl });
  
  return res.redirect(redirectUrl);
});

module.exports = router; 