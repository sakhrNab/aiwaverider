/**
 * Auth Routes
 * 
 * Routes for authentication operations
 * @module routes/auth
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const passport = require('passport');
const jwt = require('jsonwebtoken');

/**
 * @typedef {object} User
 * @property {string} id - User ID
 * @property {string} username - Username
 * @property {string} email - User's email address
 * @property {string} role - User role (user, admin)
 * @property {string} createdAt - Account creation timestamp
 */

/**
 * @typedef {object} AuthResponse
 * @property {string} token - JWT access token
 * @property {string} refreshToken - JWT refresh token
 * @property {User} user - User information
 */

/**
 * @typedef {object} PasswordResetRequest
 * @property {string} email - Email address for password reset
 */

/**
 * @typedef {object} PasswordReset
 * @property {string} token - Password reset token
 * @property {string} password - New password
 */

/**
 * @typedef {object} ErrorResponse
 * @property {string} error - Error message
 * @property {number} status - HTTP status code
 */

/**
 * Register a new user
 * @route POST /api/auth/signup
 * @group Authentication - User authentication operations
 * @param {string} username.body.required - Username
 * @param {string} email.body.required - Email address
 * @param {string} password.body.required - Password
 * @returns {AuthResponse} 201 - User created with tokens
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 409 - Email already exists
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/signup', asyncHandler(authController.signup));

/**
 * Authenticate a user and get tokens
 * @route POST /api/auth/login
 * @group Authentication - User authentication operations
 * @param {string} email.body.required - Email address
 * @param {string} password.body.required - Password
 * @returns {AuthResponse} 200 - Authentication successful
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Invalid credentials
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/login', asyncHandler(authController.login));

/**
 * Create session with Firebase token
 * @route POST /api/auth/session
 * @group Authentication - User authentication operations
 * @param {string} firebaseToken.body.required - Firebase authentication token
 * @returns {AuthResponse} 200 - Session created
 * @returns {ErrorResponse} 400 - Invalid token
 * @returns {ErrorResponse} 401 - Authentication failed
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/session', asyncHandler(authController.createSession));

/**
 * Logout a user
 * @route POST /api/auth/logout
 * @group Authentication - User authentication operations
 * @security BearerAuth
 * @returns {object} 200 - Logout successful
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/logout', requireAuth, asyncHandler(authController.logout));

/**
 * Sign out a user (alias for logout)
 * @route POST /api/auth/signout
 * @group Authentication - User authentication operations
 * @returns {object} 200 - Signout successful
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/signout', asyncHandler(authController.signout));

/**
 * Refresh access token
 * @route POST /api/auth/refresh
 * @group Authentication - User authentication operations
 * @param {string} refreshToken.body.required - Refresh token
 * @returns {object} 200 - New access token
 * @returns {ErrorResponse} 400 - Invalid token
 * @returns {ErrorResponse} 401 - Token expired
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/refresh', asyncHandler(authController.refreshToken));

/**
 * Verify a user token
 * @route POST /api/auth/verify-user
 * @group Authentication - User authentication operations
 * @param {string} token.body.required - JWT token to verify
 * @returns {object} 200 - Token is valid
 * @returns {ErrorResponse} 401 - Invalid token
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/verify-user', asyncHandler(authController.verifyUser));

/**
 * Get current user data
 * @route GET /api/auth/me
 * @group Authentication - User authentication operations
 * @security BearerAuth
 * @returns {User} 200 - Current user information
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/me', requireAuth, asyncHandler(authController.verifySession));

/**
 * Request password reset
 * @route POST /api/auth/password/reset-request
 * @group Password Management - Password reset operations
 * @param {PasswordResetRequest} request.body.required - Password reset request
 * @returns {object} 200 - Reset email sent
 * @returns {ErrorResponse} 400 - Email not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/password/reset-request', asyncHandler(authController.requestPasswordReset));

/**
 * Reset password with token
 * @route POST /api/auth/password/reset
 * @group Password Management - Password reset operations
 * @param {PasswordReset} request.body.required - Password reset data
 * @returns {object} 200 - Password reset successful
 * @returns {ErrorResponse} 400 - Invalid token or password
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/password/reset', asyncHandler(authController.resetPassword));

/**
 * OAuth Routes
 */

/**
 * Google OAuth signin
 * @route GET /api/auth/google/signin
 * @group OAuth - OAuth authentication routes
 * @returns {object} 302 - Redirects to Google authentication
 */
router.get('/google/signin', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  state: 'signin',
  prompt: 'select_account'
}));

/**
 * Google OAuth signup
 * @route GET /api/auth/google/signup
 * @group OAuth - OAuth authentication routes
 * @returns {object} 302 - Redirects to Google authentication
 */
router.get('/google/signup', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  state: 'signup',
  prompt: 'select_account'
}));

/**
 * Google OAuth callback
 * @route GET /api/auth/google/callback
 * @group OAuth - OAuth authentication routes
 * @returns {object} 302 - Redirects to frontend with authentication result
 */
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=true&message=${encodeURIComponent(err.message)}`);
    }

    if (!user) {
      // Handle specific error types
      if (info && info.errorType === 'EXISTING_ACCOUNT') {
        return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=exists&message=${encodeURIComponent(info.message)}`);
      }
      if (info && info.errorType === 'NO_ACCOUNT') {
        return res.redirect(`${process.env.FRONTEND_URL}/sign-up?error=noaccount&message=${encodeURIComponent(info.message)}`);
      }
      return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=true`);
    }

    try {
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });

      res.redirect(`${process.env.FRONTEND_URL}?auth=success`);
    } catch (error) {
      console.error('Token creation error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=true&message=${encodeURIComponent('Authentication failed')}`);
    }
  })(req, res, next);
});

module.exports = router; 