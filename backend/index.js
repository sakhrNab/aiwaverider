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
// const admin = require('firebase-admin');

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

// Initialize express
const app = express();


// ------------------ Collection References ------------------
const usersCollection = db.collection('users');
const postsCollection = db.collection('posts');
const commentsCollection = db.collection('comments');

// ================== Updated Firebase Token Middleware ==================
const validateFirebaseToken = require('./middleware/authenticate');
const profileRoutes = require('./routes/profile');

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
    const { uid, email, username, firstName, lastName, phoneNumber, displayName } = req.body;

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

    // Create user document in Firestore
    await usersCollection.doc(uid).set({
      username,
      firstName: firstName || '',
      lastName: lastName || '',
      email: email.toLowerCase(),
      phoneNumber: phoneNumber || '',
      role: 'authenticated',
      displayName: displayName || '',
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
        role: 'authenticated'
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

// Remove old sign-in endpoint as it's handled by Firebase
// Keep only the session management part
// Verify user session by POSTing { idToken } to this endpoint
app.post('/api/auth/session', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    // 1. Verify the ID token via Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // 2. Check if user doc exists in Firestore
    const userDoc = await usersCollection.doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const userData = userDoc.data();

    // 3. Optionally set a session cookie or do anything else here.
    //    For example, if you're using express-session, you might attach user data:
    //    req.session.user = { uid: decodedToken.uid, ... };

    // 4. Return user data or a success message
    return res.json({
      message: 'Session verified successfully',
      user: {
        uid: decodedToken.uid,
        username: userData.username,
        email: userData.email,
        role: userData.role
      }
    });
  } catch (err) {
    console.error('Error in /api/auth/session:', err);
    return res
      .status(500)
      .json({ error: 'Failed to verify session' });
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

// ------------------ 3) Create Post (Admin only) -------
app.post('/api/posts', validateFirebaseToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, additionalHTML, graphHTML } = req.body;
    const { role, id: userId } = req.user;

    // 1. Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({ 
        error: 'Title, description, and category are required.' 
      });
    }

    // 2. Check admin role
    if (role !== 'admin') {
      return res.status(403).json({ 
        error: 'Only admin can create posts.' 
      });
    }

    let imageUrl = null;
    let imageSha = null;

    // 3. Handle image upload if provided
    if (req.file) {
      const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
      try {
        const uploadResult = await uploadImageToGitHub(filename, req.file.buffer);
        if (!uploadResult || !uploadResult.url || !uploadResult.sha) {
          throw new Error('Image upload failed: Missing URL or SHA.');
        }
        imageUrl = uploadResult.url;
        imageSha = uploadResult.sha;
      } catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json({ 
          error: error.message || 'Image upload failed.' 
        });
      }
    }

    // 4. Get username from users collection
    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const username = userDoc.data().username;

    // 5. Sanitize HTML content
    const sanitizedAdditionalHTML = sanitizeHtml(additionalHTML || '');
    const sanitizedGraphHTML = sanitizeHtml(graphHTML || '');

    // 6. Create post document
    const newPostRef = await postsCollection.add({
      title,
      description,
      category,
      imageUrl,
      imageSha,
      additionalHTML: sanitizedAdditionalHTML,
      graphHTML: sanitizedGraphHTML,
      createdBy: userId,
      createdByUsername: username,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 7. Get the created post
    const newPostDoc = await newPostRef.get();
    const postData = newPostDoc.data();

    // 8. Send response
    return res.json({
      message: 'Post created successfully.',
      post: {
        id: newPostRef.id,
        ...postData,
        createdAt: postData.createdAt.toDate().toISOString(),
        updatedAt: postData.updatedAt.toDate().toISOString(),
      }
    });

  } catch (err) {
    logger.error('Error creating post:', err);
    return res.status(500).json({ 
      error: 'Internal server error.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ------------------ 4) Get All Posts (public) ---------
app.get('/api/posts', async (req, res) => {
  try {
    const user = req.user;
    const { category, limit, startAfter } = req.query;
    const limitNumber = parseInt(limit, 10) || 10;

    let query = postsCollection.orderBy('createdAt', 'desc').limit(limitNumber);

    if (category && category !== 'All') {
      query = query.where('category', '==', category);
    }

    if (startAfter) {
      const startAfterDate = new Date(startAfter);
      if (!isNaN(startAfterDate)) {
        const firestoreTimestamp = admin.firestore.Timestamp.fromDate(startAfterDate);
        query = query.startAfter(firestoreTimestamp);
      }
    }

    const snapshot = await query.get();
    const allPosts = [];

    const postIds = snapshot.docs.map(doc => doc.id);
    let comments = [];

    if (postIds.length > 0) {
      // Firestore 'in' queries up to 10 items each
      const chunkSize = 10;
      const chunks = [];
      for (let i = 0; i < postIds.length; i += chunkSize) {
        chunks.push(postIds.slice(i, i + chunkSize));
      }

      const commentsPromises = chunks.map(chunk =>
        commentsCollection.where('postId', 'in', chunk).orderBy('createdAt', 'desc').get()
      );
      const commentsSnapshots = await Promise.all(commentsPromises);
      commentsSnapshots.forEach(commentsSnap => {
        commentsSnap.forEach(commentDoc => {
          const commentData = commentDoc.data();
          comments.push({
            id: commentDoc.id,
            ...commentData,
            createdAt: commentData.createdAt
              ? commentData.createdAt.toDate().toISOString()
              : null,
          });
        });
      });
    }

    // Group comments by postId
    const commentsByPostId = {};
    comments.forEach(comment => {
      if (!commentsByPostId[comment.postId]) {
        commentsByPostId[comment.postId] = [];
      }
      commentsByPostId[comment.postId].push(comment);
    });

    snapshot.forEach(doc => {
      const data = doc.data();
      const isOwner = user?.uid === data.createdBy;
      
      const postId = doc.id;

      // Ensure strings
      const additionalHTML =
        typeof data.additionalHTML === 'string' ? data.additionalHTML : '';
      const graphHTML =
        typeof data.graphHTML === 'string' ? data.graphHTML : '';

      allPosts.push({
        id: postId,
        ...data,
        isOwner,
        additionalHTML,
        graphHTML,
        createdAt: data.createdAt
          ? data.createdAt.toDate().toISOString()
          : null,
        comments: commentsByPostId[postId] || [],
      });
    });

    // Next-page cursor
    let lastPostCreatedAt = null;
    if (snapshot.docs.length > 0) {
      lastPostCreatedAt = snapshot.docs[snapshot.docs.length - 1].data().createdAt
        .toDate()
        .toISOString();
    }

    return res.json({
      posts: allPosts,
      lastPostCreatedAt,
    });
  } catch (err) {
    console.error('Error in GET /api/posts:', err);
    return res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

// ------------------ MULTI-CATEGORY FETCH ------------------
app.get('/api/posts/multi', async (req, res) => {
  try {
    // e.g. GET /api/posts/multi?categories=Trends,Latest%20Tech,AI%20Tools&limit=5
    const { categories, limit } = req.query;
    if (!categories) {
      return res.status(400).json({ error: 'No categories provided.' });
    }

    // Parse categories
    const categoryArray = categories.split(',').map((c) => c.trim());
    const limitNumber = parseInt(limit, 10) || 5;

    // We'll store each category's posts in an object
    const results = {};

    // For each category, do a Firestore query
    for (const cat of categoryArray) {
      let query = postsCollection.orderBy('createdAt', 'desc').limit(limitNumber);
      if (cat !== 'All') {
        query = query.where('category', '==', cat);
      }

      const snapshot = await query.get();

      // Gather post IDs
      const postIds = snapshot.docs.map((doc) => doc.id);

      // Build array of posts
      const postsForThisCategory = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt
            ? data.createdAt.toDate().toISOString()
            : null,
          comments: [],
        };
      });

      // Fetch comments if you want them for each category
      let allCommentsForThisCategory = [];
      if (postIds.length > 0) {
        const chunkSize = 10;
        const chunks = [];
        for (let i = 0; i < postIds.length; i += chunkSize) {
          chunks.push(postIds.slice(i, i + chunkSize));
        }
        const commentsPromises = chunks.map((chunk) =>
          commentsCollection
            .where('postId', 'in', chunk)
            .orderBy('createdAt', 'desc')
            .get()
        );
        const commentsSnapshots = await Promise.all(commentsPromises);

        allCommentsForThisCategory = commentsSnapshots.flatMap((snap) =>
          snap.docs.map((commentDoc) => {
            const cdata = commentDoc.data();
            return {
              id: commentDoc.id,
              ...cdata,
              createdAt: cdata.createdAt
                ? cdata.createdAt.toDate().toISOString()
                : null,
            };
          })
        );
      }

      // Group by postId
      const commentsByPostId = {};
      allCommentsForThisCategory.forEach((comment) => {
        if (!commentsByPostId[comment.postId]) {
          commentsByPostId[comment.postId] = [];
        }
        commentsByPostId[comment.postId].push(comment);
      });

      // Attach comments
      postsForThisCategory.forEach((post) => {
        post.comments = commentsByPostId[post.id] || [];
      });

      // Store final
      results[cat] = postsForThisCategory;
    }

    return res.json({
      data: results, // e.g. { "Trends": [...], "AI Tools": [...] }
    });
  } catch (err) {
    console.error('Error in GET /api/posts/multi:', err);
    return res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

// ------------------ 7) Get User Profile (authenticated) ----
app.get('/api/users/:userId', validateFirebaseToken, async (req, res) => {
  try {
    const { userId } = req.params;
    // Only allow self or admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userData = userDoc.data();
    return res.json({
      id: userDoc.id,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      role: userData.role,
    });
  } catch (err) {
    console.error('Error in GET /api/users/:userId:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------ 8) Delete Post (Admin Only) -------
app.delete('/api/posts/:postId', validateFirebaseToken, async (req, res) => {
  try {
    const { role } = req.user;
    const { postId } = req.params;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete posts.' });
    }

    const postRef = postsCollection.doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const postData = postDoc.data();

    // If image present, remove from GitHub
    if (postData.imageUrl && postData.imageSha) {
      try {
        const filename = path.basename(postData.imageUrl);
        await deleteImageFromGitHub(filename, postData.imageSha);
      } catch (error) {
        console.error('Error deleting image from GitHub:', error);
      }
    }

    // Delete the post
    await postRef.delete();

    // Optional: delete comments
    const commentsSnapshot = await commentsCollection.where('postId', '==', postId).get();
    const batch = db.batch();
    commentsSnapshot.forEach((commentDoc) => {
      batch.delete(commentDoc.ref);
    });
    await batch.commit();

    return res.json({ message: 'Post deleted successfully.' });
  } catch (err) {
    console.error('Error in DELETE /api/posts/:postId:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------ 10) Get Post by ID ----------------
app.get('/api/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const postDoc = await postsCollection.doc(postId).get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const postData = postDoc.data();

    // Ensure additionalHTML and graphHTML are strings
    const additionalHTML =
      typeof postData.additionalHTML === 'string' ? postData.additionalHTML : '';
    const graphHTML =
      typeof postData.graphHTML === 'string' ? postData.graphHTML : '';

    return res.json({
      id: postId,
      ...postData,
      additionalHTML,
      graphHTML,
    });
  } catch (err) {
    console.error('Error fetching post:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ------------------ 11) Update Post by ID (Admin only) ----
app.put('/api/posts/:postId', validateFirebaseToken, upload.single('image'), async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update posts.' });
    }
    const { postId } = req.params;
    const { title, description, category, additionalHTML, graphHTML } = req.body;

    // Handle image if provided
    let imageUrl = null;
    let imageSha = null;
    if (req.file) {
      try {
        const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
        const uploadResult = await uploadImageToGitHub(filename, req.file.buffer);
        if (!uploadResult || !uploadResult.url || !uploadResult.sha) {
          throw new Error('Image upload failed: Missing URL or SHA.');
        }
        imageUrl = uploadResult.url;
        imageSha = uploadResult.sha;
      } catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json({ error: error.message || 'Image upload failed.' });
      }
    }

    // Validate post existence
    const postRef = postsCollection.doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // If we have a new image, delete the old one
    const postData = postDoc.data();
    if (imageUrl && postData.imageUrl && postData.imageSha) {
      try {
        const oldFilename = path.basename(postData.imageUrl);
        await deleteImageFromGitHub(oldFilename, postData.imageSha);
      } catch (error) {
        console.error('Error deleting old image from GitHub:', error);
      }
    }

    // Sanitize HTML
    const sanitizedAdditionalHTML = sanitizeHtml(additionalHTML || '');
    const sanitizedGraphHTML = sanitizeHtml(graphHTML || '');

    // Build updates
    const updates = {
      title,
      description,
      category,
      additionalHTML: sanitizedAdditionalHTML,
      graphHTML: sanitizedGraphHTML,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (imageUrl !== null) {
      updates.imageUrl = imageUrl;
      updates.imageSha = imageSha;
    }

    await postRef.update(updates);
    return res.json({ message: 'Post updated successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ------------------ 5) Add Comment (auth or admin) ----
// POST /api/posts/:postId/comments
app.post('/api/posts/:postId/comments', validateFirebaseToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { commentText, parentCommentId } = req.body;
    const uid = req.user.uid;
    if (!uid) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    if (!commentText) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }
    // Validate post exists
    const postDoc = await postsCollection.doc(postId).get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    // Get user data from Firestore using uid
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const userData = userDoc.data();
    const username = userData.username || 'Anonymous';
    const userRole = userData.role || 'authenticated';

    // Create comment – include parentCommentId if provided
    const newCommentRef = await commentsCollection.add({
      postId,
      userId: uid,
      text: commentText,
      username,
      userRole,
      parentCommentId: parentCommentId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const newCommentDoc = await newCommentRef.get();
    const commentData = newCommentDoc.data();

    return res.json({
      message: 'Comment added successfully.',
      comment: {
        id: newCommentRef.id,
        ...commentData,
        createdAt: commentData.createdAt.toDate().toISOString(),
      },
    });
  } catch (err) {
    console.error('Error in POST /api/posts/:postId/comments:', err);
    return res.status(500).json({ 
      error: 'Internal server error.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ------------------ 6) Get Comments for a Post (public) ----
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const snapshot = await commentsCollection
      .where('postId', '==', postId)
      .orderBy('createdAt', 'desc')
      .get();

    const allComments = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Ensure we have all required fields
      const comment = {
        id: doc.id,
        postId: data.postId,
        userId: data.userId,
        text: data.text,
        username: data.username || 'Anonymous',
        userRole: data.userRole || 'user',
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      };
      allComments.push(comment);
    }

    return res.json(allComments);
  } catch (err) {
    console.error('Error in GET /api/posts/:postId/comments:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Like a comment
app.post('/api/posts/:postId/comments/:commentId/like', validateFirebaseToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const uid = req.user.uid;
    const commentRef = commentsCollection.doc(commentId);
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    let commentData = commentDoc.data();
    let likes = commentData.likes || [];
    if (!likes.includes(uid)) {
      likes.push(uid);
    }
    await commentRef.update({ likes });
    const updatedDoc = await commentRef.get();
    const updatedComment = { id: updatedDoc.id, ...updatedDoc.data() };
    return res.json({ updatedComment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Unlike a comment
// Like a comment endpoint
app.post('/api/posts/:postId/comments/:commentId/like', validateFirebaseToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const uid = req.user.uid;
    const commentRef = commentsCollection.doc(commentId);
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    let commentData = commentDoc.data();
    let likes = commentData.likes || [];
    if (!likes.includes(uid)) {
      likes.push(uid);
    }
    await commentRef.update({ likes });
    const updatedDoc = await commentRef.get();
    const updatedComment = { id: updatedDoc.id, ...updatedDoc.data() };

    // Retrieve user details for each liker
    const userPromises = (updatedComment.likes || []).map(userId =>
      usersCollection.doc(userId).get()
    );
    const userDocs = await Promise.all(userPromises);
    const likedBy = userDocs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, username: doc.data().username }));
    updatedComment.likedBy = likedBy;

    return res.json({ updatedComment });
  } catch (err) {
    console.error('Error liking comment:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Similarly, update the unlike endpoint:
app.delete('/api/posts/:postId/comments/:commentId/like', validateFirebaseToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const uid = req.user.uid;
    const commentRef = commentsCollection.doc(commentId);
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    let commentData = commentDoc.data();
    let likes = commentData.likes || [];
    likes = likes.filter(id => id !== uid);
    await commentRef.update({ likes });
    const updatedDoc = await commentRef.get();
    const updatedComment = { id: updatedDoc.id, ...updatedDoc.data() };

    // Retrieve user details for each liker
    const userPromises = (updatedComment.likes || []).map(userId =>
      usersCollection.doc(userId).get()
    );
    const userDocs = await Promise.all(userPromises);
    const likedBy = userDocs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, username: doc.data().username }));
    updatedComment.likedBy = likedBy;

    return res.json({ updatedComment });
  } catch (err) {
    console.error('Error unliking comment:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE a comment (allowed for the comment owner or an admin)
app.delete('/api/posts/:postId/comments/:commentId', validateFirebaseToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const uid = req.user.uid;
    const commentRef = commentsCollection.doc(commentId);
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    const commentData = commentDoc.data();
    // Only allow the owner or an admin to delete the comment.
    if (commentData.userId !== uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    await commentRef.delete();
    return res.json({ message: 'Comment deleted successfully.' });
  } catch (err) {
    console.error('Error deleting comment:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.put('/api/posts/:postId/comments/:commentId', validateFirebaseToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { commentText } = req.body;
    const uid = req.user.uid;
    const commentRef = commentsCollection.doc(commentId);
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    const commentData = commentDoc.data();
    if (commentData.userId !== uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await commentRef.update({
      text: commentText,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const updatedDoc = await commentRef.get();
    const updatedComment = { id: updatedDoc.id, ...updatedDoc.data() };
    return res.json({ updatedComment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


//Profile
// Mount the profile routes at /api/profile
app.use('/api/profile', profileRoutes);

// ------------------ Catch-All 404 Handler ------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ------------------ Error Handling Middleware ------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});




// ------------------ Start the Server ------------------
const PORT = process.env.PORT || (isProduction ? 8080 : 4000);
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
