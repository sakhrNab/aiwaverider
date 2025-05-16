import http from 'http';

// Make a simple GET request to the test endpoint
const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/payments/test',
  method: 'GET'
};

console.log('Testing server at http://localhost:4000/api/payments/test');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response data:');
    console.log(data);
    
    // Now test the Google Pay endpoint
    testGooglePayEndpoint();
  });
});

req.on('error', (error) => {
  console.error('Error testing server:', error.message);
});

req.end();

// Function to test the Google Pay endpoint
function testGooglePayEndpoint() {
  console.log('\nTesting Google Pay endpoint at http://localhost:4000/api/payments/process-google-pay');
  
  const postData = JSON.stringify({
    amount: 19.99,
    paymentToken: JSON.stringify({
      id: 'tok_visa',
      object: 'token',
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2025
      }
    })
  });
  
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/payments/process-google-pay',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response data:');
      console.log(data);
    });
  });
  
  req.on('error', (error) => {
    console.error('Error testing Google Pay endpoint:', error.message);
  });
  
  req.write(postData);
  req.end();
} 