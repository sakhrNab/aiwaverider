// backend/routes/agents.js
const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agentsController');
const validateFirebaseToken = require('../middleware/authenticate');
const publicCacheMiddleware = require('../middleware/publicCacheMiddleware');

// Public endpoints (cached)
router.get('/', publicCacheMiddleware({ duration: 300 }), agentsController.getAgents);
router.get('/featured', publicCacheMiddleware({ duration: 900 }), agentsController.getFeaturedAgents);
router.get('/:agentId', publicCacheMiddleware({ duration: 600 }), agentsController.getAgentById);

// Protected endpoints (require authentication)
router.get('/wishlists', validateFirebaseToken, agentsController.getWishlists);
router.post('/wishlists/:agentId', validateFirebaseToken, agentsController.toggleWishlist);
router.get('/wishlists/:wishlistId', validateFirebaseToken, agentsController.getWishlistById);

// Development endpoint - only available in development environment
if (process.env.NODE_ENV === 'development') {
  router.post('/seed', agentsController.seedAgents);
}

module.exports = router; 