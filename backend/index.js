require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const path = require('path');
const Joi = require('joi');
const sanitizeHtml = require('./utils/sanitize'); // Import sanitize function
const authenticateJWT = require('./middleware/auth'); // Import auth middleware
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

const app = express();

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

// Add cookie parser before routes
const cookieParser = require('cookie-parser');
app.use(cookieParser());

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

// ------------------ Initialize Firebase Admin ------------------
let serviceAccount;

if (isProduction) {
  // In production, load from environment variable
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    console.error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
    process.exit(1);
  }
  serviceAccount = JSON.parse(
    Buffer.from(serviceAccountJson, 'base64').toString('utf-8')
  );
} else {
  // In development, use local JSON file
  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'path/to/local/serviceAccountKey.json';
  serviceAccount = require(path.resolve(serviceAccountPath));
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // Uncomment if you use Firebase Storage
});

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true }); // Enable ignoring undefined properties

// ------------------ Collection References ------------------
const usersCollection = db.collection('users');
const postsCollection = db.collection('posts');
const commentsCollection = db.collection('comments');

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


const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Update sign-up schema with stronger password validation
const signUpSchema = Joi.object({
  username: Joi.string().max(20).required(),
  firstName: Joi.string().allow('', null),
  lastName: Joi.string().allow('', null),
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().allow('', null),
  password: Joi.string().pattern(strongPasswordRegex).required()
    .messages({
      'string.pattern.base': 'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character'
    }),
});

// ------------------ 1) Sign Up -----------------------
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    logger.info('Signup attempt:', { ...req.body, password: '[REDACTED]' });
    
    // Fix the email reference
    const { email } = req.body;
    
    // Check MX records for email domain
    try {
      const domain = email.split('@')[1];
      if (!domain) {
        return res.status(400).json({ 
          error: 'Invalid email format' 
        });
      }

      const mxRecords = await resolveMx(domain);
      
      if (!mxRecords || mxRecords.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid email domain - no mail server found' 
        });
      }
    } catch (error) {
      console.error('Email domain validation error:', error);
      return res.status(400).json({ 
        error: 'Invalid email domain' 
      });
    }

    // Validate
    const { error, value } = signUpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, firstName, lastName, phoneNumber, password } = value;

    // Check duplicates
    const usernameQuery = await usersCollection.where('username', '==', username).get();
    if (!usernameQuery.empty) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const emailQuery = await usersCollection.where('email', '==', email.toLowerCase()).get();
    if (!emailQuery.empty) {
      return res.status(400).json({ error: 'Email is already in use.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Add user
    const newUserRef = await usersCollection.add({
      username,
      firstName: firstName || '',
      lastName: lastName || '',
      email: email.toLowerCase(),
      phoneNumber: phoneNumber || '',
      password: hashedPassword,
      role: 'authenticated',
    });

    // JWT
    const token = jwt.sign(
      {
        id: newUserRef.id,
        username,
        email: email.toLowerCase(),
        role: 'authenticated',
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: newUserRef.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // Set secure cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info(`New user registered: ${email}`);

    return res.json({
      message: 'User signed up successfully.',
      user: {
        id: newUserRef.id,
        username,
        email: email.toLowerCase(),
        role: 'authenticated',
      },
    });
  } catch (err) {
    logger.error('Error in /api/auth/signup:', {
      error: err.message,
      stack: err.stack,
      body: { ...req.body, password: '[REDACTED]' }
    });
    return res.status(500).json({ 
      error: 'Internal server error.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ------------------ 2) Sign In ------------------------
app.post('/api/auth/signin', authLimiter, async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    
    // Validate required fields first
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required.' });
    }

    // Check login attempts using usernameOrEmail as the key instead of undefined email
    const attempts = loginAttempts.get(usernameOrEmail) || 0;
    if (attempts >= 5) {
      const lockoutEndTime = new Date(Date.now() + 15 * 60 * 1000);
      logger.warn(`Account locked: ${usernameOrEmail}`);
      return res.status(429).json({ 
        error: 'Too many login attempts. Account locked.',
        lockoutTime: lockoutEndTime.toISOString(),
        attemptsLeft: 0
      });
    }

    // Find user by username or email
    let userDoc = null;
    const usernameSnapshot = await usersCollection
      .where('username', '==', usernameOrEmail)
      .limit(1)
      .get();

    if (!usernameSnapshot.empty) {
      userDoc = usernameSnapshot.docs[0];
    } else {
      const emailSnapshot = await usersCollection
        .where('email', '==', usernameOrEmail.toLowerCase())
        .limit(1)
        .get();
      
      if (!emailSnapshot.empty) {
        userDoc = emailSnapshot.docs[0];
      }
    }

    const isMatch = userDoc ? await bcrypt.compare(password, userDoc.data().password) : false;

    // Update failed attempt response
    if (!userDoc || !isMatch) {
      loginAttempts.set(usernameOrEmail, attempts + 1);
      const remainingAttempts = 5 - (attempts + 1);
      const message = remainingAttempts > 0
        ? `Invalid credentials. ${remainingAttempts} attempts remaining.`
        : 'Invalid credentials. Last attempt before account lockout.';
      
      return res.status(401).json({ 
        error: message,
        attemptsLeft: remainingAttempts
      });
    }

    const userData = userDoc.data();
    
    // Reset login attempts on success
    loginAttempts.delete(usernameOrEmail);

    // Create tokens
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

    const refreshToken = jwt.sign(
      { id: userDoc.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info(`Successful login: ${usernameOrEmail}`);
    
    return res.json({
      message: 'Sign in successful.',
      user: {
        id: userDoc.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
      }
    });
  } catch (err) {
    logger.error('Error in /api/auth/signin:', err);
    return res.status(500).json({ 
      error: 'An unexpected error occurred during sign in. Please try again or contact support.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ------------------ 9) Sign Out (stateless) -----------
app.post('/api/auth/signout', async (req, res) => {
  try {
    // Clear cookies with the same options they were set with
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/'
    });
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/'
    });

    // Return immediately after clearing cookies
    return res.status(200).json({ message: 'Sign out successful' });
  } catch (err) {
    logger.error('Error in /api/auth/signout:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------ 3) Create Post (Admin only) -------
app.post('/api/posts', authenticateJWT, upload.single('image'), async (req, res) => {
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
      const postId = doc.id;

      // Ensure strings
      const additionalHTML =
        typeof data.additionalHTML === 'string' ? data.additionalHTML : '';
      const graphHTML =
        typeof data.graphHTML === 'string' ? data.graphHTML : '';

      allPosts.push({
        id: postId,
        ...data,
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

// ------------------ 5) Add Comment (auth or admin) ----
app.post('/api/posts/:postId/comments', authenticateJWT, async (req, res) => {
  try {
    const { postId } = req.params;
    const { commentText } = req.body;
    const { role, id: userId } = req.user;

    if (!role || (role !== 'admin' && role !== 'authenticated')) {
      return res.status(403).json({ error: 'Not authorized to comment.' });
    }
    if (!commentText) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    // Validate post
    const postDoc = await postsCollection.doc(postId).get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // Fetch user data
    let username = 'Anonymous';
    let userRole = 'User';
    if (userId) {
      const userDoc = await usersCollection.doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        username = userData.username || 'Anonymous';
        userRole = userData.role || 'User';
      }
    }

    // Add comment
    const newCommentRef = await commentsCollection.add({
      postId,
      userId: userId || null,
      text: commentText,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      username,
      userRole,
    });

    return res.json({
      message: 'Comment added successfully.',
      comment: { id: newCommentRef.id, text: commentText, username, userRole },
    });
  } catch (err) {
    console.error('Error in POST /api/posts/:postId/comments:', err);
    return res.status(500).json({ error: 'Internal server error.' });
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
    snapshot.forEach((doc) => {
      const data = doc.data();
      allComments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt
          ? data.createdAt.toDate().toISOString()
          : null,
      });
    });
    return res.json(allComments);
  } catch (err) {
    console.error('Error in GET /api/posts/:postId/comments:', err);
    return res.status(500).json({ error: 'Internal server error.' });
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
app.get('/api/users/:userId', authenticateJWT, async (req, res) => {
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
app.delete('/api/posts/:postId', authenticateJWT, async (req, res) => {
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
app.put('/api/posts/:postId', authenticateJWT, upload.single('image'), async (req, res) => {
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
