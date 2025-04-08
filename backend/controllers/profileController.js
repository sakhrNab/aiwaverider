/**
 * Profile Controller
 * 
 * Handles HTTP requests related to user profiles, using the service layer
 */

const profileService = require('../services/profile/profileService');
const logger = require('../utils/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const { AppError } = require('../middleware/errorHandler');

/**
 * Setup multer storage for file uploads
 */
const multerStorage = multer.memoryStorage();

/**
 * Filter files to ensure only images are uploaded
 */
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

/**
 * Configure multer
 */
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * Middleware to handle avatar upload
 */
exports.uploadUserAvatar = upload.single('avatar');

/**
 * Middleware to resize avatar
 */
exports.resizeUserAvatar = async (req, res, next) => {
  try {
    if (!req.file) return next();

    // Format filename
    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    // Process image
    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/users/${req.file.filename}`);

    next();
  } catch (err) {
    logger.error('Error resizing user avatar:', err);
    return next(new AppError('Error processing image', 500));
  }
};

/**
 * Get user's own profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    logger.debug(`Getting profile for user: ${userId}`);

    const profile = await profileService.getProfileById(userId);

    res.status(200).json({
      status: 'success',
      data: { profile }
    });
  } catch (err) {
    logger.error('Error getting user profile:', err);
    return next(err);
  }
};

/**
 * Get a user profile by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getProfileById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const profile = await profileService.getProfileById(userId);
    
    return res.json(profile);
  } catch (error) {
    logger.error(`Controller error getting profile by ID: ${error.message}`);
    
    return res.status(error.statusCode || 500).json({
      error: error.message
    });
  }
};

/**
 * Update the current user's profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    logger.debug(`Updating profile for user: ${userId}`);

    // Prevent password updates via this route
    if (req.body.password || req.body.passwordConfirm) {
      return next(new AppError('This route is not for password updates. Please use /updatePassword.', 400));
    }

    const updatedProfile = await profileService.updateProfile(userId, req.body);

    res.status(200).json({
      status: 'success',
      data: { user: updatedProfile }
    });
  } catch (err) {
    logger.error('Error updating user profile:', err);
    return next(err);
  }
};

/**
 * Upload and update user's avatar
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload an image file', 400));
    }

    const userId = req.user.id;
    logger.debug(`Updating avatar for user: ${userId}`);

    // Generate photo URL
    const photoURL = `/img/users/${req.file.filename}`;
    
    const updatedProfile = await profileService.updateAvatar(userId, photoURL);

    res.status(200).json({
      status: 'success',
      data: { user: updatedProfile }
    });
  } catch (err) {
    logger.error('Error updating user avatar:', err);
    return next(err);
  }
};

/**
 * Update user's interests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateInterests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { interests } = req.body;
    
    if (!interests || !Array.isArray(interests)) {
      return next(new AppError('Please provide an array of interests', 400));
    }

    logger.debug(`Updating interests for user: ${userId}`);

    const updatedProfile = await profileService.updateInterests(userId, interests);

    res.status(200).json({
      status: 'success',
      data: { user: updatedProfile }
    });
  } catch (err) {
    logger.error('Error updating user interests:', err);
    return next(err);
  }
};

/**
 * Update user's notification settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateNotificationSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const settings = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return next(new AppError('Please provide notification settings as an object', 400));
    }

    logger.debug(`Updating notification settings for user: ${userId}`);

    const updatedProfile = await profileService.updateNotificationSettings(userId, settings);

    res.status(200).json({
      status: 'success',
      data: { user: updatedProfile }
    });
  } catch (err) {
    logger.error('Error updating notification settings:', err);
    return next(err);
  }
}; 