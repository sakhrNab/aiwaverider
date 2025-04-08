/**
 * User Controller
 * 
 * Handles HTTP requests related to users, using the service layer
 */

const userService = require('../services/user/userService');
const logger = require('../utils/logger');

/**
 * Get all users with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, role, isActive, search } = req.query;
    
    const options = {
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      filters: {}
    };
    
    if (role) options.filters.role = role;
    if (isActive !== undefined) options.filters.isActive = isActive === 'true';
    if (search) options.filters.search = search;
    
    const result = await userService.getAllUsers(options);
    
    return res.json({ 
      success: true,
      ...result
    });
  } catch (error) {
    logger.error(`Controller error getting users: ${error.message}`);
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Get user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const user = await userService.getUserById(userId);
    
    return res.json({ 
      success: true,
      user
    });
  } catch (error) {
    logger.error(`Controller error getting user by ID: ${error.message}`);
    
    return res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message
    });
  }
};

/**
 * Create a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createUser = async (req, res) => {
  try {
    const userData = req.body;
    
    if (!userData) {
      return res.status(400).json({ error: 'User data is required' });
    }
    
    if (!userData.email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    if (!userData.password && !userData.provider) {
      return res.status(400).json({ error: 'Password is required for local accounts' });
    }
    
    const user = await userService.createUser(userData);
    
    return res.status(201).json({ 
      success: true,
      user
    });
  } catch (error) {
    logger.error(`Controller error creating user: ${error.message}`);
    
    // Handle common error cases with appropriate status codes
    if (error.message.includes('already in use')) {
      return res.status(409).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Update an existing user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Update data is required' });
    }
    
    // Prevent role escalation by non-admin users
    if (updateData.role && updateData.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to assign admin role' });
    }
    
    const user = await userService.updateUser(userId, updateData);
    
    return res.json({ 
      success: true,
      user
    });
  } catch (error) {
    logger.error(`Controller error updating user: ${error.message}`);
    
    // Handle common error cases
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('already in use')) {
      return res.status(409).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Delete a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    await userService.deleteUser(userId);
    
    return res.json({ 
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error(`Controller error deleting user: ${error.message}`);
    
    // Handle specific error cases
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('last admin user')) {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Change user password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.changePassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    await userService.changePassword(userId, currentPassword, newPassword);
    
    return res.json({ 
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error(`Controller error changing password: ${error.message}`);
    
    // Handle specific error cases
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('incorrect')) {
      return res.status(401).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: error.message
    });
  }
}; 