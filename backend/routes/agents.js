// backend/routes/agents.js
const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agentsController');
const authenticate = require('../middleware/authenticate');
const publicCacheMiddleware = require('../middleware/publicCacheMiddleware');

// Public endpoints (cached)
router.get('/', publicCacheMiddleware({ duration: 300 }), agentsController.getAgents);
router.get('/featured', publicCacheMiddleware({ duration: 900 }), agentsController.getFeaturedAgents);
router.get('/:agentId', publicCacheMiddleware({ duration: 600 }), agentsController.getAgentById);

// Protected endpoints (require authentication)
// Temporarily comment out these routes while fixing authentication
/* 
router.get('/wishlists', authenticate.validateFirebaseToken, agentsController.getWishlists);
router.post('/wishlists/:agentId', authenticate.validateFirebaseToken, agentsController.toggleWishlist);
router.get('/wishlists/:wishlistId', authenticate.validateFirebaseToken, agentsController.getWishlistById);
*/

module.exports = router; 