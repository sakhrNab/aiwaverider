/**
 * Profile Repository
 * Handles database operations for user profiles
 */
const { db } = require('../config/firebase');
const logger = require('../utils/logger');

class ProfileRepository {
  constructor() {
    this.collection = db.collection('users');
  }

  /**
   * Get a user profile by ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object|null>} The user profile or null if not found
   */
  async getProfileById(userId) {
    try {
      const userDoc = await this.collection.doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }
      
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    } catch (error) {
      logger.error(`Error getting profile by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a user profile
   * @param {string} userId - The user ID
   * @param {Object} updateData - The data to update
   * @returns {Promise<Object>} The updated profile
   */
  async updateProfile(userId, updateData) {
    try {
      await this.collection.doc(userId).update(updateData);
      
      // Get the updated document
      return this.getProfileById(userId);
    } catch (error) {
      logger.error(`Error updating profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user avatar
   * @param {string} userId - The user ID
   * @param {string} photoURL - The URL of the photo
   * @returns {Promise<Object>} The updated profile
   */
  async updateAvatar(userId, photoURL) {
    try {
      await this.collection.doc(userId).update({ photoURL });
      
      // Get the updated document
      return this.getProfileById(userId);
    } catch (error) {
      logger.error(`Error updating avatar: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user interests
   * @param {string} userId - The user ID
   * @param {Array<string>} interests - The array of interests
   * @returns {Promise<Object>} The updated profile
   */
  async updateInterests(userId, interests) {
    try {
      await this.collection.doc(userId).update({ interests });
      
      // Get the updated document
      return this.getProfileById(userId);
    } catch (error) {
      logger.error(`Error updating interests: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a username is already taken
   * @param {string} username - The username to check
   * @param {string} excludeUserId - User ID to exclude from the check (for updates)
   * @returns {Promise<boolean>} True if username is taken, false otherwise
   */
  async isUsernameTaken(username, excludeUserId = null) {
    try {
      let query = this.collection.where('username', '==', username);
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return false;
      }
      
      // If we're updating a user, we need to exclude that user from the check
      if (excludeUserId) {
        // Check if the only document found is the one we're updating
        return snapshot.docs.some(doc => doc.id !== excludeUserId);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error checking if username is taken: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update notification settings
   * @param {string} userId - The user ID
   * @param {Object} settings - Notification settings object
   * @returns {Promise<Object>} The updated profile
   */
  async updateNotificationSettings(userId, settings) {
    try {
      await this.collection.doc(userId).update({ notifications: settings });
      
      // Get the updated document
      return this.getProfileById(userId);
    } catch (error) {
      logger.error(`Error updating notification settings: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ProfileRepository(); 