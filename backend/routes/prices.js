/**
 * Price Routes
 * Handles HTTP requests related to agent pricing
 * @module routes/prices
 */
const express = require('express');
const router = express.Router();
const priceController = require('../controllers/priceController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const publicCacheMiddleware = require('../middleware/publicCacheMiddleware');

/**
 * @typedef {object} Price
 * @property {string} id - Price ID
 * @property {string} agentId - Agent ID
 * @property {number} amount - Price amount
 * @property {string} currency - Currency code (e.g., USD, EUR)
 * @property {boolean} [onSale] - Whether the agent is on sale
 * @property {number} [saleAmount] - Sale price amount
 * @property {string} [saleEndDate] - Date when sale ends
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last updated timestamp
 */

/**
 * @typedef {object} PriceRange
 * @property {number} min - Minimum price
 * @property {number} max - Maximum price
 * @property {string} currency - Currency code
 */

/**
 * @typedef {object} ErrorResponse
 * @property {string} error - Error message
 * @property {number} status - HTTP status code
 */

/**
 * Get price by agent ID
 * @route GET /api/prices/agent/{agentId}
 * @group Prices - Price management operations
 * @param {string} agentId.path.required - Agent ID
 * @returns {Price} 200 - Price details
 * @returns {ErrorResponse} 404 - Agent not found or no price set
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/agent/:agentId', publicCacheMiddleware({ duration: 300 }), asyncHandler(priceController.getPriceByAgentId));

/**
 * Get prices for multiple agents
 * @route POST /api/prices/agents
 * @group Prices - Price management operations
 * @param {Array<string>} agentIds.body.required - Array of agent IDs
 * @returns {Array<Price>} 200 - List of prices
 * @returns {ErrorResponse} 400 - Invalid agent IDs
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/agents', publicCacheMiddleware({ duration: 300 }), asyncHandler(priceController.getPricesByAgentIds));

/**
 * Get all prices with pagination
 * @route GET /api/prices
 * @group Prices - Price management operations
 * @param {number} [page.query=1] - Page number
 * @param {number} [limit.query=20] - Items per page
 * @returns {Array<Price>} 200 - List of prices
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/', publicCacheMiddleware({ duration: 300 }), asyncHandler(priceController.getAllPrices));

/**
 * Get prices by currency
 * @route GET /api/prices/currency/{currency}
 * @group Prices - Price management operations
 * @param {string} currency.path.required - Currency code (e.g., USD, EUR)
 * @param {number} [page.query=1] - Page number
 * @param {number} [limit.query=20] - Items per page
 * @returns {Array<Price>} 200 - List of prices in specified currency
 * @returns {ErrorResponse} 400 - Invalid currency
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/currency/:currency', publicCacheMiddleware({ duration: 300 }), asyncHandler(priceController.getPricesByCurrency));

/**
 * Get prices within a range
 * @route GET /api/prices/range
 * @group Prices - Price management operations
 * @param {number} min.query.required - Minimum price
 * @param {number} max.query.required - Maximum price
 * @param {string} [currency.query=USD] - Currency code
 * @param {number} [page.query=1] - Page number
 * @param {number} [limit.query=20] - Items per page
 * @returns {Array<Price>} 200 - List of prices in specified range
 * @returns {ErrorResponse} 400 - Invalid range parameters
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/range', publicCacheMiddleware({ duration: 300 }), asyncHandler(priceController.getPricesInRange));

/**
 * Get agents on sale
 * @route GET /api/prices/sale
 * @group Prices - Price management operations
 * @param {number} [limit.query=10] - Number of items to return
 * @returns {Array<Price>} 200 - List of prices for agents on sale
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/sale', publicCacheMiddleware({ duration: 300 }), asyncHandler(priceController.getOnSalePrices));

/**
 * Create or update price for an agent
 * @route PUT /api/prices/agent/{agentId}
 * @group Prices - Price management operations
 * @param {string} agentId.path.required - Agent ID
 * @param {number} amount.body.required - Price amount
 * @param {string} currency.body.required - Currency code
 * @param {boolean} [onSale.body=false] - Whether the agent is on sale
 * @param {number} [saleAmount.body] - Sale price amount
 * @param {string} [saleEndDate.body] - Date when sale ends
 * @security BearerAuth
 * @returns {Price} 200 - Updated price
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not admin
 * @returns {ErrorResponse} 404 - Agent not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.put('/agent/:agentId', requireAuth, requireAdmin, asyncHandler(priceController.createOrUpdatePrice));

/**
 * Delete price for an agent
 * @route DELETE /api/prices/agent/{agentId}
 * @group Prices - Price management operations
 * @param {string} agentId.path.required - Agent ID
 * @security BearerAuth
 * @returns {object} 200 - Success message
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not admin
 * @returns {ErrorResponse} 404 - Price not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.delete('/agent/:agentId', requireAuth, requireAdmin, asyncHandler(priceController.deletePrice));

module.exports = router;