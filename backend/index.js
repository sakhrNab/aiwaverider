// backend/index.js

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
} = require('./utils/github'); // Import GitHub utils
const upload = require('./middleware/upload'); // Import upload middleware

const app = express();

// ------------------ Rate Limiting ------------------
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests, please try again in 15 minutes!',
});

// Apply rate limiting only in production or development
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
if (isProduction || isDevelopment) {
  app.use(limiter);
}

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

// ------------------ Initialize Firebase Admin ------------------
let serviceAccount;

if (isProduction) {
  // In production, use environment variables or Secret Manager
  // Assuming you have set FIREBASE_SERVICE_ACCOUNT_JSON as a base64 string
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    console.error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
    process.exit(1);
  }
  serviceAccount = JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString('utf-8'));
} else {
  // In development, use a local service account JSON file
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'path/to/local/serviceAccountKey.json';
  serviceAccount = require(path.resolve(serviceAccountPath));
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // Uncomment if using Firebase Storage
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
 *     doc: userId (auto gen)
 *       username, firstName, lastName, email, phoneNumber, password, role
 *
 *   posts (collection)
 *     doc: postId
 *       title, description, category, imageUrl, imageSha, additionalHTML, graphHTML, createdBy, createdByUsername, createdAt, updatedAt
 *
 *   comments (collection)
 *     doc: commentId
 *       postId, userId, text, username, userRole, createdAt
 *************************************************************************/

// ------------------ Validation Schemas ------------------
const signUpSchema = Joi.object({
  username: Joi.string().max(20).required(),
  firstName: Joi.string().allow('', null),
  lastName: Joi.string().allow('', null),
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().allow('', null),
  password: Joi.string().min(6).required(),
});

// ------------------ Routes ------------------

// ------------------ 1) Sign Up -----------------------
app.post('/api/auth/signup', async (req, res) => {
  try {
    // Validate the incoming data
    const { error, value } = signUpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Destructure the validated data
    const { username, firstName, lastName, email, phoneNumber, password } = value;

    // Check if user with same username or email exists
    const usernameQuery = await usersCollection.where('username', '==', username).get();
    if (!usernameQuery.empty) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const emailQuery = await usersCollection.where('email', '==', email.toLowerCase()).get();
    if (!emailQuery.empty) {
      return res.status(400).json({ error: 'Email is already in use.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Add user to Firestore
    const newUserRef = await usersCollection.add({
      username,
      firstName: firstName || '',
      lastName: lastName || '',
      email: email.toLowerCase(),
      phoneNumber: phoneNumber || '',
      password: hashedPassword,
      role: 'authenticated', // default role
    });

    // Generate a JWT upon sign-up
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

    return res.json({
      message: 'User signed up successfully.',
      userId: newUserRef.id,
      token,
      user: {
        id: newUserRef.id,
        username,
        email: email.toLowerCase(),
        role: 'authenticated',
      },
    });
  } catch (err) {
    console.error('Error in /api/auth/signup:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------ 2) Sign In ------------------------
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res
        .status(400)
        .json({ error: 'Username/Email and password are required.' });
    }

    // Find user by username or email
    let userDoc;
    // First, try username
    const usernameQuery = await usersCollection
      .where('username', '==', usernameOrEmail)
      .get();
    if (!usernameQuery.empty) {
      userDoc = usernameQuery.docs[0];
    } else {
      // Then, try email
      const emailQuery = await usersCollection
        .where('email', '==', usernameOrEmail.toLowerCase())
        .get();
      if (!emailQuery.empty) {
        userDoc = emailQuery.docs[0];
      }
    }

    if (!userDoc) {
      return res.status(401).json({ error: 'Invalid credentials (not found).' });
    }

    const userData = userDoc.data();
    // Compare hashed password
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials (bad password).' });
    }

    // Create JWT
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

    // Return user data and token
    return res.json({
      message: 'Sign in successful.',
      token,
      user: {
        id: userDoc.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
      },
    });
  } catch (err) {
    console.error('Error in /api/auth/signin:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------ 3) Create Post (Admin only) -------
app.post('/api/posts', authenticateJWT, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, additionalHTML, graphHTML } = req.body;
    const { role, id: userId } = req.user;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Title, description, and category are required.' });
    }

    // Check for admin role
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can create posts.' });
    }

    let imageUrl = null;
    let imageSha = null; // To track the file's SHA for deletion

    // Handle image upload if provided
    if (req.file) {
      const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
      try {
        const uploadResult = await uploadImageToGitHub(filename, req.file.buffer);

        if (!uploadResult || !uploadResult.url || !uploadResult.sha) {
          throw new Error('Image upload failed: Missing URL or SHA.');
        }
        imageUrl = uploadResult.url;
        imageSha = uploadResult.sha; // Assuming uploadImageToGitHub returns both URL and SHA
      } catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json({ error: error.message || 'Image upload failed.' });
      }
    }

    // Get username from users collection
    const userDoc = await usersCollection.doc(userId).get();
    const username = userDoc.exists ? userDoc.data().username : 'Unknown User';

    // Sanitize additionalHTML and graphHTML before storing
    const sanitizedAdditionalHTML = sanitizeHtml(additionalHTML || '');
    const sanitizedGraphHTML = sanitizeHtml(graphHTML || '');

    // Add post to Firestore with additional fields
    const newPostRef = await postsCollection.add({
      title,
      description,
      category,
      imageUrl,
      imageSha, // Store SHA for potential future deletions
      additionalHTML: sanitizedAdditionalHTML,
      graphHTML: sanitizedGraphHTML,
      createdBy: userId || null,
      createdByUsername: username,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const newPostDoc = await newPostRef.get();

    return res.json({
      message: 'Post created successfully.',
      post: { id: newPostRef.id, ...newPostDoc.data() },
    });
  } catch (err) {
    console.error('Error in /api/posts:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------ 4) Get All Posts (public) ---------
app.get('/api/posts', async (req, res) => {
  try {
    const { category, limit, startAfter } = req.query;
    const limitNumber = parseInt(limit, 10) || 10; // Default to 10 posts per page

    let query = postsCollection.orderBy('createdAt', 'desc').limit(limitNumber);

    if (category && category !== 'All') {
      query = query.where('category', '==', category);
    }

    if (startAfter) {
      // Parse startAfter as ISO string to Firestore Timestamp
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
      // Firestore 'in' queries support up to 10 items per query
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

    // Organize comments by postId
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

      // Ensure additionalHTML and graphHTML are strings
      const additionalHTML = typeof data.additionalHTML === 'string' ? data.additionalHTML : '';
      const graphHTML = typeof data.graphHTML === 'string' ? data.graphHTML : '';

      allPosts.push({
        id: postId,
        ...data,
        additionalHTML, // Ensure it's a string
        graphHTML, // Ensure it's a string
        createdAt: data.createdAt
          ? data.createdAt.toDate().toISOString()
          : null,
        comments: commentsByPostId[postId] || [],
      });
    });

    // Determine if there is a next page
    let lastPostCreatedAt = null;
    if (snapshot.docs.length > 0) {
      lastPostCreatedAt = snapshot.docs[snapshot.docs.length - 1].data().createdAt.toDate().toISOString();
    }

    return res.json({
      posts: allPosts,
      lastPostCreatedAt, // Cursor for next page
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

    // Validate user role
    if (!role || (role !== 'admin' && role !== 'authenticated')) {
      return res.status(403).json({ error: 'Not authorized to comment.' });
    }

    // Validate comment text
    if (!commentText) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    // Validate that the post exists
    const postDoc = await postsCollection.doc(postId).get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // Fetch user data to include in comment
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

    // Add comment to Firestore
    const newCommentRef = await commentsCollection.add({
      postId,
      userId: userId || null,
      text: commentText,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      username, // Include username
      userRole, // Include user role
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
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null 
      });
    });
    return res.json(allComments);
  } catch (err) {
    console.error('Error in GET /api/posts/:postId/comments:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------ 7) Get User Profile (authenticated) ----
app.get('/api/users/:userId', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Optional: Only allow users to fetch their own profiles or admins to fetch any
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

    // Check for admin role
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete posts.' });
    }

    const postRef = postsCollection.doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const postData = postDoc.data();

    // Delete associated image from GitHub if imageUrl and imageSha exist
    if (postData.imageUrl && postData.imageSha) {
      try {
        const filename = path.basename(postData.imageUrl);
        await deleteImageFromGitHub(filename, postData.imageSha);
      } catch (error) {
        console.error('Error deleting image from GitHub:', error);
        // Continue even if image deletion fails
      }
    }

    // Delete post document
    await postRef.delete();

    // Optionally, delete comments associated with the post
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

// ------------------ 9) Sign Out ------------------------
app.post('/api/auth/signout', authenticateJWT, async (req, res) => {
  try {
    // Since JWTs are stateless, signing out is handled client-side by deleting the token.
    // If implementing token blacklisting, handle it here.
    return res.json({ message: 'Sign out successful.' });
  } catch (err) {
    console.error('Error in /api/auth/signout:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------ 10) Get Post by ID GET /api/posts/:postId
app.get('/api/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const postDoc = await postsCollection.doc(postId).get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const postData = postDoc.data();

    // Ensure additionalHTML and graphHTML are strings
    const additionalHTML = typeof postData.additionalHTML === 'string' ? postData.additionalHTML : '';
    const graphHTML = typeof postData.graphHTML === 'string' ? postData.graphHTML : '';

    return res.json({ 
      id: postId, 
      ...postData, 
      additionalHTML, 
      graphHTML 
    });
  } catch (err) {
    console.error('Error fetching post:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ------------------ 11) Update Post by ID - admin PUT /api/posts/:postId
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
    let imageSha = null; // To track the file's SHA for deletion
    if (req.file) {
      try {
        const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
        const uploadResult = await uploadImageToGitHub(filename, req.file.buffer);
        if (!uploadResult || !uploadResult.url || !uploadResult.sha) {
          throw new Error('Image upload failed: Missing URL or SHA.');
        }
        imageUrl = uploadResult.url;
        imageSha = uploadResult.sha; // Assuming uploadImageToGitHub returns both URL and SHA
      } catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json({ error: error.message || 'Image upload failed.' });
      }
    }

    // Validate that the post exists
    const postRef = postsCollection.doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // If new image is uploaded and previous image exists, delete previous image
    const postData = postDoc.data();
    if (imageUrl && postData.imageUrl && postData.imageSha) {
      try {
        const oldFilename = path.basename(postData.imageUrl);
        await deleteImageFromGitHub(oldFilename, postData.imageSha);
      } catch (error) {
        console.error('Error deleting old image from GitHub:', error);
        // Continue even if deletion fails
      }
    }

    // Sanitize additionalHTML and graphHTML before storing
    const sanitizedAdditionalHTML = sanitizeHtml(additionalHTML || '');
    const sanitizedGraphHTML = sanitizeHtml(graphHTML || '');

    // Update fields
    const updates = {
      title,
      description,
      category,
      additionalHTML: sanitizedAdditionalHTML,
      graphHTML: sanitizedGraphHTML,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (imageUrl !== null) { // Explicitly check for null
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
app.use((req, res, next) => {
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
