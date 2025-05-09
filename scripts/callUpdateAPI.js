/**
 * Script to directly call the admin controller to update agent creators
 * This bypasses the Express routes and API authentication
 */

const adminController = require('../controllers/admin/adminController');

// Create a mock request and response
const req = {};
const res = {
  status: function(code) {
    console.log(`Response status: ${code}`);
    return this;
  },
  json: function(data) {
    console.log('Response data:');
    console.log(JSON.stringify(data, null, 2));
    return this;
  }
};

// Call the update function
console.log('Starting agent creators update...');
adminController.updateAgentCreators(req, res)
  .then(() => {
    console.log('Update process completed.');
  })
  .catch(error => {
    console.error('Error during update:', error);
  }); 