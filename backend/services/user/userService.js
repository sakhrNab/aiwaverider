/**
 * User Service
 * 
 * Handles business logic for user management operations.
 */

const bcrypt = require('bcryptjs');
const userRepository = require('../../repositories/userRepository');
const logger = require('../../utils/logger');

// Maximum failed login attempts before account lock
const MAX_LOGIN_ATTEMPTS = 5;

class UserService {
  /**
   * Get a user by ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - The user object
   * @throws {Error} - If user not found
   */
  static async getUserById(userId) {
    try {
      const user = await userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      logger.error(`Error getting user by ID: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * Get a user by email
   * @param {string} email - The user's email
   * @returns {Promise<Object>} - The user object
   * @throws {Error} - If user not found
   */
  static async getUserByEmail(email) {
    try {
      const user = await userRepository.findByEmail(email);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      logger.error(`Error getting user by email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all users with pagination and filtering
   * @param {Object} options - Options for pagination and filtering
   * @returns {Promise<Object>} - Paginated results of users
   */
  static async getAllUsers(options = {}) {
    try {
      return await userRepository.findAll(options);
    } catch (error) {
      logger.error(`Error getting all users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - User data for creation
   * @returns {Promise<Object>} - The created user
   * @throws {Error} - If validation fails
   */
  static async createUser(userData) {
    try {
      // Check if email is already in use
      const existingUser = await userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('Email already in use');
      }
      
      // Hash password if provided (for local auth)
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      
      // Create new user
      const user = await userRepository.create(userData);
      
      // Sanitize sensitive data before returning
      if (user.password) delete user.password;
      
      return user;
    } catch (error) {
      logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing user
   * @param {string} userId - The user ID to update
   * @param {Object} updateData - The data to update
   * @returns {Promise<Object>} - The updated user
   * @throws {Error} - If user not found or validation fails
   */
  static async updateUser(userId, updateData) {
    try {
      // Check if user exists
      const existingUser = await userRepository.findById(userId);
      if (!existingUser) {
        throw new Error('User not found');
      }
      
      // If updating email, check if it's already in use by another user
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailUser = await userRepository.findByEmail(updateData.email);
        if (emailUser && emailUser.id !== userId) {
          throw new Error('Email already in use');
        }
      }
      
      // Update user
      const user = await userRepository.update(userId, updateData);
      
      // Sanitize sensitive data before returning
      if (user.password) delete user.password;
      
      return user;
    } catch (error) {
      logger.error(`Error updating user: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * Delete a user
   * @param {string} userId - The user ID to delete
   * @returns {Promise<Object>} - Result of the deletion
   * @throws {Error} - If user not found or cannot be deleted
   */
  static async deleteUser(userId) {
    try {
      // Check if user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if this is the last admin user
      if (user.role === 'admin') {
        const adminCount = await userRepository.countAdminUsers();
        if (adminCount <= 1) {
          throw new Error('Cannot delete the last admin user');
        }
      }
      
      // Delete user
      return await userRepository.delete(userId);
    } catch (error) {
      logger.error(`Error deleting user: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId - The user ID
   * @param {string} currentPassword - Current password for verification
   * @param {string} newPassword - New password to set
   * @returns {Promise<Object>} - Result of the password change
   * @throws {Error} - If validation fails
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      // Check if user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      return await userRepository.updatePassword(userId, hashedPassword);
    } catch (error) {
      logger.error(`Error changing password: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * Update login information after successful login
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - Updated user data
   */
  static async updateLoginInfo(userId) {
    try {
      // Check if user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update login information
      return await userRepository.update(userId, {
        lastLogin: new Date(),
        loginAttempts: 0 // Reset login attempts on successful login
      });
    } catch (error) {
      logger.error(`Error updating login info: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * Increment failed login attempts
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - Updated user data
   */
  static async incrementLoginAttempts(userId) {
    try {
      // Check if user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const attempts = user.loginAttempts + 1;
      
      // Basic update for increment
      const updateData = {
        loginAttempts: attempts
      };
      
      // Lock account if max attempts reached
      if (attempts >= MAX_LOGIN_ATTEMPTS && user.isActive) {
        Object.assign(updateData, {
          isActive: false,
          accountLocked: true,
          accountLockedReason: 'Too many failed login attempts',
          accountLockedDate: new Date()
        });
        
        logger.warn(`User account locked due to too many failed login attempts: ${userId}`);
      }
      
      // Update user
      return await userRepository.update(userId, updateData);
    } catch (error) {
      logger.error(`Error incrementing login attempts: ${error.message}`, { userId });
      throw error;
    }
  }
}

module.exports = UserService; 