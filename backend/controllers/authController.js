/**
 * Auth Controller
 * 
 * Handles HTTP requests related to authentication, using the service layer
 */

const authService = require('../services/auth/authService');
const logger = require('../utils/logger');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.signup = async (req, res) => {
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
    
    const user = await authService.signup(userData);
    
    return res.status(201).json({ 
      success: true,
      user
    });
  } catch (error) {
    logger.error(`Controller error during signup: ${error.message}`);
    
    // Handle common error cases
    if (error.message.includes('already in use')) {
      return res.status(409).json({ error: error.message });
    }
    
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Log in a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const result = await authService.login(email, password);
    
    // Set cookies for tokens
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return res.json({ 
      success: true,
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    logger.error(`Controller error during login: ${error.message}`);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Invalid email or password' });
    }
    
    if (error.message.includes('Invalid password')) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (error.message.includes('not active')) {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Create a session from a Firebase ID token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createSession = async (req, res) => {
  try {
    // Get token from either the request body or Authorization header
    let idToken = req.body.idToken;
    if (!idToken && req.headers.authorization) {
      idToken = req.headers.authorization.split('Bearer ')[1];
    }

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }
    
    const result = await authService.verifyToken(idToken);
    
    // Set cookie for access token (instead of session token)
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return res.json({
      message: 'Session created successfully',
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    logger.error(`Error creating session: ${error.message}`);
    return res.status(500).json({ 
      error: 'Failed to create session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Log out a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.signout = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    
    if (userId) {
      await authService.logout(userId);
    }
    
    // Clear cookies - both legacy and new tokens
    res.clearCookie('firebaseToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    res.clearCookie('session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/api/auth/refresh'
    });
    
    return res.json({ 
      success: true,
      message: 'Signed out successfully' 
    });
  } catch (error) {
    logger.error(`Controller error during logout: ${error.message}`);
    return res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * Log out a user (alias for signout)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.logout = exports.signout;

/**
 * Verify a user's token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        errorType: 'UNAUTHORIZED',
        error: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    const result = await authService.verifyToken(token);
    
    return res.json({ 
      success: true, 
      user: result.user
    });
  } catch (error) {
    logger.error(`Error verifying user: ${error.message}`);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        errorType: 'NO_ACCOUNT',
        error: 'No account found. Please sign up first.' 
      });
    }
    
    return res.status(500).json({ 
      errorType: 'SYSTEM_ERROR',
      error: 'Failed to verify user' 
    });
  }
};

/**
 * Verify user session (similar to verifyUser but uses attached user info)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifySession = async (req, res) => {
  try {
    // User data is already attached by auth middleware
    return res.json({ 
      success: true,
      user: req.user
    });
  } catch (error) {
    logger.error(`Controller error during session verification: ${error.message}`);
    return res.status(500).json({ error: 'Session verification failed' });
  }
};

/**
 * Refresh access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.refreshToken = async (req, res) => {
  try {
    // Get refresh token from cookie, header, or body
    let refreshToken = null;
    
    if (req.cookies && req.cookies.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      refreshToken = req.headers.authorization.split(' ')[1];
    } else if (req.body && req.body.refreshToken) {
      refreshToken = req.body.refreshToken;
    }
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }
    
    const result = await authService.refreshToken(refreshToken);
    
    // Set cookies for new tokens
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return res.json({ 
      success: true,
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    logger.error(`Controller error during token refresh: ${error.message}`);
    
    // Clear cookies on error
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    
    if (error.message.includes('expired') || error.message.includes('invalid')) {
      return res.status(401).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Token refresh failed' });
  }
};

/**
 * Request password reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const result = await authService.requestPasswordReset(email);
    
    return res.json(result);
  } catch (error) {
    logger.error(`Controller error during password reset request: ${error.message}`);
    
    // Return success even if there's an error for security
    return res.json({ 
      success: true,
      message: 'If your email is registered, you will receive password reset instructions'
    });
  }
};

/**
 * Reset password with token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    const result = await authService.resetPassword(token, newPassword);
    
    return res.json(result);
  } catch (error) {
    logger.error(`Controller error during password reset: ${error.message}`);
    
    if (error.message.includes('expired')) {
      return res.status(401).json({ error: error.message });
    }
    
    if (error.message.includes('invalid')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Password reset failed' });
  }
}; 