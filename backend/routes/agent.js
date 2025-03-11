// backend/routes/agent.js
const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agentsController');
const priceController = require('../controllers/priceController');
const validateFirebaseToken = require('../middleware/authenticate');
const publicCacheMiddleware = require('../middleware/publicCacheMiddleware');

// Log that this file is being loaded
console.log('Loading agent.js routes file with proper imports');

// Debug - print available controller methods
console.log('combinedUpdate direct check:', typeof agentsController.combinedUpdate === 'function');
console.log('createAgentWithPrice direct check:', typeof agentsController.createAgentWithPrice === 'function');
console.log('validateFirebaseToken type:', typeof validateFirebaseToken);
console.log('publicCacheMiddleware type:', typeof publicCacheMiddleware);

// Create a safe wrapper for controller methods
const safeHandler = (controllerFn, name) => {
  return function(req, res) {
    console.log(`Safe handler called for: ${name}`);
    if (typeof controllerFn === 'function') {
      try {
        return controllerFn(req, res);
      } catch (error) {
        console.error(`Error executing ${name}:`, error);
        return res.status(500).json({
          success: false,
          message: `Server error in ${name}`,
          error: error.message
        });
      }
    } else {
      console.error(`Handler function '${name}' is not defined`);
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
        error: `The '${name}' function is not available`
      });
    }
  };
};

// Simple test route that doesn't depend on any controllers
router.get('/test', (req, res) => {
  console.log('Agent test route hit');
  return res.status(200).json({
    success: true,
    message: 'Agent test route working correctly'
  });
});

// === Combined routes for optimized operations ===
router.post('/with-price', validateFirebaseToken, safeHandler(agentsController.createAgentWithPrice, 'createAgentWithPrice'));

// === Combined update routes (with an explicit path to avoid conflict with /:id) ===
router.post('/:id/combined-update', validateFirebaseToken, safeHandler(agentsController.combinedUpdate, 'combinedUpdate'));
router.put('/:id/combined-update', validateFirebaseToken, safeHandler(agentsController.combinedUpdate, 'combinedUpdate'));

// === Single agent CRUD operations ===
router.post('/', validateFirebaseToken, safeHandler(agentsController.createAgent, 'createAgent'));
router.get('/:id', publicCacheMiddleware({ maxAge: 600 }), safeHandler(agentsController.getAgentById, 'getAgentById'));
router.patch('/:id', validateFirebaseToken, safeHandler(agentsController.updateAgent, 'updateAgent'));
router.delete('/:id', validateFirebaseToken, safeHandler(agentsController.deleteAgent, 'deleteAgent'));
router.post('/:id', validateFirebaseToken, safeHandler(agentsController.updateAgent, 'updateAgent'));

// === Agent price routes ===
router.get('/:id/price', publicCacheMiddleware({ maxAge: 300 }), safeHandler(priceController.getAgentPrice, 'getAgentPrice'));
router.post('/:id/price', validateFirebaseToken, safeHandler(priceController.updateAgentPrice, 'updateAgentPrice'));
router.put('/:id/price', validateFirebaseToken, safeHandler(priceController.updateAgentPrice, 'updateAgentPrice'));

module.exports = router; 