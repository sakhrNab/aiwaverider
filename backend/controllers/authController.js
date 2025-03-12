const { admin, db } = require('../config/firebase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Collection reference
const usersCollection = db.collection('users');

/**
 * Handle user sign up with Firebase
 */
exports.signup = async (req, res) => {
  try {
    const { uid, email, username, firstName, lastName, phoneNumber, displayName, photoURL } = req.body;

    // Verify the user exists in Firebase
    const firebaseUser = await admin.auth().getUser(uid);
    if (!firebaseUser) {
      return res.status(404).json({ error: 'Firebase user not found' });
    }

    // Check if user already exists in Firestore
    const userDoc = await usersCollection.doc(uid).get();
    if (userDoc.exists) {
      return res.json({
        message: 'User already exists',
        user: {
          uid,
          ...userDoc.data()
        }
      });
    }

    // Check if username already exists
    const usernameQuery = await usersCollection.where('username', '==', username).get();
    if (!usernameQuery.empty) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    // Create searchable field for better querying
    const searchField = `${username.toLowerCase()} ${email.toLowerCase()} ${firstName ? firstName.toLowerCase() : ''} ${lastName ? lastName.toLowerCase() : ''}`;

    // Create user document in Firestore with profile image if available
    await usersCollection.doc(uid).set({
      username,
      firstName: firstName || '',
      lastName: lastName || '',
      email: email.toLowerCase(),
      phoneNumber: phoneNumber || '',
      role: 'authenticated',
      displayName: displayName || '',
      photoURL: photoURL || firebaseUser.photoURL || '',
      searchField,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Set session cookie
    const idToken = await admin.auth().createCustomToken(uid);
    res.cookie('firebaseToken', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({
      message: 'User created successfully',
      user: {
        uid,
        username,
        email: email.toLowerCase(),
        role: 'authenticated',
        photoURL: photoURL || firebaseUser.photoURL || ''
      }
    });
  } catch (err) {
    console.error('Error in /api/auth/signup:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Create a session from a Firebase ID token
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

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Get user data from Firestore
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const userData = userDoc.data();

    // Create a session token
    const sessionToken = jwt.sign(
      { 
        uid,
        role: userData.role || 'authenticated',
        email: userData.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set session cookie
    res.cookie('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return res.json({
      message: 'Session created successfully',
      user: {
        uid,
        username: userData.username,
        email: userData.email,
        role: userData.role || 'authenticated',
        photoURL: userData.photoURL || null,
        displayName: userData.displayName || null,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phoneNumber: userData.phoneNumber || ''
      }
    });
  } catch (err) {
    console.error('Error creating session:', err);
    return res.status(500).json({ 
      error: 'Failed to create session',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Sign out user by clearing cookies
 */
exports.signout = (req, res) => {
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
  
  return res.json({ message: 'Signed out successfully' });
};

/**
 * Verify a user's token
 */
exports.verifyUser = async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      errorType: 'UNAUTHORIZED',
      error: 'No token provided' 
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user exists in Firestore
    const userDoc = await usersCollection.doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        errorType: 'NO_ACCOUNT',
        error: 'No account found. Please sign up first.' 
      });
    }

    return res.json({ 
      success: true, 
      user: {
        uid: userDoc.id,
        ...userDoc.data()
      }
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    return res.status(500).json({ 
      errorType: 'SYSTEM_ERROR',
      error: 'Failed to verify user' 
    });
  }
};

/**
 * Refresh access token using refresh token
 */
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        error: 'No refresh token found',
        user: null 
      });
    }

    try {
      const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const userDoc = await usersCollection.doc(payload.id).get();
      
      if (!userDoc.exists) {
        return res.status(401).json({ 
          error: 'User not found',
          user: null 
        });
      }

      const userData = userDoc.data();
      const token = jwt.sign(
        {
          id: userDoc.id,
          username: userData.username,
          email: userData.email,
          role: userData.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Set new access token cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      return res.json({
        message: 'Token refreshed successfully',
        user: {
          id: userDoc.id,
          username: userData.username,
          email: userData.email,
          role: userData.role,
        }
      });
    } catch (tokenError) {
      // Clear invalid tokens
      res.clearCookie('token');
      res.clearCookie('refreshToken');
      return res.status(401).json({ error: 'Invalid refresh token', user: null });
    }
  } catch (err) {
    console.error('Error in refreshToken:', err);
    return res.status(401).json({ error: 'Invalid refresh token', user: null });
  }
}; 