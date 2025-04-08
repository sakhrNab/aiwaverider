/**
 * User Routes
 * 
 * Routes for user management operations
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Admin
 */
router.get('/', requireAuth, requireAdmin, asyncHandler(userController.getUsers));

/**
 * @route   GET /api/users/:userId
 * @desc    Get user by ID
 * @access  Admin or user's own profile
 */
router.get('/:userId', requireAuth, asyncHandler(async (req, res, next) => {
  // Allow access if user is admin or is accessing their own profile
  if (req.user.role === 'admin' || req.user.id === req.params.userId) {
    return userController.getUserById(req, res, next);
  }
  return res.status(403).json({ error: 'Not authorized to access this user profile' });
}));

/**
 * @route   POST /api/users
 * @desc    Create a new user (admin only)
 * @access  Admin
 */
router.post('/', requireAuth, requireAdmin, asyncHandler(userController.createUser));

/**
 * @route   PUT /api/users/:userId
 * @desc    Update a user
 * @access  Admin or user's own profile
 */
router.put('/:userId', requireAuth, asyncHandler(async (req, res, next) => {
  // Allow access if user is admin or is updating their own profile
  if (req.user.role === 'admin' || req.user.id === req.params.userId) {
    return userController.updateUser(req, res, next);
  }
  return res.status(403).json({ error: 'Not authorized to update this user profile' });
}));

/**
 * @route   DELETE /api/users/:userId
 * @desc    Delete a user
 * @access  Admin or user's own profile
 */
router.delete('/:userId', requireAuth, asyncHandler(async (req, res, next) => {
  // Allow access if user is admin or is deleting their own profile
  if (req.user.role === 'admin' || req.user.id === req.params.userId) {
    return userController.deleteUser(req, res, next);
  }
  return res.status(403).json({ error: 'Not authorized to delete this user profile' });
}));

/**
 * @route   PATCH /api/users/:userId/password
 * @desc    Change user password
 * @access  Admin or user's own profile
 */
router.patch('/:userId/password', requireAuth, asyncHandler(async (req, res, next) => {
  // Allow access if user is admin or is changing their own password
  if (req.user.role === 'admin' || req.user.id === req.params.userId) {
    return userController.changePassword(req, res, next);
  }
  return res.status(403).json({ error: 'Not authorized to change this user password' });
}));

module.exports = router; 