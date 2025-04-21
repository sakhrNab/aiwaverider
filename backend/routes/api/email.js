/**
 * Email API Routes
 * 
 * Routes for email operations
 */

const express = require('express');
const router = express.Router();
const emailController = require('../../controllers/emailController');
const { adminMiddleware, authMiddleware } = require('../../middleware/auth');

// Routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/email/test
 * @desc    Send a test email
 * @access  Admin
 */
router.post('/test', adminMiddleware, emailController.sendTestEmail);

/**
 * @route   POST /api/email/welcome
 * @desc    Send a welcome email manually
 * @access  Admin
 */
router.post('/welcome', adminMiddleware, emailController.sendWelcomeEmail);

/**
 * @route   POST /api/email/update
 * @desc    Send an update email to users with matching preferences
 * @access  Admin
 */
router.post('/update', adminMiddleware, emailController.sendUpdateEmail);

/**
 * @route   POST /api/email/global
 * @desc    Send a global announcement to all users or those with announcement preferences
 * @access  Admin
 */
router.post('/global', adminMiddleware, emailController.sendGlobalAnnouncement);

/**
 * @route   GET /api/email/stats
 * @desc    Get email statistics
 * @access  Admin
 */
router.get('/stats', adminMiddleware, emailController.getEmailStats);

/**
 * @route   PUT /api/email/preferences/:userId
 * @desc    Update a user's email preferences
 * @access  Private (own user) or Admin
 */
router.put('/preferences/:userId', emailController.updateEmailPreferences);

module.exports = router; 