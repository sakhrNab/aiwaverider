const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Your PayPal credentials - STORE THESE IN .ENV FILE in production
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'sb';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'dummy_secret'; // This will fail in sandbox mode, but it needs to be set
const PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com'; // Always use sandbox for development

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
    
    return res.json({ id: response.data.id });
  } catch (error) {
    console.error('Error creating PayPal order:', error);
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
    
    return res.json(response.data);
  } catch (error) {
    console.error('Error capturing PayPal payment:', error);
    return res.status(500).json({ error: 'Failed to capture PayPal payment' });
  }
});

module.exports = router; 