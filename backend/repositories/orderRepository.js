/**
 * Order Repository
 * 
 * Abstracts database operations for orders
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Initialize Firestore
const db = admin.firestore();

class OrderRepository {
  /**
   * Create a new order
   * @param {Object} orderData - The order data
   * @returns {Promise<Object>} - The created order
   */
  async createOrder(orderData) {
    try {
      const orderId = orderData.id;
      await db.collection('orders').doc(orderId).set(orderData);
      return { ...orderData };
    } catch (error) {
      logger.error(`Repository error creating order: ${error.message}`);
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
      const orderDoc = await db.collection('orders').doc(orderId).get();
      
      if (!orderDoc.exists) {
        return null;
      }
      
      return {
        id: orderDoc.id,
        ...orderDoc.data()
      };
    } catch (error) {
      logger.error(`Repository error getting order by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an order
   * @param {string} orderId - The order ID
   * @param {Object} updateData - The data to update
   * @returns {Promise<void>}
   */
  async updateOrder(orderId, updateData) {
    try {
      await db.collection('orders').doc(orderId).update({
        ...updateData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Repository error updating order: ${error.message}`);
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
      const ordersSnapshot = await db.collection('orders')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error(`Repository error getting user orders: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an order
   * @param {string} orderId - The order ID
   * @returns {Promise<void>}
   */
  async deleteOrder(orderId) {
    try {
      await db.collection('orders').doc(orderId).delete();
    } catch (error) {
      logger.error(`Repository error deleting order: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new OrderRepository(); 