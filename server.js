import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
const app = express();
const PORT = 4000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Mock Stripe API
const mockStripe = {
  paymentMethods: {
    create: async () => ({ id: 'pm_' + uuidv4() })
  },
  paymentIntents: {
    create: async () => ({
      id: 'pi_' + uuidv4(),
      status: 'succeeded',
      client_secret: 'cs_' + uuidv4(),
      metadata: { order_id: uuidv4() }
    })
  },
  applePayDomains: {
    create: async () => ({
      id: 'apd_' + uuidv4(),
      domain_name: 'localhost',
      created: Math.floor(Date.now() / 1000)
    })
  }
};

// Process Google Pay payment
app.post('/api/payments/process-google-pay', async (req, res) => {
  try {
    const { paymentToken, amount, currency, items, email } = req.body;
    
    if (!paymentToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing payment token' 
      });
    }
    
    console.log('Processing Google Pay payment:', {
      amount,
      currency,
      email: email || 'not provided',
      items: items ? items.length : 0
    });
    
    // Create a mock payment method using the token
    const paymentMethod = await mockStripe.paymentMethods.create();
    
    // Create a mock payment intent
    const paymentIntent = await mockStripe.paymentIntents.create();
    
    // Return mock success response
    return res.json({
      success: true,
      orderId: paymentIntent.metadata.order_id,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Google Pay payment processing error:', error);
    
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
app.post('/api/payments/validate-apple-pay-merchant', async (req, res) => {
  try {
    const { validationURL } = req.body;
    
    if (!validationURL) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing validation URL' 
      });
    }
    
    console.log('Validating Apple Pay merchant with URL:', validationURL);
    
    // Get the mock merchant session from Stripe
    const merchantSession = await mockStripe.applePayDomains.create();
    
    return res.json({
      success: true,
      merchantSession: {
        merchantSessionIdentifier: 'merchant_session_' + uuidv4(),
        nonce: uuidv4(),
        merchantIdentifier: 'merchant.com.yourcompany.app',
        domainName: 'localhost',
        displayName: 'Your Store'
      }
    });
  } catch (error) {
    console.error('Apple Pay merchant validation error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Merchant validation failed'
    });
  }
});

// Process Apple Pay payment
app.post('/api/payments/process-apple-pay', async (req, res) => {
  try {
    const { payment, amount, currency, items, email } = req.body;
    
    if (!payment || !payment.token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing payment token' 
      });
    }
    
    console.log('Processing Apple Pay payment:', {
      amount,
      currency,
      email: email || 'not provided',
      items: items ? items.length : 0
    });
    
    // Create a mock payment method using the token
    const paymentMethod = await mockStripe.paymentMethods.create();
    
    // Create a mock payment intent
    const paymentIntent = await mockStripe.paymentIntents.create();
    
    // Return mock success response
    return res.json({
      success: true,
      orderId: paymentIntent.metadata.order_id,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Apple Pay payment processing error:', error);
    
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

// Test endpoint
app.get('/api/payments/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Digital Wallet API is working',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Digital Wallet server is running on port ${PORT}`);
  console.log(`Endpoints available:`);
  console.log(`- GET  http://localhost:${PORT}/api/payments/test`);
  console.log(`- POST http://localhost:${PORT}/api/payments/process-google-pay`);
  console.log(`- POST http://localhost:${PORT}/api/payments/process-apple-pay`);
  console.log(`- POST http://localhost:${PORT}/api/payments/validate-apple-pay-merchant`);
}); 