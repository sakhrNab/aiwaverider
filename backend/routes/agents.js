// backend/routes/agents.js
const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const wishlistController = require('../controllers/wishlistController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const validateFirebaseToken = require('../middleware/authenticate');
const publicCacheMiddleware = require('../middleware/publicCacheMiddleware');

/**
 * @typedef {object} Agent
 * @property {string} id - Agent ID
 * @property {string} name - Agent name
 * @property {string} description - Agent description
 * @property {string} category - Agent category
 * @property {string} creatorId - Creator's user ID
 * @property {string} [imageUrl] - URL to agent's image
 * @property {Array<string>} [tags] - List of tags
 * @property {number} [rating] - Average rating (0-5)
 * @property {number} [downloadCount] - Number of downloads
 * @property {boolean} [featured] - Whether agent is featured
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last updated timestamp
 */

/**
 * @typedef {object} AgentFilters
 * @property {string} [category] - Filter by category
 * @property {string} [search] - Search query
 * @property {string} [tags] - Comma-separated list of tags
 * @property {string} [sort] - Sort field (e.g., 'rating', 'downloads', 'newest')
 * @property {string} [order] - Sort order ('asc' or 'desc')
 */

/**
 * @typedef {object} PaginatedAgents
 * @property {Array<Agent>} agents - List of agents
 * @property {number} total - Total count of agents
 * @property {number} [page] - Current page number
 * @property {number} [totalPages] - Total number of pages
 * @property {string} [nextCursor] - Cursor for next page
 */

/**
 * @typedef {object} ErrorResponse
 * @property {string} error - Error message
 * @property {number} status - HTTP status code
 */

/**
 * Get all agents with pagination and filtering
 * @route GET /api/agents
 * @group Agents - Agent management operations
 * @param {string} [category.query] - Filter by category
 * @param {string} [search.query] - Search term
 * @param {string} [tags.query] - Comma-separated list of tags
 * @param {string} [sort.query=createdAt] - Sort field
 * @param {string} [order.query=desc] - Sort order (asc/desc)
 * @param {number} [page.query=1] - Page number
 * @param {number} [limit.query=10] - Items per page
 * @param {string} [cursor.query] - Cursor for pagination
 * @returns {PaginatedAgents} 200 - List of agents
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/', asyncHandler(agentController.getAgents));

/**
 * Get featured agents
 * @route GET /api/agents/featured
 * @group Agents - Agent management operations
 * @param {number} [limit.query=6] - Number of agents to return
 * @returns {Array<Agent>} 200 - List of featured agents
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/featured', asyncHandler(agentController.getFeaturedAgents));

/**
 * Get agents grouped by categories
 * @route GET /api/agents/categories
 * @group Agents - Agent management operations
 * @param {number} [limit.query=4] - Number of agents per category
 * @returns {object} 200 - Agents grouped by category
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/categories', asyncHandler(agentController.getAgentsByCategory));

/**
 * Get top rated agents
 * @route GET /api/agents/top-rated
 * @group Agents - Agent management operations
 * @param {number} [limit.query=6] - Number of agents to return
 * @returns {Array<Agent>} 200 - List of top rated agents
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/top-rated', asyncHandler(agentController.getTopRatedAgents));

/**
 * Get newest agents
 * @route GET /api/agents/newest
 * @group Agents - Agent management operations
 * @param {number} [limit.query=6] - Number of agents to return
 * @returns {Array<Agent>} 200 - List of newest agents
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/newest', asyncHandler(agentController.getNewestAgents));

/**
 * Get agents by creator
 * @route GET /api/agents/creator/{creatorId}
 * @group Agents - Agent management operations
 * @param {string} creatorId.path.required - Creator's user ID
 * @param {number} [limit.query=10] - Number of agents to return
 * @returns {Array<Agent>} 200 - List of agents by creator
 * @returns {ErrorResponse} 404 - Creator not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/creator/:creatorId', asyncHandler(agentController.getAgentsByCreator));

/**
 * Get agent by ID
 * @route GET /api/agents/{agentId}
 * @group Agents - Agent management operations
 * @param {string} agentId.path.required - Agent ID
 * @returns {Agent} 200 - Agent details
 * @returns {ErrorResponse} 404 - Agent not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/:agentId', asyncHandler(agentController.getAgentById));

/**
 * Get similar agents
 * @route GET /api/agents/{agentId}/similar
 * @group Agents - Agent management operations
 * @param {string} agentId.path.required - Agent ID
 * @param {number} [limit.query=4] - Number of similar agents to return
 * @returns {Array<Agent>} 200 - List of similar agents
 * @returns {ErrorResponse} 404 - Agent not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/:agentId/similar', asyncHandler(agentController.getSimilarAgents));

/**
 * Get agent by document ID
 * @route GET /api/agents/doc/{docId}
 * @group Agents - Agent management operations
 * @param {string} docId.path.required - Firebase document ID
 * @returns {Agent} 200 - Agent details
 * @returns {ErrorResponse} 404 - Agent not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/doc/:docId', publicCacheMiddleware({ duration: 600 }), (req, res) => {
  // Set the agentId parameter to the docId and forward to the getAgentById controller
  req.params.id = req.params.docId;
  return agentController.getAgentById(req, res);
});

/**
 * Get agent by numeric ID
 * @route GET /api/agents/agent-{numericId}
 * @group Agents - Agent management operations
 * @param {number} numericId.path.required - Numeric agent ID
 * @returns {Agent} 200 - Agent details
 * @returns {ErrorResponse} 404 - Agent not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/agent-:numericId([0-9]+)', publicCacheMiddleware({ duration: 600 }), (req, res) => {
  // Set the agentId parameter and forward to the getAgentById controller
  // This captures 'agent-41' format directly using route parameter
  const agentId = `agent-${req.params.numericId}`;
  console.log(`Special route captured agent-XX format: ${agentId}`);
  req.params.id = agentId;
  return agentController.getAgentById(req, res);
});

/**
 * Get download count for an agent
 * @route GET /api/agents/{agentId}/downloads
 * @group Agents - Agent management operations
 * @param {string} agentId.path.required - Agent ID
 * @returns {object} 200 - Download count
 * @returns {ErrorResponse} 404 - Agent not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/:agentId/downloads', (req, res) => {
  res.status(501).json({ 
    error: 'Get download count functionality not yet implemented',
    message: 'This endpoint will be available in a future update'
  });
});

/**
 * Increment download count
 * @route POST /api/agents/{agentId}/downloads
 * @group Agents - Agent management operations
 * @param {string} agentId.path.required - Agent ID
 * @security FirebaseToken
 * @returns {object} 200 - Updated download count
 * @returns {ErrorResponse} 404 - Agent not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/:agentId/downloads', validateFirebaseToken, (req, res) => {
  res.status(501).json({ 
    error: 'Increment download count functionality not yet implemented',
    message: 'This endpoint will be available in a future update'
  });
});

/**
 * Get user's wishlists
 * @route GET /api/agents/wishlists
 * @group Wishlists - Wishlist operations
 * @security FirebaseToken
 * @returns {Array<object>} 200 - User's wishlists
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/wishlists', validateFirebaseToken, asyncHandler(wishlistController.getUserWishlists));

/**
 * Toggle agent in wishlist
 * @route POST /api/agents/wishlists/{agentId}
 * @group Wishlists - Wishlist operations
 * @param {string} agentId.path.required - Agent ID
 * @security FirebaseToken
 * @returns {object} 200 - Updated wishlist
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 404 - Agent not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/wishlists/:agentId', validateFirebaseToken, asyncHandler(wishlistController.toggleWishlist));

/**
 * Get wishlist by ID
 * @route GET /api/agents/wishlists/{wishlistId}
 * @group Wishlists - Wishlist operations
 * @param {string} wishlistId.path.required - Wishlist ID
 * @security FirebaseToken
 * @returns {object} 200 - Wishlist details
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 404 - Wishlist not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/wishlists/:wishlistId', validateFirebaseToken, asyncHandler(wishlistController.getWishlistById));

/**
 * Create a new agent
 * @route POST /api/agents
 * @group Agents - Agent management operations
 * @param {string} name.body.required - Agent name
 * @param {string} description.body.required - Agent description
 * @param {string} category.body.required - Agent category
 * @param {Array<string>} [tags.body] - Agent tags
 * @param {file} [image.formData] - Agent image
 * @security FirebaseToken
 * @returns {Agent} 201 - Created agent
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not admin
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/', validateFirebaseToken, (req, res) => {
  // Temporary placeholder until createAgent is implemented
  res.status(501).json({ 
    error: 'Create agent functionality not yet implemented',
    message: 'This endpoint will be available in a future update'
  });
});

/**
 * Update an agent
 * @route PATCH /api/agents/{agentId}
 * @group Agents - Agent management operations
 * @param {string} agentId.path.required - Agent ID
 * @param {string} [name.body] - Agent name
 * @param {string} [description.body] - Agent description
 * @param {string} [category.body] - Agent category
 * @param {Array<string>} [tags.body] - Agent tags
 * @param {boolean} [featured.body] - Whether agent is featured
 * @param {file} [image.formData] - Agent image
 * @security FirebaseToken
 * @returns {Agent} 200 - Updated agent
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not admin
 * @returns {ErrorResponse} 404 - Agent not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.patch('/:agentId', validateFirebaseToken, (req, res) => {
  res.status(501).json({ 
    error: 'Update agent functionality not yet implemented',
    message: 'This endpoint will be available in a future update'
  });
});

/**
 * Delete an agent
 * @route DELETE /api/agents/{agentId}
 * @group Agents - Agent management operations
 * @param {string} agentId.path.required - Agent ID
 * @security FirebaseToken
 * @returns {object} 200 - Success message
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not admin
 * @returns {ErrorResponse} 404 - Agent not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.delete('/:agentId', validateFirebaseToken, (req, res) => {
  res.status(501).json({ 
    error: 'Delete agent functionality not yet implemented',
    message: 'This endpoint will be available in a future update'
  });
});

// Development endpoint - only available in development environment
if (process.env.NODE_ENV === 'development') {
  /**
   * Seed database with sample agents
   * @route POST /api/agents/seed
   * @group Development - Development only endpoints
   * @returns {object} 200 - Success message
   * @returns {ErrorResponse} 500 - Server error
   */
  router.post('/seed', (req, res) => {
    res.status(501).json({ 
      error: 'Seed agent functionality not yet implemented',
      message: 'This endpoint will be available in a future update'
    });
  });
}

module.exports = router; 