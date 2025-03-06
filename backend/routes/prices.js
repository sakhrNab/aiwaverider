const express = require('express');
const router = express.Router();
const priceController = require('../controllers/priceController');
const validateFirebaseToken = require('../middleware/authenticate');
const publicCacheMiddleware = require('../middleware/publicCacheMiddleware');

// Public endpoints (read-only, cached)
router.get('/:id', publicCacheMiddleware({ duration: 300 }), priceController.getPriceById);
router.get('/:id/history', publicCacheMiddleware({ duration: 600 }), priceController.getPriceHistory);

// Protected endpoints (require authentication)
router.post('/:id', validateFirebaseToken, priceController.updatePrice);
router.patch('/:id/discount', validateFirebaseToken, priceController.applyDiscount);

module.exports = router; 