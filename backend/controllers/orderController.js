/**
 * Order Controller
 * 
 * Handles order processing, template delivery, and related functionalities
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// Initialize Firestore
const db = admin.firestore();

/**
 * Get agent template content
 * @param {string} agentId - The agent ID
 * @returns {Promise<string>} - The template content
 */
const getAgentTemplate = async (agentId) => {
  try {
    // Get agent from database
    const agentDoc = await db.collection('agents').doc(agentId).get();
    
    if (!agentDoc.exists) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    const agent = agentDoc.data();
    
    // Check if agent has a template
    if (!agent.template && !agent.templateUrl) {
      // Generate a basic template if none exists
      return generateBasicTemplate(agent);
    }
    
    // Return the template content
    return agent.template || `Please download the template from: ${agent.templateUrl}`;
  } catch (error) {
    logger.error(`Error getting agent template: ${error.message}`);
    throw error;
  }
};

/**
 * Generate a basic template based on agent information
 * @param {Object} agent - The agent data
 * @returns {string} - A basic template
 */
const generateBasicTemplate = (agent) => {
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
};

/**
 * Create a new order record
 * @param {Object} orderData - The order data
 * @returns {Promise<Object>} - The created order
 */
const createOrder = async (orderData) => {
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
    
    // Save order to database
    await db.collection('orders').doc(orderId).set(order);
    
    return { ...order };
  } catch (error) {
    logger.error(`Error creating order: ${error.message}`);
    throw error;
  }
};

/**
 * Process payment success and deliver templates
 * @param {Object} paymentData - Payment data from the payment provider
 * @returns {Promise<Object>} - Processing result
 */
const processPaymentSuccess = async (paymentData) => {
  try {
    // Extract metadata from payment
    const metadata = paymentData.metadata || {};
    const items = Array.isArray(paymentData.items) ? paymentData.items : [];
    
    // Get customer info - prioritize customer email, then metadata email, never use hardcoded default
    const email = paymentData.customer?.email || metadata.email || null;
    
    // Log email being used for confirmation
    if (email) {
      logger.info(`Using email address for order confirmation: ${email}`);
    } else {
      logger.warn(`No email address available for order confirmation - unable to send template`);
    }
    
    const userId = paymentData.customer?.id || metadata.userId || null;
    
    // Check if this is a SEPA payment
    const isSepaPayment = 
      paymentData.payment_method_types?.includes('sepa_credit_transfer') || 
      paymentData.payment_method_types?.includes('sepa_debit') ||
      metadata.payment_method === 'sepa_credit_transfer';
    
    // Extract order details
    const orderData = {
      orderId: metadata.order_id || uuidv4(),
      userId: userId,
      userEmail: email,
      items: items,
      total: paymentData.amount / 100, // Convert from cents
      currency: paymentData.currency?.toUpperCase() || 'USD',
      status: isSepaPayment ? 'pending' : 'completed', // SEPA payments start as pending
      paymentId: paymentData.id,
      paymentMethod: paymentData.payment_method_types?.[0] || metadata.payment_method || 'card',
      metadata
    };
    
    // Create order record
    const order = await createOrder(orderData);
    
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
        // Get agent details
        const agentId = item.id;
        const agentDoc = await db.collection('agents').doc(agentId).get();
        
        if (!agentDoc.exists) {
          deliveryResults.push({
            agentId,
            success: false,
            error: 'Agent not found'
          });
          continue;
        }
        
        const agent = agentDoc.data();
        
        // Get template content
        const templateContent = await getAgentTemplate(agentId);
        
        // Get user's name if available
        let userName = 'Valued Customer';
        if (userId) {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userName = userData.displayName || userData.firstName || 'Valued Customer';
          }
        }
        
        // Send email with template
        let emailSubject = 'Your AI Agent Purchase';
        let receiptUrl = '';
        
        // Customize for SEPA payments
        if (isSepaPayment) {
          emailSubject = 'Your SEPA Payment Received';
          if (orderData.status === 'pending') {
            emailSubject = 'Your SEPA Payment Initiated';
          }
          
          // Add payment reference to receipt URL if available
          if (paymentData.id) {
            receiptUrl = `/account/orders/${orderData.orderId}?payment_ref=${paymentData.id}`;
          }
        }
        
        // Send email with template
        const emailResult = await emailService.sendAgentPurchaseEmail({
          email: email,
          firstName: userName,
          agentName: agent.title || 'AI Agent',
          agentDescription: agent.description || 'Your new AI agent',
          price: item.price || 0,
          currency: orderData.currency || 'USD',
          receiptUrl: receiptUrl,
          orderId: orderData.orderId,
          orderDate: new Date().toLocaleDateString(), 
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.status
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
    
    await db.collection('orders').doc(order.id).update({
      deliveryStatus,
      deliveryResults,
      updatedAt: new Date().toISOString()
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
};

/**
 * Get order by ID
 * @param {string} orderId - The order ID
 * @returns {Promise<Object>} - The order
 */
const getOrderById = async (orderId) => {
  try {
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      throw new Error(`Order not found: ${orderId}`);
    }
    
    return orderDoc.data();
  } catch (error) {
    logger.error(`Error getting order: ${error.message}`);
    throw error;
  }
};

/**
 * Get orders for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} - Array of orders
 */
const getUserOrders = async (userId) => {
  try {
    const ordersSnapshot = await db.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const orders = [];
    ordersSnapshot.forEach(doc => {
      orders.push(doc.data());
    });
    
    return orders;
  } catch (error) {
    logger.error(`Error getting user orders: ${error.message}`);
    throw error;
  }
};

module.exports = {
  processPaymentSuccess,
  createOrder,
  getOrderById,
  getUserOrders,
  getAgentTemplate
}; 