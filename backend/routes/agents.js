// backend/routes/agents.js
const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agentsController');
const validateFirebaseToken = require('../middleware/authenticate');
const publicCacheMiddleware = require('../middleware/publicCacheMiddleware');
const upload = require('../middleware/upload');

// Cache durations based on environment
const getDefaultCacheDuration = () => {
  return process.env.NODE_ENV === 'development' ? 30 : 300; // 30 seconds in dev, 5 minutes in production
};

const getFeaturedCacheDuration = () => {
  return process.env.NODE_ENV === 'development' ? 60 : 900; // 1 minute in dev, 15 minutes in production
};

// Public endpoints (cached)
router.get('/', publicCacheMiddleware({ duration: getDefaultCacheDuration() }), agentsController.getAgents);
router.get('/featured', publicCacheMiddleware({ duration: getFeaturedCacheDuration() }), agentsController.getFeaturedAgents);

// Cache busting route
router.get('/refresh-cache', validateFirebaseToken, (req, res) => {
  // Clear the cache for the agents routes
  if (req.app.locals.cache) {
    const cacheKeys = Array.from(req.app.locals.cache.keys());
    const agentCacheKeys = cacheKeys.filter(key => key.includes('/api/agents'));
    
    agentCacheKeys.forEach(key => {
      req.app.locals.cache.del(key);
    });
    
    console.log(`Cleared ${agentCacheKeys.length} agent cache entries`);
    return res.status(200).json({ message: `Cleared ${agentCacheKeys.length} agent cache entries` });
  }
  
  return res.status(200).json({ message: 'No cache to clear' });
});

// Add a specific route for Firebase document IDs
router.get('/doc/:docId', publicCacheMiddleware({ duration: getDefaultCacheDuration() }), (req, res) => {
  // Set the agentId parameter to the docId and forward to the getAgentById controller
  req.params.id = req.params.docId;
  return agentsController.getAgentById(req, res);
});

// Add a specific route for the 'agent-XX' format IDs
router.get('/agent-:numericId([0-9]+)', publicCacheMiddleware({ duration: getDefaultCacheDuration() }), (req, res) => {
  // Set the agentId parameter and forward to the getAgentById controller
  // This captures 'agent-41' format directly using route parameter
  const agentId = `agent-${req.params.numericId}`;
  console.log(`Special route captured agent-XX format: ${agentId}`);
  req.params.id = agentId;
  return agentsController.getAgentById(req, res);
});

router.get('/:agentId', publicCacheMiddleware({ duration: getDefaultCacheDuration() }), agentsController.getAgentById);

// GET /api/agents/:agentId/downloads - Get download count for an agent
router.get('/:agentId/downloads', agentsController.getDownloadCount);

// POST /api/agents/:agentId/downloads - Increment download count
router.post('/:agentId/downloads', validateFirebaseToken, agentsController.incrementDownloadCount);

// Protected endpoints (require authentication)
router.get('/wishlists', validateFirebaseToken, agentsController.getWishlists);
router.post('/wishlists/:agentId', validateFirebaseToken, agentsController.toggleWishlist);
router.get('/wishlists/:wishlistId', validateFirebaseToken, agentsController.getWishlistById);

// Admin endpoints for agent management (require admin role)
// Use upload middleware to handle file uploads - set up fields for both image and icon
router.post('/', validateFirebaseToken, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'icon', maxCount: 1 }
]), agentsController.createAgent);

// Also update the patch route to handle file uploads
router.patch('/:agentId', validateFirebaseToken, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'icon', maxCount: 1 }
]), agentsController.updateAgent);

router.delete('/:agentId', validateFirebaseToken, agentsController.deleteAgent);

// Development endpoint - only available in development environment
if (process.env.NODE_ENV === 'development') {
  router.post('/seed', agentsController.seedAgents);
}

module.exports = router; 