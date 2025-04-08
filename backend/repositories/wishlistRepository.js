const db = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Repository class for handling wishlist data operations
 */
class WishlistRepository {
  constructor() {
    this.collection = 'wishlists';
    this.db = db;
  }

  /**
   * Create a new wishlist
   * @param {Object} wishlistData - Data for the wishlist to create
   * @returns {Promise<Object>} Created wishlist object with ID
   */
  async createWishlist(wishlistData) {
    try {
      const docRef = await this.db.collection(this.collection).add({
        ...wishlistData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const newWishlist = await docRef.get();
      return { id: docRef.id, ...newWishlist.data() };
    } catch (error) {
      logger.error(`Error creating wishlist: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Get a wishlist by ID
   * @param {string} wishlistId - ID of the wishlist to retrieve
   * @returns {Promise<Object|null>} Wishlist object or null if not found
   */
  async getWishlistById(wishlistId) {
    try {
      const doc = await this.db.collection(this.collection).doc(wishlistId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      logger.error(`Error getting wishlist by ID: ${error.message}`, { wishlistId, error });
      throw error;
    }
  }

  /**
   * Get all public wishlists with pagination
   * @param {number} limit - Number of wishlists to retrieve
   * @param {string} lastId - Last wishlist ID for pagination
   * @returns {Promise<Array>} List of public wishlists
   */
  async getPublicWishlists(limit = 10, lastId = null) {
    try {
      let query = this.db.collection(this.collection)
        .where('isPublic', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(limit);
      
      if (lastId) {
        const lastDoc = await this.db.collection(this.collection).doc(lastId).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }
      
      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error(`Error getting public wishlists: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Get all wishlists for a specific user
   * @param {string} userId - User ID to get wishlists for
   * @returns {Promise<Array>} List of user's wishlists
   */
  async getUserWishlists(userId) {
    try {
      const snapshot = await this.db.collection(this.collection)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error(`Error getting user wishlists: ${error.message}`, { userId, error });
      throw error;
    }
  }

  /**
   * Update an existing wishlist
   * @param {string} wishlistId - ID of the wishlist to update
   * @param {Object} updateData - Data to update in the wishlist
   * @returns {Promise<Object>} Updated wishlist
   */
  async updateWishlist(wishlistId, updateData) {
    try {
      const updateObj = {
        ...updateData,
        updatedAt: new Date()
      };
      
      await this.db.collection(this.collection).doc(wishlistId).update(updateObj);
      
      const updated = await this.getWishlistById(wishlistId);
      return updated;
    } catch (error) {
      logger.error(`Error updating wishlist: ${error.message}`, { wishlistId, error });
      throw error;
    }
  }

  /**
   * Delete a wishlist
   * @param {string} wishlistId - ID of the wishlist to delete
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteWishlist(wishlistId) {
    try {
      await this.db.collection(this.collection).doc(wishlistId).delete();
      return true;
    } catch (error) {
      logger.error(`Error deleting wishlist: ${error.message}`, { wishlistId, error });
      throw error;
    }
  }

  /**
   * Check if an agent is in any of a user's wishlists
   * @param {string} userId - User ID to check wishlists for
   * @param {string} agentId - Agent ID to check for
   * @returns {Promise<boolean>} True if agent is in any wishlist
   */
  async isAgentInWishlists(userId, agentId) {
    try {
      const wishlists = await this.getUserWishlists(userId);
      
      return wishlists.some(wishlist => 
        wishlist.agents && wishlist.agents.some(agent => agent === agentId)
      );
    } catch (error) {
      logger.error(`Error checking if agent is in wishlists: ${error.message}`, { userId, agentId, error });
      throw error;
    }
  }
}

module.exports = new WishlistRepository(); 