const express = require('express');
const router = express.Router();
const agentsController = require('../../controllers/agentsController');
const validateFirebaseToken = require('../../middleware/authenticate');

// Public endpoints (don't require auth)
router.get('/', agentsController.getAgents);
router.get('/featured', agentsController.getFeaturedAgents);
router.get('/latest', agentsController.getLatestAgentsRoute);
router.get('/:id', agentsController.getAgentById);

// Protected endpoints (require auth)
router.post('/', validateFirebaseToken, agentsController.createAgent);
router.put('/:id', validateFirebaseToken, agentsController.updateAgent);
router.delete('/:id', validateFirebaseToken, agentsController.deleteAgent);
router.post('/:id/wishlist', validateFirebaseToken, agentsController.toggleWishlist);
router.get('/user/wishlists', validateFirebaseToken, agentsController.getWishlists);
router.get('/wishlist/:id', validateFirebaseToken, agentsController.getWishlistById);

// Export router
module.exports = router; 