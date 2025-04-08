/**
 * Order Routes
 * 
 * API endpoints for order management
 * @module routes/orders
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');

/**
 * @typedef {object} Order
 * @property {string} id - Order ID
 * @property {string} userId - ID of user who placed the order
 * @property {string} agentId - ID of the agent being purchased
 * @property {number} amount - Order amount
 * @property {string} currency - Currency code (e.g., USD)
 * @property {string} status - Order status (pending, completed, failed)
 * @property {string} paymentIntentId - Payment processor's intent/transaction ID
 * @property {object} [metadata] - Additional order metadata
 * @property {string} createdAt - Order creation timestamp
 * @property {string} updatedAt - Last updated timestamp
 */

/**
 * @typedef {object} PaymentData
 * @property {string} paymentIntentId - Payment processor's intent/transaction ID
 * @property {string} status - Payment status
 * @property {object} [metadata] - Additional payment metadata
 */

/**
 * @typedef {object} ErrorResponse
 * @property {string} error - Error message
 * @property {number} status - HTTP status code
 */

/**
 * Get order by ID
 * @route GET /api/orders/{orderId}
 * @group Orders - Order management operations
 * @param {string} orderId.path.required - Order ID
 * @security BearerAuth
 * @returns {Order} 200 - Order details
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not order owner or admin
 * @returns {ErrorResponse} 404 - Order not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get(
  '/:orderId',
  requireAuth,
  asyncHandler(async (req, res) => {
    return await orderController.getOrderById(req, res);
  })
);

/**
 * Get all orders for a user
 * @route GET /api/orders/user/{userId}
 * @group Orders - Order management operations
 * @param {string} userId.path.required - User ID
 * @security BearerAuth
 * @returns {Array<Order>} 200 - List of orders
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not order owner or admin
 * @returns {ErrorResponse} 500 - Server error
 */
router.get(
  '/user/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    // Check if user is requesting their own orders or if admin
    if (req.user.id !== userId && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Not authorized to access these orders'
      });
    }
    
    return await orderController.getUserOrders(req, res);
  })
);

/**
 * Create a new order
 * @route POST /api/orders
 * @group Orders - Order management operations
 * @param {string} agentId.body.required - Agent ID
 * @param {number} amount.body.required - Order amount
 * @param {string} currency.body.required - Currency code
 * @param {string} [userId.body] - User ID (defaults to authenticated user)
 * @param {object} [metadata.body] - Additional order metadata
 * @security BearerAuth
 * @returns {Order} 201 - Created order
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if creating order for another user
 * @returns {ErrorResponse} 500 - Server error
 */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Set user ID from authenticated user if not provided
    if (!req.body.userId) {
      req.body.userId = req.user.id;
    }
    
    // Check if user is creating order for themselves or if admin
    if (req.body.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Not authorized to create orders for other users'
      });
    }
    
    return await orderController.createOrder(req, res);
  })
);

/**
 * Process successful payment
 * @route POST /api/orders/payment-success
 * @group Orders - Order management operations
 * @param {PaymentData} request.body.required - Payment data from payment processor
 * @returns {Order} 200 - Updated order
 * @returns {ErrorResponse} 400 - Invalid payment data
 * @returns {ErrorResponse} 404 - Order not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.post(
  '/payment-success',
  asyncHandler(async (req, res) => {
    // This is typically called by payment provider webhook
    // Add validation for webhook signature if needed
    
    return await orderController.processPaymentSuccess(req, res);
  })
);

/**
 * Get agent template content
 * @route GET /api/orders/template/{agentId}
 * @group Orders - Order management operations
 * @param {string} agentId.path.required - Agent ID
 * @security BearerAuth
 * @returns {object} 200 - Agent template content
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 404 - Agent or template not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get(
  '/template/:agentId',
  requireAuth,
  asyncHandler(async (req, res) => {
    return await orderController.getAgentTemplate(req, res);
  })
);

module.exports = router; 