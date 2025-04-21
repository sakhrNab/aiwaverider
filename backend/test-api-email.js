/**
 * Email API Test
 * Tests sending emails through the API endpoints
 */

const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:4000/api';
const TEST_EMAIL = 'aiwaverider8@gmail.com';

// Create a test admin token (this is a dummy token for testing)
// In a real scenario, you would need to get a valid token from your authentication system
const ADMIN_TOKEN = 'dummy_token';

// Simple delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Create axios instance with auth header
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ADMIN_TOKEN}`
  }
});

async function testEmailAPI() {
  try {
    console.log('\n📧 EMAIL API TEST');
    console.log('===============');
    console.log('Testing sending email via API endpoint...');
    console.log('NOTE: This requires your server to be running on port 4000');
    console.log('NOTE: This requires admin authentication to work properly');
    
    console.log('\nSending test email to', TEST_EMAIL);
    
    const response = await api.post('/email/test', {
      email: TEST_EMAIL
    });
    
    console.log('\n✅ API Response:');
    console.log(response.data);
    
    console.log('\n🎉 API test successful!');
    console.log('Check your inbox for the test email.');
    
  } catch (error) {
    console.error('\n❌ API TEST FAILED:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 401 || error.response.status === 403) {
        console.error('\nAuthentication Error: You need a valid admin token to access this endpoint.');
        console.error('1. Make sure your server is running');
        console.error('2. Replace the dummy token in this script with a valid admin token');
        console.error('3. If you\'re not sure how to get a token, you can use the direct test instead');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server. Is your backend running?');
      console.error('Error details:', error.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
  }
}

console.log('Starting Email API test...');
testEmailAPI(); 