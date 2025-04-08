/**
 * Wishlist Routes
 * 
 * Routes for wishlist-related operations
 * @module routes/wishlists
 */

const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @typedef {object} Wishlist
 * @property {string} id - Wishlist ID
 * @property {string} userId - User ID who created the wishlist
 * @property {string} name - Wishlist name
 * @property {string} [description] - Wishlist description
 * @property {boolean} isPublic - Whether the wishlist is public
 * @property {Array<string>} agents - Array of agent IDs in the wishlist
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last updated timestamp
 */

/**
 * @typedef {object} WishlistResponse
 * @property {Array<Wishlist>} wishlists - List of wishlists
 * @property {number} total - Total count of wishlists
 * @property {number} page - Current page number
 * @property {number} totalPages - Total number of pages
 */

/**
 * @typedef {object} ErrorResponse
 * @property {string} error - Error message
 * @property {number} status - HTTP status code
 */

/**
 * Get all public wishlists
 * @route GET /api/wishlists/public
 * @group Wishlists - Wishlist operations
 * @param {number} page.query - Page number for pagination
 * @param {number} limit.query - Number of items per page
 * @returns {WishlistResponse} 200 - List of public wishlists
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/public', asyncHandler(wishlistController.getPublicWishlists));

/**
 * Get all wishlists for the logged in user
 * @route GET /api/wishlists/my
 * @group Wishlists - Wishlist operations
 * @security BearerAuth
 * @returns {Array<Wishlist>} 200 - User's wishlists
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/my', requireAuth, asyncHandler(wishlistController.getUserWishlists));

/**
 * Get a wishlist by ID
 * @route GET /api/wishlists/{wishlistId}
 * @group Wishlists - Wishlist operations
 * @param {string} wishlistId.path.required - Wishlist ID
 * @returns {Wishlist} 200 - Wishlist details
 * @returns {ErrorResponse} 403 - Forbidden if private wishlist and not owner
 * @returns {ErrorResponse} 404 - Wishlist not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/:wishlistId', asyncHandler(wishlistController.getWishlistById));

/**
 * Create a new wishlist
 * @route POST /api/wishlists
 * @group Wishlists - Wishlist operations
 * @param {string} name.body.required - Wishlist name
 * @param {string} [description.body] - Wishlist description
 * @param {boolean} [isPublic.body=false] - Whether the wishlist is public
 * @security BearerAuth
 * @returns {Wishlist} 201 - Created wishlist
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/', requireAuth, asyncHandler(wishlistController.createWishlist));

/**
 * Update a wishlist
 * @route PUT /api/wishlists/{wishlistId}
 * @group Wishlists - Wishlist operations
 * @param {string} wishlistId.path.required - Wishlist ID
 * @param {string} [name.body] - Wishlist name
 * @param {string} [description.body] - Wishlist description
 * @param {boolean} [isPublic.body] - Whether the wishlist is public
 * @security BearerAuth
 * @returns {Wishlist} 200 - Updated wishlist
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not wishlist owner
 * @returns {ErrorResponse} 404 - Wishlist not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.put('/:wishlistId', requireAuth, asyncHandler(wishlistController.updateWishlist));

/**
 * Delete a wishlist
 * @route DELETE /api/wishlists/{wishlistId}
 * @group Wishlists - Wishlist operations
 * @param {string} wishlistId.path.required - Wishlist ID
 * @security BearerAuth
 * @returns {object} 200 - Success message
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not wishlist owner
 * @returns {ErrorResponse} 404 - Wishlist not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.delete('/:wishlistId', requireAuth, asyncHandler(wishlistController.deleteWishlist));

/**
 * Add an agent to a wishlist
 * @route POST /api/wishlists/{wishlistId}/agents/{agentId}
 * @group Wishlists - Wishlist operations
 * @param {string} wishlistId.path.required - Wishlist ID
 * @param {string} agentId.path.required - Agent ID
 * @security BearerAuth
 * @returns {Wishlist} 200 - Updated wishlist
 * @returns {ErrorResponse} 400 - Agent already in wishlist
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not wishlist owner
 * @returns {ErrorResponse} 404 - Wishlist or agent not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/:wishlistId/agents/:agentId', requireAuth, asyncHandler(wishlistController.addToWishlist));

/**
 * Remove an agent from a wishlist
 * @route DELETE /api/wishlists/{wishlistId}/agents/{agentId}
 * @group Wishlists - Wishlist operations
 * @param {string} wishlistId.path.required - Wishlist ID
 * @param {string} agentId.path.required - Agent ID
 * @security BearerAuth
 * @returns {Wishlist} 200 - Updated wishlist
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not wishlist owner
 * @returns {ErrorResponse} 404 - Wishlist or agent not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.delete('/:wishlistId/agents/:agentId', requireAuth, asyncHandler(wishlistController.removeFromWishlist));

/**
 * Toggle an agent in a wishlist
 * @route PUT /api/wishlists/{wishlistId}/agents/{agentId}/toggle
 * @group Wishlists - Wishlist operations
 * @param {string} wishlistId.path.required - Wishlist ID
 * @param {string} agentId.path.required - Agent ID
 * @security BearerAuth
 * @returns {Wishlist} 200 - Updated wishlist
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not wishlist owner
 * @returns {ErrorResponse} 404 - Wishlist or agent not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.put('/:wishlistId/agents/:agentId/toggle', requireAuth, asyncHandler(wishlistController.toggleWishlistItem));

/**
 * Check if an agent is in any of the user's wishlists
 * @route GET /api/wishlists/agents/{agentId}/check
 * @group Wishlists - Wishlist operations
 * @param {string} agentId.path.required - Agent ID
 * @security BearerAuth
 * @returns {object} 200 - Result with inWishlist boolean and wishlistId if found
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/agents/:agentId/check', requireAuth, asyncHandler(wishlistController.checkWishlistItem));

module.exports = router; 