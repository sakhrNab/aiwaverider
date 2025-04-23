/**
 * Email API Routes
 * 
 * Routes for email operations
 */

const express = require('express');
const router = express.Router();
const emailController = require('../../controllers/emailController');
const { isAdmin, auth } = require('../../middleware/auth');

// Routes require authentication
router.use(auth);

/**
 * @route   POST /api/email/test
 * @desc    Send a test email
 * @access  Admin
 */
router.post('/test', isAdmin, emailController.sendTestEmail);

/**
 * @route   POST /api/email/welcome
 * @desc    Send a welcome email manually
 * @access  Admin
 */
router.post('/welcome', isAdmin, emailController.sendWelcomeEmail);

/**
 * @route   POST /api/email/update
 * @desc    Send an update email to users with matching preferences
 * @access  Admin
 */
router.post('/update', isAdmin, emailController.sendUpdateEmail);

/**
 * @route   POST /api/email/global
 * @desc    Send a global announcement to all users or those with announcement preferences
 * @access  Admin
 */
router.post('/global', isAdmin, emailController.sendGlobalAnnouncement);

/**
 * @route   POST /api/email/send-custom
 * @desc    Send a custom email to specific recipients
 * @access  Admin
 */
router.post('/send-custom', isAdmin, emailController.sendCustomEmail);

/**
 * @route   GET /api/email/stats
 * @desc    Get email statistics
 * @access  Admin
 */
router.get('/stats', isAdmin, emailController.getEmailStats);

/**
 * @route   PUT /api/email/preferences/:userId
 * @desc    Update a user's email preferences
 * @access  Private (own user) or Admin
 */
router.put('/preferences/:userId', emailController.updateEmailPreferences);

/**
 * @route   POST /api/email/update/users
 * @desc    Send update notifications to specific users
 * @access  Admin
 */
router.post('/update/users', isAdmin, emailController.sendUpdateToUsers);

module.exports = router; 