/**
 * Auth Middleware
 * 
 * Handles authentication and authorization checks for protected routes
 */

const jwt = require('jsonwebtoken');
const userService = require('../services/user/userService');
const logger = require('../utils/logger');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Require authentication middleware
 * Verifies the JWT token and attaches user data to the request
 */
const requireAuth = async (req, res, next) => {
  try {
    // Get token from cookie, header, or request body
    let token = null;
    
    // Try to get from cookies first
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    // If not in cookies, try Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // If still not found, try request body (less secure, but supported)
    else if (req.body && req.body.accessToken) {
      token = req.body.accessToken;
    }
    
    if (!token) {
      logger.warn('Authentication failed: No token provided');
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const user = await userService.getUserById(decoded.id);
    
    // Check if user exists and is active
    if (!user) {
      logger.warn(`Authentication failed: User not found - ID: ${decoded.id}`);
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (user.isActive === false) {
      logger.warn(`Authentication failed: Inactive account - ID: ${decoded.id}`);
      return res.status(403).json({ 
        error: 'Account is not active',
        code: 'INACTIVE_ACCOUNT'
      });
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };
    
    next();
  } catch (error) {
    logger.error(`Authentication middleware error: ${error.message}`);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Require admin role middleware
 * Must be used after requireAuth
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_AUTH'
    });
  }
  
  if (req.user.role !== 'admin') {
    logger.warn(`Authorization failed: Admin access denied for user ID: ${req.user.id}`);
    return res.status(403).json({ 
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  
  next();
};

module.exports = {
  requireAuth,
  requireAdmin
}; 