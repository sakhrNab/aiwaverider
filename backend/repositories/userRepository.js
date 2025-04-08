/**
 * User Repository
 * 
 * Abstracts database operations for users
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Initialize Firestore
const db = admin.firestore();

class UserRepository {
  /**
   * Get user by ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - The user
   */
  async getUserById(userId) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }
      
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    } catch (error) {
      logger.error(`Repository error getting user by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find user by ID (alias for getUserById for service compatibility)
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - The user
   */
  async findById(userId) {
    return this.getUserById(userId);
  }

  /**
   * Get user by email
   * @param {string} email - The user email
   * @returns {Promise<Object>} - The user
   */
  async getUserByEmail(email) {
    try {
      const usersSnapshot = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (usersSnapshot.empty) {
        return null;
      }
      
      const userDoc = usersSnapshot.docs[0];
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    } catch (error) {
      logger.error(`Repository error getting user by email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find user by email (alias for getUserByEmail for service compatibility)
   * @param {string} email - The user email
   * @returns {Promise<Object>} - The user
   */
  async findByEmail(email) {
    return this.getUserByEmail(email);
  }

  /**
   * Get all users
   * @param {Object} options - Query options (limit, offset, filters)
   * @returns {Promise<Array>} - Array of users
   */
  async getAllUsers(options = {}) {
    try {
      const { limit = 50, offset = 0, filters = {} } = options;
      
      let query = db.collection('users');
      
      // Apply filters
      Object.entries(filters).forEach(([field, value]) => {
        if (value !== undefined && value !== null) {
          query = query.where(field, '==', value);
        }
      });
      
      // Get total count (for pagination)
      const countSnapshot = await query.count().get();
      const totalCount = countSnapshot.data().count;
      
      // Apply pagination
      query = query.orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset);
      
      const usersSnapshot = await query.get();
      
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        users,
        pagination: {
          totalCount,
          limit,
          offset,
          hasMore: offset + users.length < totalCount
        }
      };
    } catch (error) {
      logger.error(`Repository error getting all users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find all users (alias for getAllUsers for service compatibility)
   * @param {Object} options - Query options (limit, offset, filters)
   * @returns {Promise<Array>} - Array of users
   */
  async findAll(options = {}) {
    return this.getAllUsers(options);
  }

  /**
   * Create a new user
   * @param {string} userId - The user ID
   * @param {Object} userData - The user data
   * @returns {Promise<Object>} - The created user
   */
  async createUser(userId, userData) {
    try {
      await db.collection('users').doc(userId).set({
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      return {
        id: userId,
        ...userData
      };
    } catch (error) {
      logger.error(`Repository error creating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a user
   * @param {string} userId - The user ID
   * @param {Object} updateData - The data to update
   * @returns {Promise<void>}
   */
  async updateUser(userId, updateData) {
    try {
      await db.collection('users').doc(userId).update({
        ...updateData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Repository error updating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a user
   * @param {string} userId - The user ID
   * @returns {Promise<void>}
   */
  async deleteUser(userId) {
    try {
      await db.collection('users').doc(userId).delete();
    } catch (error) {
      logger.error(`Repository error deleting user: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new UserRepository(); 