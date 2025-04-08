/**
 * Order Service
 * 
 * Handles business logic for order processing, template delivery, and order management
 */

const { v4: uuidv4 } = require('uuid');
const mailer = require('../../utils/mailer');
const logger = require('../../utils/logger');
const orderRepository = require('../../repositories/orderRepository');
const agentRepository = require('../../repositories/agentRepository');
const userRepository = require('../../repositories/userRepository');

class OrderService {
  /**
   * Get agent template content
   * @param {string} agentId - The agent ID
   * @returns {Promise<string>} - The template content
   */
  async getAgentTemplate(agentId) {
    try {
      // Get agent from repository
      const agent = await agentRepository.getAgentById(agentId);
      
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      // Check if agent has a template
      if (!agent.template && !agent.templateUrl) {
        // Generate a basic template if none exists
        return this.generateBasicTemplate(agent);
      }
      
      // Return the template content
      return agent.template || `Please download the template from: ${agent.templateUrl}`;
    } catch (error) {
      logger.error(`Error getting agent template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a basic template based on agent information
   * @param {Object} agent - The agent data
   * @returns {string} - A basic template
   */
  generateBasicTemplate(agent) {
    return `
# ${agent.title} - AI Agent Template

## Description
${agent.description || 'An AI agent to assist with your tasks.'}

## Instructions
1. Copy the entire content below this line into your favorite AI platform
2. Modify any details specific to your needs
3. Enjoy using your new AI agent!

---

You are ${agent.title}, an AI agent designed to ${agent.description || 'assist users with various tasks'}.

${agent.features ? 'Your key features include:\n' + agent.features.map(f => `- ${f}`).join('\n') : ''}

When a user interacts with you, provide helpful, accurate, and concise responses. 
Be friendly and professional in your tone.

You can help users with:
- Understanding concepts related to ${agent.category || 'AI and technology'}
- Providing information and answering questions
- Assisting with tasks and problem-solving

Remember to be respectful, maintain user privacy, and clarify when you're uncertain about something.
`;
  }

  /**
   * Create a new order record
   * @param {Object} orderData - The order data
   * @returns {Promise<Object>} - The created order
   */
  async createOrder(orderData) {
    try {
      // Generate order ID if not provided
      const orderId = orderData.orderId || uuidv4();
      
      // Create order object
      const order = {
        id: orderId,
        userId: orderData.userId,
        userEmail: orderData.userEmail,
        items: orderData.items || [],
        total: orderData.total || 0,
        currency: orderData.currency || 'USD',
        status: orderData.status || 'pending',
        paymentId: orderData.paymentId,
        paymentMethod: orderData.paymentMethod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deliveryStatus: 'pending',
        metadata: orderData.metadata || {}
      };
      
      // Use repository to save the order
      return await orderRepository.createOrder(order);
    } catch (error) {
      logger.error(`Error creating order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process payment success and deliver templates
   * @param {Object} paymentData - Payment data from the payment provider
   * @returns {Promise<Object>} - Processing result
   */
  async processPaymentSuccess(paymentData) {
    try {
      // Extract metadata from payment
      const metadata = paymentData.metadata || {};
      const items = Array.isArray(paymentData.items) ? paymentData.items : [];
      
      // Get customer info
      const email = paymentData.customer?.email || metadata.email || null;
      const userId = paymentData.customer?.id || metadata.userId || null;
      
      // Extract order details
      const orderData = {
        orderId: metadata.order_id || uuidv4(),
        userId: userId,
        userEmail: email,
        items: items,
        total: paymentData.amount / 100, // Convert from cents
        currency: paymentData.currency?.toUpperCase() || 'USD',
        status: 'completed',
        paymentId: paymentData.id,
        paymentMethod: paymentData.payment_method_types?.[0] || 'card',
        metadata
      };
      
      // Create order record
      const order = await this.createOrder(orderData);
      
      // Skip template delivery if no email is provided
      if (!email) {
        logger.warn(`Cannot deliver templates: No email provided for order ${order.id}`);
        return {
          success: true,
          orderId: order.id,
          deliveryStatus: 'skipped',
          message: 'Order created but templates not delivered (no email)'
        };
      }
      
      // Deliver templates for each item
      const deliveryResults = [];
      
      for (const item of items) {
        try {
          // Get agent details using repository
          const agentId = item.id;
          const agent = await agentRepository.getAgentById(agentId);
          
          if (!agent) {
            deliveryResults.push({
              agentId,
              success: false,
              error: 'Agent not found'
            });
            continue;
          }
          
          // Get template content
          const templateContent = await this.getAgentTemplate(agentId);
          
          // Get user's name if available
          let userName = 'Valued Customer';
          if (userId) {
            const user = await userRepository.getUserById(userId);
            if (user) {
              userName = user.displayName || user.firstName || 'Valued Customer';
            }
          }
          
          // Send email with template
          const emailResult = await mailer.sendAgentPurchaseEmail({
            to: email,
            name: userName,
            agent: agent,
            templateContent: templateContent,
            orderId: order.id
          });
          
          // Record delivery result
          deliveryResults.push({
            agentId,
            success: true,
            messageId: emailResult.messageId
          });
          
        } catch (error) {
          logger.error(`Error delivering template for agent ${item.id}: ${error.message}`);
          
          deliveryResults.push({
            agentId: item.id,
            success: false,
            error: error.message
          });
        }
      }
      
      // Update order with delivery results
      const deliveryStatus = deliveryResults.every(r => r.success) ? 'completed' : 
                            deliveryResults.some(r => r.success) ? 'partial' : 'failed';
      
      // Use repository to update the order
      await orderRepository.updateOrder(order.id, {
        deliveryStatus,
        deliveryResults
      });
      
      return {
        success: true,
        orderId: order.id,
        deliveryStatus,
        deliveryResults
      };
    } catch (error) {
      logger.error(`Error processing payment success: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get order by ID
   * @param {string} orderId - The order ID
   * @returns {Promise<Object>} - The order
   */
  async getOrderById(orderId) {
    try {
      const order = await orderRepository.getOrderById(orderId);
      
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }
      
      return order;
    } catch (error) {
      logger.error(`Error getting order by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all orders for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - Array of orders
   */
  async getUserOrders(userId) {
    try {
      return await orderRepository.getUserOrders(userId);
    } catch (error) {
      logger.error(`Error getting user orders: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new OrderService(); 