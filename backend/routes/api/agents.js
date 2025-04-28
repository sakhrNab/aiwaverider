const express = require('express');
const router = express.Router();
const agentsController = require('../../controllers/agentsController');
const validateFirebaseToken = require('../../middleware/authenticate');
const upload = require('../../middleware/upload');

// Public endpoints (don't require auth)
router.get('/', agentsController.getAgents);
router.get('/featured', agentsController.getFeaturedAgents);
router.get('/latest', agentsController.getLatestAgentsRoute);
router.get('/:id', agentsController.getAgentById);

// Protected endpoints (require auth)
router.post('/', validateFirebaseToken, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'icon', maxCount: 1 },
  { name: 'jsonFile', maxCount: 1 }
]), agentsController.createAgent);

// Add debug logging for PUT route
router.put('/:id', validateFirebaseToken, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'icon', maxCount: 1 },
  { name: 'jsonFile', maxCount: 1 }
]), (req, res, next) => {
  console.log(`PUT /api/agents/${req.params.id} route hit with params:`, req.params);
  console.log('Request body fields:', Object.keys(req.body));
  console.log('Request files:', req.files);
  return agentsController.updateAgent(req, res, next);
});

router.delete('/:id', validateFirebaseToken, agentsController.deleteAgent);
router.post('/:id/wishlist', validateFirebaseToken, agentsController.toggleWishlist);
router.get('/user/wishlists', validateFirebaseToken, agentsController.getWishlists);
router.get('/wishlist/:id', validateFirebaseToken, agentsController.getWishlistById);

// Export router
module.exports = router; 