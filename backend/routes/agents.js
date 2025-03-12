// backend/routes/agents.js
const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agentsController');
const validateFirebaseToken = require('../middleware/authenticate');
const publicCacheMiddleware = require('../middleware/publicCacheMiddleware');

// Public endpoints (cached)
router.get('/', publicCacheMiddleware({ duration: 300 }), agentsController.getAgents);
router.get('/featured', publicCacheMiddleware({ duration: 900 }), agentsController.getFeaturedAgents);

// Add a specific route for Firebase document IDs
router.get('/doc/:docId', publicCacheMiddleware({ duration: 600 }), (req, res) => {
  // Set the agentId parameter to the docId and forward to the getAgentById controller
  req.params.id = req.params.docId;
  return agentsController.getAgentById(req, res);
});

// Add a specific route for the 'agent-XX' format IDs
router.get('/agent-:numericId([0-9]+)', publicCacheMiddleware({ duration: 600 }), (req, res) => {
  // Set the agentId parameter and forward to the getAgentById controller
  // This captures 'agent-41' format directly using route parameter
  const agentId = `agent-${req.params.numericId}`;
  console.log(`Special route captured agent-XX format: ${agentId}`);
  req.params.id = agentId;
  return agentsController.getAgentById(req, res);
});

router.get('/:agentId', publicCacheMiddleware({ duration: 600 }), agentsController.getAgentById);

// Protected endpoints (require authentication)
router.get('/wishlists', validateFirebaseToken, agentsController.getWishlists);
router.post('/wishlists/:agentId', validateFirebaseToken, agentsController.toggleWishlist);
router.get('/wishlists/:wishlistId', validateFirebaseToken, agentsController.getWishlistById);

// Admin endpoints for agent management (require admin role)
router.post('/', validateFirebaseToken, agentsController.createAgent);
router.patch('/:agentId', validateFirebaseToken, agentsController.updateAgent);
router.delete('/:agentId', validateFirebaseToken, agentsController.deleteAgent);

// Development endpoint - only available in development environment
if (process.env.NODE_ENV === 'development') {
  router.post('/seed', agentsController.seedAgents);
}

module.exports = router; 