/**
 * Profile Routes
 * 
 * Routes for user profile operations
 * @module routes/profile
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @typedef {object} Profile
 * @property {string} userId - User ID
 * @property {string} [bio] - User biography
 * @property {string} [avatarUrl] - URL to user's avatar
 * @property {Array<string>} [interests] - User's interests
 * @property {object} [notificationSettings] - User's notification preferences
 * @property {boolean} notificationSettings.emailNotifications - Email notification preference
 * @property {boolean} notificationSettings.pushNotifications - Push notification preference
 * @property {string} updatedAt - Last updated timestamp
 */

/**
 * @typedef {object} ErrorResponse
 * @property {string} error - Error message
 * @property {number} status - HTTP status code
 */

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

/**
 * Get logged in user's profile
 * @route GET /api/profile
 * @group Profile - User profile operations
 * @security BearerAuth
 * @returns {Profile} 200 - User profile information
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 404 - Profile not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/', requireAuth, asyncHandler(profileController.getProfile));

/**
 * Get user profile by ID
 * @route GET /api/profile/{userId}
 * @group Profile - User profile operations
 * @param {string} userId.path.required - User ID
 * @security BearerAuth
 * @returns {Profile} 200 - User profile information
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 404 - Profile not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/:userId', requireAuth, asyncHandler(profileController.getProfileById));

/**
 * Update user profile
 * @route PUT /api/profile
 * @group Profile - User profile operations
 * @param {string} bio.body - User biography
 * @security BearerAuth
 * @returns {Profile} 200 - Updated profile
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 500 - Server error
 */
router.put('/', requireAuth, asyncHandler(profileController.updateProfile));

/**
 * Upload and update user avatar
 * @route POST /api/profile/avatar
 * @group Profile - User profile operations
 * @param {file} avatar.formData.required - User avatar image
 * @security BearerAuth
 * @returns {Profile} 200 - Updated profile with avatar URL
 * @returns {ErrorResponse} 400 - Invalid file format or size
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/avatar', requireAuth, upload.single('avatar'), asyncHandler(profileController.uploadAvatar));

/**
 * Update user interests
 * @route PUT /api/profile/interests
 * @group Profile - User profile operations
 * @param {Array<string>} interests.body.required - Array of user interests
 * @security BearerAuth
 * @returns {Profile} 200 - Updated profile with interests
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 500 - Server error
 */
router.put('/interests', requireAuth, asyncHandler(profileController.updateInterests));

/**
 * Update user notification settings
 * @route PUT /api/profile/notifications
 * @group Profile - User profile operations
 * @param {boolean} emailNotifications.body - Email notification preference
 * @param {boolean} pushNotifications.body - Push notification preference
 * @security BearerAuth
 * @returns {Profile} 200 - Updated profile with notification settings
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 500 - Server error
 */
router.put('/notifications', requireAuth, asyncHandler(profileController.updateNotificationSettings));

module.exports = router; 