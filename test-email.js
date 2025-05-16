/**
 * Simple script to test email functionality
 */

// Import the email service
const emailService = require('./services/emailService');
const logger = require('./utils/logger');

// Test function
async function testEmail() {
  try {
    console.log('Attempting to send test email...');
    const result = await emailService.sendTestEmail('test@example.com');
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to send test email:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
}

// Run the test
testEmail()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  }); 