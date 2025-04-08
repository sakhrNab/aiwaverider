/**
 * Wishlist Service
 * 
 * Handles business logic for wishlist management operations
 */

const wishlistRepository = require('../../repositories/wishlistRepository');
const agentService = require('../agent/agentService');
const logger = require('../../utils/logger');

class WishlistService {
  /**
   * Get all public wishlists with pagination
   * @param {Object} options - Options for pagination and filtering
   * @returns {Promise<Object>} - Paginated results of wishlists
   */
  static async getPublicWishlists(options = {}) {
    try {
      // Public wishlists have isPrivate set to false
      const publicOptions = {
        ...options,
        filters: {
          ...options.filters,
          isPrivate: false
        }
      };
      
      return await wishlistRepository.findAll(publicOptions);
    } catch (error) {
      logger.error(`Error getting public wishlists: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all wishlists for a specific user
   * @param {string} userId - The user ID
   * @param {Object} options - Options for pagination
   * @returns {Promise<Object>} - Paginated results of user's wishlists
   */
  static async getUserWishlists(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const userOptions = {
        ...options,
        filters: {
          ...options.filters,
          creatorId: userId
        }
      };
      
      return await wishlistRepository.findAll(userOptions);
    } catch (error) {
      logger.error(`Error getting user wishlists: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * Get a specific wishlist by ID
   * @param {string} wishlistId - The wishlist ID
   * @param {string} [userId] - Optional user ID to check permissions
   * @returns {Promise<Object>} - The wishlist
   * @throws {Error} - If wishlist not found or access denied
   */
  static async getWishlistById(wishlistId, userId = null) {
    try {
      const wishlist = await wishlistRepository.findById(wishlistId);
      
      if (!wishlist) {
        throw new Error('Wishlist not found');
      }
      
      // Check if private and not the creator
      if (wishlist.isPrivate && (!userId || wishlist.creatorId !== userId)) {
        throw new Error('Access denied to private wishlist');
      }
      
      // Get agent details for each item in the wishlist
      if (wishlist.items && wishlist.items.length > 0) {
        const agentIds = wishlist.items.map(item => item.agentId);
        const agents = await agentService.getAgentsByIds(agentIds);
        
        // Create a map for quick lookups
        const agentMap = {};
        agents.forEach(agent => {
          agentMap[agent.id] = agent;
        });
        
        // Attach agent details to wishlist items
        wishlist.items = wishlist.items.map(item => ({
          ...item,
          agent: agentMap[item.agentId] || null
        }));
      }
      
      return wishlist;
    } catch (error) {
      logger.error(`Error getting wishlist by ID: ${error.message}`, { wishlistId });
      throw error;
    }
  }

  /**
   * Create a new wishlist
   * @param {string} userId - The creator's user ID
   * @param {Object} wishlistData - The wishlist data
   * @returns {Promise<Object>} - The created wishlist
   */
  static async createWishlist(userId, wishlistData) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      if (!wishlistData.name) {
        throw new Error('Wishlist name is required');
      }
      
      const newWishlist = {
        ...wishlistData,
        creatorId: userId,
        isPrivate: wishlistData.isPrivate || false,
        items: wishlistData.items || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return await wishlistRepository.create(newWishlist);
    } catch (error) {
      logger.error(`Error creating wishlist: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * Update an existing wishlist
   * @param {string} wishlistId - The wishlist ID
   * @param {string} userId - The user ID
   * @param {Object} updateData - The data to update
   * @returns {Promise<Object>} - The updated wishlist
   * @throws {Error} - If wishlist not found or not authorized
   */
  static async updateWishlist(wishlistId, userId, updateData) {
    try {
      // Check if wishlist exists and user has permission
      const wishlist = await wishlistRepository.findById(wishlistId);
      
      if (!wishlist) {
        throw new Error('Wishlist not found');
      }
      
      if (wishlist.creatorId !== userId) {
        throw new Error('Not authorized to update this wishlist');
      }
      
      const updatedWishlist = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      return await wishlistRepository.update(wishlistId, updatedWishlist);
    } catch (error) {
      logger.error(`Error updating wishlist: ${error.message}`, { wishlistId, userId });
      throw error;
    }
  }

  /**
   * Delete a wishlist
   * @param {string} wishlistId - The wishlist ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - Result of the deletion
   * @throws {Error} - If wishlist not found or not authorized
   */
  static async deleteWishlist(wishlistId, userId) {
    try {
      // Check if wishlist exists and user has permission
      const wishlist = await wishlistRepository.findById(wishlistId);
      
      if (!wishlist) {
        throw new Error('Wishlist not found');
      }
      
      if (wishlist.creatorId !== userId) {
        throw new Error('Not authorized to delete this wishlist');
      }
      
      return await wishlistRepository.delete(wishlistId);
    } catch (error) {
      logger.error(`Error deleting wishlist: ${error.message}`, { wishlistId, userId });
      throw error;
    }
  }

  /**
   * Add an agent to a wishlist
   * @param {string} wishlistId - The wishlist ID
   * @param {string} userId - The user ID
   * @param {string} agentId - The agent ID
   * @returns {Promise<Object>} - The updated wishlist
   * @throws {Error} - If wishlist not found, not authorized, or agent already in wishlist
   */
  static async addToWishlist(wishlistId, userId, agentId) {
    try {
      // Check if wishlist exists and user has permission
      const wishlist = await wishlistRepository.findById(wishlistId);
      
      if (!wishlist) {
        throw new Error('Wishlist not found');
      }
      
      if (wishlist.creatorId !== userId) {
        throw new Error('Not authorized to modify this wishlist');
      }
      
      // Check if agent exists
      const agent = await agentService.getAgentById(agentId);
      
      // Check if agent already in wishlist
      const existingItem = wishlist.items.find(item => item.agentId === agentId);
      if (existingItem) {
        throw new Error('Agent is already in the wishlist');
      }
      
      // Add agent to wishlist
      const newItem = {
        agentId,
        addedAt: new Date().toISOString()
      };
      
      const updatedItems = [...wishlist.items, newItem];
      
      return await wishlistRepository.update(wishlistId, {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error adding to wishlist: ${error.message}`, { wishlistId, userId, agentId });
      throw error;
    }
  }

  /**
   * Remove an agent from a wishlist
   * @param {string} wishlistId - The wishlist ID
   * @param {string} userId - The user ID
   * @param {string} agentId - The agent ID
   * @returns {Promise<Object>} - The updated wishlist
   * @throws {Error} - If wishlist not found, not authorized, or agent not in wishlist
   */
  static async removeFromWishlist(wishlistId, userId, agentId) {
    try {
      // Check if wishlist exists and user has permission
      const wishlist = await wishlistRepository.findById(wishlistId);
      
      if (!wishlist) {
        throw new Error('Wishlist not found');
      }
      
      if (wishlist.creatorId !== userId) {
        throw new Error('Not authorized to modify this wishlist');
      }
      
      // Check if agent is in wishlist
      const itemIndex = wishlist.items.findIndex(item => item.agentId === agentId);
      if (itemIndex === -1) {
        throw new Error('Agent is not in the wishlist');
      }
      
      // Remove agent from wishlist
      const updatedItems = [...wishlist.items];
      updatedItems.splice(itemIndex, 1);
      
      return await wishlistRepository.update(wishlistId, {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error removing from wishlist: ${error.message}`, { wishlistId, userId, agentId });
      throw error;
    }
  }

  /**
   * Check if an agent is in a user's wishlists
   * @param {string} userId - The user ID
   * @param {string} agentId - The agent ID
   * @returns {Promise<Object>} - Result containing whether the agent is wishlisted
   */
  static async isAgentInWishlists(userId, agentId) {
    try {
      if (!userId || !agentId) {
        throw new Error('User ID and agent ID are required');
      }
      
      // Get all user's wishlists
      const userWishlists = await this.getUserWishlists(userId);
      
      // Check if agent is in any of the wishlists
      let isWishlisted = false;
      let wishlistId = null;
      
      for (const wishlist of userWishlists.wishlists) {
        if (wishlist.items.some(item => item.agentId === agentId)) {
          isWishlisted = true;
          wishlistId = wishlist.id;
          break;
        }
      }
      
      return {
        isWishlisted,
        wishlistId
      };
    } catch (error) {
      logger.error(`Error checking if agent is in wishlists: ${error.message}`, { userId, agentId });
      throw error;
    }
  }
}

module.exports = WishlistService; 