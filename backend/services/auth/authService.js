/**
 * Auth Service
 * 
 * Handles business logic for authentication operations including
 * user signup, login, token management and session handling.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userService = require('../user/userService');
const logger = require('../../utils/logger');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ACCESS_TOKEN_EXPIRES = '24h';
const REFRESH_TOKEN_EXPIRES = '7d';

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - User data without sensitive information
   */
  static async signup(userData) {
    try {
      // If no provider is specified, use local auth
      if (!userData.provider) {
        userData.provider = 'local';
      }
      
      // Create user through user service
      const user = await userService.createUser(userData);
      
      // Return user without sensitive data
      return this._sanitizeUserData(user);
    } catch (error) {
      logger.error(`Auth service error during signup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Authenticate a user and generate tokens
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Auth tokens and user data
   */
  static async login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      // Find user by email
      const user = await userService.getUserByEmail(email);
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        // Increment failed login attempts
        await userService.incrementLoginAttempts(user.id);
        throw new Error('Invalid password');
      }
      
      // Check if account is active
      if (user.isActive === false) {
        throw new Error('Account is not active. Please contact support.');
      }
      
      // Reset login attempts on successful login
      await userService.updateLoginInfo(user.id);
      
      // Generate tokens
      const tokens = this._generateTokens(user);
      
      return {
        user: this._sanitizeUserData(user),
        ...tokens
      };
    } catch (error) {
      logger.error(`Auth service error during login: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log out a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Logout result
   */
  static async logout(userId) {
    try {
      // For future implementation: token blacklisting if needed
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      logger.error(`Auth service error during logout: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refresh access token using a valid refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} - New tokens
   */
  static async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new Error('Refresh token is required');
      }
      
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET);
      
      // Get user
      const user = await userService.getUserById(decoded.id);
      
      // Generate new tokens
      const tokens = this._generateTokens(user);
      
      return {
        ...tokens,
        user: this._sanitizeUserData(user)
      };
    } catch (error) {
      logger.error(`Auth service error during token refresh: ${error.message}`);
      
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired. Please log in again');
      }
      
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      
      throw error;
    }
  }

  /**
   * Verify the access token and get user data
   * @param {string} token - Access token
   * @returns {Promise<Object>} - User data
   */
  static async verifyToken(token) {
    try {
      if (!token) {
        throw new Error('Access token is required');
      }
      
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user
      const user = await userService.getUserById(decoded.id);
      
      return {
        user: this._sanitizeUserData(user)
      };
    } catch (error) {
      logger.error(`Auth service error during token verification: ${error.message}`);
      
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token has expired');
      }
      
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      }
      
      throw error;
    }
  }

  /**
   * Reset user password
   * @param {string} email - User email
   * @returns {Promise<Object>} - Result of password reset request
   */
  static async requestPasswordReset(email) {
    try {
      if (!email) {
        throw new Error('Email is required');
      }
      
      // Find user by email
      const user = await userService.getUserByEmail(email);
      
      // Generate reset token (valid for 1 hour)
      const resetToken = jwt.sign(
        { id: user.id, action: 'password-reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      // In a real application, this would:
      // 1. Save the reset token to the database
      // 2. Send an email with a reset link
      
      return {
        success: true,
        message: 'Password reset instructions sent to your email'
      };
    } catch (error) {
      logger.error(`Auth service error during password reset request: ${error.message}`);
      
      // Don't reveal if the email exists or not for security reasons
      return {
        success: true,
        message: 'If your email is registered, you will receive password reset instructions'
      };
    }
  }

  /**
   * Complete password reset with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Result of password reset
   */
  static async resetPassword(token, newPassword) {
    try {
      if (!token || !newPassword) {
        throw new Error('Reset token and new password are required');
      }
      
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if token is for password reset
      if (decoded.action !== 'password-reset') {
        throw new Error('Invalid reset token');
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user password
      await userService.updateUserById(decoded.id, { password: hashedPassword });
      
      return {
        success: true,
        message: 'Password has been reset successfully'
      };
    } catch (error) {
      logger.error(`Auth service error during password reset: ${error.message}`);
      
      if (error.name === 'TokenExpiredError') {
        throw new Error('Reset token has expired. Please request a new one');
      }
      
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid reset token');
      }
      
      throw error;
    }
  }

  /**
   * Generate access and refresh tokens for a user
   * @param {Object} user - User object
   * @returns {Object} - Access and refresh tokens
   * @private
   */
  static _generateTokens(user) {
    // Create payload
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    
    // Generate access token
    const accessToken = jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES }
    );
    
    // Generate refresh token
    const refreshToken = jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES }
    );
    
    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES
    };
  }

  /**
   * Remove sensitive data from user object
   * @param {Object} user - User object
   * @returns {Object} - Sanitized user object
   * @private
   */
  static _sanitizeUserData(user) {
    if (!user) return null;
    
    const sanitized = { ...user };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.resetToken;
    delete sanitized.loginAttempts;
    
    return sanitized;
  }
}

module.exports = AuthService; 