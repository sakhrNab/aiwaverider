// backend/routes/agent.js
const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agentsController');
const priceController = require('../controllers/priceController');
const validateFirebaseToken = require('../middleware/authenticate');
const publicCacheMiddleware = require('../middleware/publicCacheMiddleware');

// Single agent CRUD operations
router.post('/', validateFirebaseToken, agentsController.createAgent);
router.get('/:id', publicCacheMiddleware({ duration: 600 }), agentsController.getAgentById);
router.patch('/:id', validateFirebaseToken, agentsController.updateAgent);
router.delete('/:id', validateFirebaseToken, agentsController.deleteAgent);
// Add POST route for updating agent - matches frontend request
router.post('/:id', validateFirebaseToken, agentsController.updateAgent);

// Agent price operations
router.get('/:id/price', publicCacheMiddleware({ duration: 300 }), priceController.getAgentPrice);
router.post('/:id/price', validateFirebaseToken, priceController.updateAgentPrice);
// Add PUT route for updating agent price - matches frontend request
router.put('/:id/price', validateFirebaseToken, priceController.updateAgentPrice);

module.exports = router; 