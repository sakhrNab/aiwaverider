require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const Joi = require('joi');
const sanitizeHtml = require('./utils/sanitize'); // Import sanitize function
// const authenticateJWT = require('./middleware/authenticate'); // Import auth middleware
const passport = require('passport');


const {
  octokit,
  owner,
  repo,
  branch,
  imagesDir,
  uploadImageToGitHub,
  deleteImageFromGitHub,
} = require('./utils/github'); // GitHub utils
const upload = require('./middleware/upload'); // Multer upload
const logger = require('./utils/logger'); // Add this import
const dns = require('dns');
const { promisify } = require('util');
const resolveMx = promisify(dns.resolveMx);
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { admin, db } = require('./config/firebase');
const { initializePassport } = require('./config/passport');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET);

const { 
  cacheControl, 
  etagCache, 
  varyHeader, 
  conditionalGet 
} = require('./middleware/cache');
const publicCacheMiddleware = require('./middleware/publicCacheMiddleware');
const {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
  generatePostsCacheKey,
  generatePostCacheKey,
  generateCommentsCacheKey,
  generateProfileCacheKey,
} = require('./utils/cache');

// Import routes correctly
const postsRoutes = require('./routes/posts');
// const authRoutes = require('./middleware/authenticate'); // Fix: import from routes/auth
const profileRoutes = require('./routes/profile');

// Initialize express
const app = express();


// ------------------ Collection References ------------------
const usersCollection = db.collection('users');
const postsCollection = db.collection('posts');
const commentsCollection = db.collection('comments');

// ================== Updated Firebase Token Middleware ==================
const validateFirebaseToken = require('./middleware/authenticate');

// Basic middleware setup
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim())
    : ['http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration - required for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport and restore authentication state from session
initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

// ------------------ Rate Limiting ------------------
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many requests, please try again in 15 minutes!',
});

// Apply rate limiting only in production or development
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
if (isProduction || isDevelopment) {
  app.use(limiter);
}

// Add rate limiting specifically for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many login attempts, please try again later.' });
  }
});

// Add security headers
const helmet = require('helmet');
app.use(helmet());

// Track login attempts
const loginAttempts = new Map();

// Clear login attempts every 15 minutes
setInterval(() => {
  loginAttempts.clear();
}, 15 * 60 * 1000);

// ------------------ CORS Configuration ------------------
const allowedOrigins = isProduction
  ? (process.env.CORS_ORIGINS || '').split(',').map(origin => origin.trim())
  : ['http://localhost:5173']; // Frontend origin

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.options('*', cors());

// ------------------ Body Parsing ------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add passport middleware
app.use(passport.initialize());

// Move this route before other routes
app.post('/api/auth/refresh', async (req, res) => {
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
    console.error('Error in /api/auth/refresh:', err);
    return res.status(401).json({ error: 'Invalid refresh token', user: null });
  }
});

// Google Sign In
app.get('/api/auth/google/signin',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: 'signin',
    prompt: 'select_account'  // Add this line
  })
);

// Google Sign Up
app.get('/api/auth/google/signup',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: 'signup',
    prompt: 'select_account' // Add this to force account selection
  })
);

// Single callback handler for both sign-in and sign-up
app.get('/api/auth/google/callback',
  (req, res, next) => {
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
  }
);


/*************************************************************************
 * Data structure:
 *   users (collection)
 *     doc: userId
 *       username, firstName, lastName, email, phoneNumber, password, role
 *
 *   posts (collection)
 *     doc: postId
 *       title, description, category, imageUrl, imageSha, additionalHTML,
 *       graphHTML, createdBy, createdByUsername, createdAt, updatedAt
 *
 *   comments (collection)
 *     doc: commentId
 *       postId, userId, text, username, userRole, createdAt
 *************************************************************************/

// ------------------ Validation Schemas ------------------


app.post('/api/auth/signup', async (req, res) => {
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

    // Create user document in Firestore with profile image if available
    await usersCollection.doc(uid).set({
      username,
      firstName: firstName || '',
      lastName: lastName || '',
      email: email.toLowerCase(),
      phoneNumber: phoneNumber || '',
      role: 'authenticated',
      displayName: displayName || '',
      photoURL: photoURL || firebaseUser.photoURL || '', // Use OAuth provider photo if available
      createdAt: admin.firestore.FieldValue.serverTimestamp()
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
});

// Verify user session by POSTing { idToken } to this endpoint
app.post('/api/auth/session', async (req, res) => {
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
});

// Update sign out endpoint
app.post('/api/auth/signout', (req, res) => {
  res.clearCookie('firebaseToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  return res.json({ message: 'Signed out successfully' });
});

// Add this new endpoint
app.post('/api/auth/verify-user', async (req, res) => {
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
});

// Routes
app.use('/api/posts', postsRoutes);

// ------------------ 7) Get User Profile (authenticated) ----
app.get('/api/users/:userId', publicCacheMiddleware(), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try to get from cache first
    const cacheKey = generateProfileCacheKey(userId);
    const cachedProfile = await getCache(cacheKey);
    if (cachedProfile) {
      return res.json(cachedProfile);
    }

    // If not in cache, get from Firestore
    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const profileData = {
      uid: userId,
      ...userDoc.data(),
      // Exclude sensitive data
      password: undefined,
      authTokens: undefined
    };
    
    // Cache the profile
    await setCache(cacheKey, profileData);

    return res.json(profileData);
  } catch (err) {
    console.error('Error in GET /api/users/:userId:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

//Mount the profile routes at /api/profile
app.use('/api/profile', profileRoutes);

// Enhanced logging
app.use((req, res, next) => {
  let start = Date.now();
  res.on('finish', () => {
    let duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check endpoint at the root level
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'development'
  });
});

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ------------------ Start the Server ------------------
const PORT = process.env.PORT || (isProduction ? 8080 : 4000);
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
