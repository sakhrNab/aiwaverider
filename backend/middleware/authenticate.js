// middleware/authenticate.js

const admin = require('firebase-admin');

// Initialize Firestore users collection
const db = admin.firestore();
const usersCollection = db.collection('users');

const validateFirebaseToken = async (req, res, next) => {
  try {
    console.log('Request path:', req.path);
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No token provided in Authorization header');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Token received, verifying...');
    
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (!decodedToken) {
      console.log('Token verification failed');
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('Token verified, decoded token:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      exp: decodedToken.exp
    });

    // Get user data from Firestore
    const userDoc = await usersCollection.doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      console.log('User not found in database for uid:', decodedToken.uid);
      return res.status(404).json({ error: 'User not found in database' });
    }

    const userData = userDoc.data();
    console.log('User data fetched:', {
      uid: decodedToken.uid,
      role: userData.role,
      username: userData.username
    });
    
    // Attach user data to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData.role || 'authenticated',
      username: userData.username
    };

    console.log('Authentication successful for user:', req.user.username);
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    console.error('Error stack:', error.stack);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.code === 'auth/argument-error') {
      // Check for network connectivity errors
      if (error.message && (
          error.message.includes('ENOTFOUND') || 
          error.message.includes('getaddrinfo') ||
          error.message.includes('connect ETIMEDOUT') ||
          error.message.includes('network error')
        )) {
        return res.status(503).json({ 
          error: 'Firebase authentication service is currently unreachable',
          code: 'AUTH_SERVICE_UNREACHABLE',
          details: 'The application cannot connect to Google authentication servers. This may be due to network connectivity issues.',
          networkError: true,
          originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      
      return res.status(401).json({ 
        error: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Generic network errors
    if (error.code === 'ENOTFOUND' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENETUNREACH' ||
        error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Network connectivity issue',
        code: 'NETWORK_ERROR',
        details: 'Could not connect to authentication services. Please check your internet connection.',
        networkError: true,
        originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    return res.status(401).json({ 
      error: 'Authentication failed',
      code: error.code || 'UNKNOWN_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = validateFirebaseToken;
