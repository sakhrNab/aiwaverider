/**
 * Order Controller
 * 
 * Handles HTTP requests related to orders, using the service layer
 */

const orderService = require('../services/order/orderService');
const logger = require('../utils/logger');

/**
 * Get agent template content
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAgentTemplate = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    const templateContent = await orderService.getAgentTemplate(agentId);
    
    return res.json({ 
      success: true,
      templateContent
    });
  } catch (error) {
    logger.error(`Controller error getting agent template: ${error.message}`);
    
    return res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message
    });
  }
};

/**
 * Create a new order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    if (!orderData) {
      return res.status(400).json({ error: 'Order data is required' });
    }
    
    const order = await orderService.createOrder(orderData);
    
    return res.status(201).json({ 
      success: true,
      order
    });
  } catch (error) {
    logger.error(`Controller error creating order: ${error.message}`);
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Process payment success
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.processPaymentSuccess = async (req, res) => {
  try {
    const paymentData = req.body;
    
    if (!paymentData) {
      return res.status(400).json({ error: 'Payment data is required' });
    }
    
    const result = await orderService.processPaymentSuccess(paymentData);
    
    return res.json(result);
  } catch (error) {
    logger.error(`Controller error processing payment: ${error.message}`);
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Get order by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    const order = await orderService.getOrderById(orderId);
    
    return res.json({ 
      success: true,
      order
    });
  } catch (error) {
    logger.error(`Controller error getting order by ID: ${error.message}`);
    
    return res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message
    });
  }
};

/**
 * Get orders for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const orders = await orderService.getUserOrders(userId);
    
    return res.json({ 
      success: true,
      orders
    });
  } catch (error) {
    logger.error(`Controller error getting user orders: ${error.message}`);
    
    return res.status(500).json({
      error: error.message
    });
  }
}; 