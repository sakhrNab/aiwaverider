/**
 * Payment API Diagnostic Tool
 * 
 * This script tests all payment-related API endpoints and provides detailed diagnostics
 * Run it with: node payment-diagnostic.js
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_PORT = process.env.PORT || 4000;
const API_URL = `http://localhost:${API_PORT}`;
const LOG_FILE = path.join(__dirname, 'payment-diagnostic.log');

// Write to console and log file
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  
  // Log to console
  if (type === 'ERROR') {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Clear log file at start
fs.writeFileSync(LOG_FILE, `Payment API Diagnostic Log - ${new Date().toISOString()}\n\n`);

// Test an endpoint
async function testEndpoint(endpoint, method = 'GET', data = null, description = '') {
  const url = `${API_URL}${endpoint}`;
  log(`Testing ${method} ${url} - ${description}`);
  
  try {
    const config = {
      method,
      url,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    const startTime = Date.now();
    const response = await axios(config);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    log(`✅ SUCCESS: ${method} ${endpoint} - Status ${response.status} (${duration}ms)`);
    
    // Log response data format without logging sensitive data
    const responseData = response.data;
    const responseInfo = method === 'GET' 
      ? JSON.stringify(responseData, null, 2)
      : `Response contains: ${Object.keys(responseData).join(', ')}`;
    
    log(`Response: ${responseInfo}`);
    return { success: true, data: response.data, duration };
  } catch (error) {
    log(`❌ ERROR: ${method} ${endpoint} - ${error.message}`, 'ERROR');
    
    const errorDetails = error.response 
      ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}`
      : 'No response details available';
    
    log(errorDetails, 'ERROR');
    return { success: false, error, errorDetails };
  }
}

// Check if route file exists and contains expected routes
async function checkRouteFile() {
  const routeFilePath = path.join(__dirname, 'routes', 'payments.js');
  log(`Checking route file at ${routeFilePath}`);
  
  try {
    if (!fs.existsSync(routeFilePath)) {
      log(`❌ Route file not found at ${routeFilePath}`, 'ERROR');
      return false;
    }
    
    const routeContent = fs.readFileSync(routeFilePath, 'utf8');
    log(`✅ Route file found (${routeContent.length} bytes)`);
    
    // Check for key endpoints 
    const endpoints = [
      'router.get(\'/test\'',
      'router.get(\'/test-connectivity\'',
      'router.get(\'/payment-methods\'',
      'router.post(\'/create-stripe-checkout\'',
      'router.post(\'/create-paypal-order\'',
    ];
    
    const missingEndpoints = [];
    
    for (const endpoint of endpoints) {
      if (!routeContent.includes(endpoint)) {
        missingEndpoints.push(endpoint);
      }
    }
    
    if (missingEndpoints.length > 0) {
      log(`❌ Missing endpoints in route file: ${missingEndpoints.join(', ')}`, 'ERROR');
      return false;
    }
    
    log('✅ All expected endpoints found in route file');
    return true;
  } catch (error) {
    log(`❌ Error checking route file: ${error.message}`, 'ERROR');
    return false;
  }
}

// Check if route is registered in index.js
async function checkRouteRegistration() {
  const indexFilePath = path.join(__dirname, 'routes', 'index.js');
  log(`Checking route registration in ${indexFilePath}`);
  
  try {
    if (!fs.existsSync(indexFilePath)) {
      log(`❌ Route index file not found at ${indexFilePath}`, 'ERROR');
      return false;
    }
    
    const indexContent = fs.readFileSync(indexFilePath, 'utf8');
    
    // Check if payments route is imported and registered
    const importLine = "const paymentsRoutes = require('./payments');";
    const useLine = "router.use('/payments', paymentsRoutes);";
    
    if (!indexContent.includes(importLine)) {
      log(`❌ Payment routes import not found in index.js`, 'ERROR');
      return false;
    }
    
    if (!indexContent.includes(useLine)) {
      log(`❌ Payment routes registration not found in index.js`, 'ERROR');
      return false;
    }
    
    log('✅ Payment routes are correctly imported and registered in index.js');
    return true;
  } catch (error) {
    log(`❌ Error checking route registration: ${error.message}`, 'ERROR');
    return false;
  }
}

// Main diagnostic function
async function runDiagnostics() {
  log('=== Payment API Diagnostics Started ===');
  log(`Server URL: ${API_URL}`);
  
  // Check route files
  const routeFileOk = await checkRouteFile();
  const routeRegistrationOk = await checkRouteRegistration();
  
  // Basic server check
  log('\n=== Basic server connectivity check ===');
  const serverCheck = await testEndpoint('/api', 'GET', null, 'Basic API root');
  
  if (!serverCheck.success) {
    log('❌ Cannot connect to API server. Make sure the server is running on the correct port.', 'ERROR');
    return;
  }
  
  // Test payment routes
  log('\n=== Payment API Routes Check ===');
  
  // Test route
  await testEndpoint('/api/payments/test', 'GET', null, 'Basic test endpoint');
  
  // Payment methods route
  await testEndpoint('/api/payments/payment-methods', 'GET', null, 'Payment methods endpoint');
  
  // Connectivity test
  await testEndpoint('/api/payments/test-connectivity', 'GET', null, 'API connectivity test endpoint');
  
  // Test Stripe checkout
  const stripeData = {
    cartTotal: 10.99,
    items: [{ id: 'test-1', title: 'Test Product', price: 10.99, quantity: 1 }],
    currency: 'eur',
    countryCode: 'DE',
    paymentMethodTypes: ['sepa_debit']
  };
  
  await testEndpoint('/api/payments/create-stripe-checkout', 'POST', stripeData, 'Stripe checkout with SEPA');
  
  // Test PayPal order
  const paypalData = {
    cartTotal: 10.99,
    items: [{ id: 'test-1', title: 'Test Product', price: 10.99, quantity: 1 }]
  };
  
  await testEndpoint('/api/payments/create-paypal-order', 'POST', paypalData, 'PayPal order creation');
  
  log('\n=== Payment API Diagnostics Complete ===');
  log(`See detailed logs in ${LOG_FILE}`);
}

// Run the diagnostics
runDiagnostics().catch(error => {
  log(`❌ Unhandled error in diagnostic script: ${error.message}`, 'ERROR');
  console.error(error);
}); 