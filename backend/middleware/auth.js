const admin = require('firebase-admin');

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

module.exports = { auth }; 