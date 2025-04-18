const admin = require('firebase-admin');
const { db } = require('../config/firebase');

/**
 * Authentication middleware for protecting routes
 * Verifies the Firebase token and checks user permissions
 */
const auth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No authentication token provided' 
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (!decodedToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid authentication token' 
      });
    }

    // Get user data from Firestore
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    
    // Set up basic user object with authentication info
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };

    // If user exists in our database, add their role and additional data
    if (userDoc.exists) {
      const userData = userDoc.data();
      req.user.isAdmin = userData.role === 'admin';
      req.user.role = userData.role || 'user';
      req.user.username = userData.username;
    } else {
      // User is authenticated but not in our database
      req.user.isAdmin = false;
      req.user.role = 'user';
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication token expired' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication failed', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

/**
 * Middleware to validate Firebase auth token
 * Attaches user data to the request object if valid
 */
const validateFirebaseToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (!decodedToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const userData = userDoc.data();
    
    // Attach user data to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData.role || 'authenticated',
      username: userData.username
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Authentication token expired' });
    }
    
    return res.status(401).json({ 
      error: 'Authentication failed', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

/**
 * Middleware to check if user is an admin
 * Should be used after validateFirebaseToken
 */
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user has admin role
    if (req.user.role === 'admin') {
      return next();
    }

    // Double-check from database directly
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    if (userData.role === 'admin') {
      // Update user object with admin role
      req.user.role = 'admin';
      return next();
    }

    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({ 
      error: 'Server error during admin verification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  auth,
  validateFirebaseToken,
  isAdmin
}; 