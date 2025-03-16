const axios = require('axios');

const API_URL = 'http://localhost:4000';

// Mock payment tokens for testing
const MOCK_GOOGLE_PAY_TOKEN = JSON.stringify({
  id: 'tok_visa', 
  object: 'token',
  card: {
    brand: 'visa',
    last4: '4242',
    exp_month: 12,
    exp_year: 2025
  }
});

const MOCK_APPLE_PAY_PAYMENT = {
  token: {
    id: 'tok_visa',
    object: 'token',
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2025
    }
  }
};

async function testSimpleServer() {
  console.log('=== Testing Simple Server Digital Wallet Integrations ===');
  
  // Test the test endpoint first
  try {
    console.log('\n--- Testing API Health ---');
    console.log(`Attempting to connect to: ${API_URL}/api/payments/test`);
    
    const healthResponse = await axios.get(`${API_URL}/api/payments/test`);
    console.log('Health Check Result:');
    console.log('Status:', healthResponse.status);
    console.log('Message:', healthResponse.data.message);
    console.log('Test endpoint successful ✅');
  } catch (error) {
    console.error('Health Check Failed ❌');
    console.error('Details:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received. Server might be down or incorrect port');
      console.error('Request details:', error.request._currentUrl);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
    console.error('Error config:', error.config);
    
    // If we can't reach the test endpoint, no point in continuing
    console.error('Exiting tests because server is not reachable');
    return;
  }
  
  // Test data
  const testData = {
    amount: 19.99,
    items: [
      {
        id: 'test-product-1',
        title: 'Test Product',
        description: 'A test product for digital wallet integration',
        price: 19.99,
        quantity: 1
      }
    ],
    email: 'test@example.com',
    currency: 'usd',
    countryCode: 'US'
  };
  
  // Test Google Pay
  console.log('\n--- Testing Direct Google Pay Integration ---');
  try {
    const googlePayData = {
      ...testData,
      paymentToken: MOCK_GOOGLE_PAY_TOKEN
    };
    
    console.log('Request data:', JSON.stringify(googlePayData, null, 2));
    console.log(`Sending request to: ${API_URL}/api/payments/process-google-pay`);
    
    const googlePayResponse = await axios.post(
      `${API_URL}/api/payments/process-google-pay`,
      googlePayData
    );
    
    console.log('Google Pay Test Result:');
    console.log('Status:', googlePayResponse.status);
    console.log('Success:', googlePayResponse.data.success);
    console.log('Order ID:', googlePayResponse.data.orderId);
    console.log('Payment Status:', googlePayResponse.data.status);
    console.log('Google Pay test successful ✅');
  } catch (error) {
    console.error('Google Pay Test Failed ❌');
    console.error('Details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received. Server might be down or incorrect port');
      console.error('Request details:', error.request._currentUrl);
    } else {
      console.error('Error:', error.message);
    }
    console.error('Error config:', error.config);
  }
  
  // Test Apple Pay
  console.log('\n--- Testing Direct Apple Pay Integration ---');
  try {
    const applePayData = {
      ...testData,
      payment: MOCK_APPLE_PAY_PAYMENT
    };
    
    console.log('Request data:', JSON.stringify(applePayData, null, 2));
    console.log(`Sending request to: ${API_URL}/api/payments/process-apple-pay`);
    
    const applePayResponse = await axios.post(
      `${API_URL}/api/payments/process-apple-pay`,
      applePayData
    );
    
    console.log('Apple Pay Test Result:');
    console.log('Status:', applePayResponse.status);
    console.log('Success:', applePayResponse.data.success);
    console.log('Order ID:', applePayResponse.data.orderId);
    console.log('Payment Status:', applePayResponse.data.status);
    console.log('Apple Pay test successful ✅');
  } catch (error) {
    console.error('Apple Pay Test Failed ❌');
    console.error('Details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received. Server might be down or incorrect port');
      console.error('Request details:', error.request._currentUrl);
    } else {
      console.error('Error:', error.message);
    }
    console.error('Error config:', error.config);
  }
  
  console.log('\nAll tests completed! If all tests passed, your simple server is working correctly.');
}

// Run the tests
console.log('Starting test script...');
testSimpleServer().catch(error => {
  console.error('Test suite failed with uncaught error:');
  console.error(error);
}); 