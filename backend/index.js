// backend/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const path = require('path');
const Joi = require('joi');
const authenticateJWT = require('./middleware/auth');
const { octokit, owner, repo, branch, imagesDir, uploadImageToGitHub } = require('./utils/github');
const upload = require('./middleware/upload'); // Adjust the path as necessary

const app = express();

const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // or 500 or whatever suits your dev environment
    message: 'Too many requests, please try again in 15 minutes!',
  });

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // Removed credentials: true
  }));
  
app.options('*', cors());
if (process.env.NODE_ENV === 'production') {
    app.use(limiter);
}


// Increase JSON body parser limit to handle large payloads (e.g., image uploads)
app.use(express.json({ limit: '10mb' }));

// ------------- Initialize Firebase Admin -------------

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
console.log("ServiceAccountPath: ", serviceAccountPath);
// Resolve the absolute path (ensure it points correctly)
const resolvedServiceAccountPath = path.resolve(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(resolvedServiceAccountPath),
  // storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // Add this line if using Firebase Storage
});

const db = admin.firestore();
// const bucket = admin.storage().bucket(); // Reference to Firebase Storage bucket

// Collection references
const usersCollection = db.collection('users');
const postsCollection = admin.firestore().collection('posts');
const commentsCollection = db.collection('comments');

/*************************************************************************
 * Data structure:
 *   users (collection)
 *     doc: userId (auto gen)
 *       username, firstName, lastName, email, phoneNumber, password, role
 *
 *   posts (collection)
 *     doc: postId
 *       title, description, createdBy (userId or username), createdAt
 *
 *   comments (collection)
 *     doc: commentId
 *       postId, userId, text, username, userRole, createdAt
 *************************************************************************/


const signUpSchema = Joi.object({
    username: Joi.string().max(20).required(),
    firstName: Joi.string().allow('', null),
    lastName: Joi.string().allow('', null),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().allow('', null),
    password: Joi.string().min(6).required(),
  });

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
      const { title, description, category } = req.body;
      const { role, id: userId } = req.user;
  
      if (!title || !description || !category) {
        return res.status(400).json({ error: 'Title, description, and category are required.' });
      }
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Only admin can create posts.' });
      }
  
      let imageUrl = null;
  
      if (req.file) {
        const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
        try {
          imageUrl = await uploadImageToGitHub(filename, req.file.buffer);
        } catch (error) {
          return res.status(500).json({ error: error.message || 'Image upload failed.' });
        }
      }
  
      // Get username from users collection
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const username = userDoc.exists ? userDoc.data().username : 'Unknown User';
  
      // Add post to Firestore
      const newPostRef = await postsCollection.add({
        title,
        description,
        category,
        imageUrl,
        createdBy: userId || null,
        createdByUsername: username,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
      const { category } = req.query;
      let query = postsCollection.orderBy('createdAt', 'desc');

      if (category && category !== 'All') {
        query = query.where('category', '==', category);
      }

      const snapshot = await query.get();
      const allPosts = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const postId = doc.id;

        // Fetch comments for the post
        const commentsSnapshot = await commentsCollection
          .where('postId', '==', postId)
          .orderBy('createdAt', 'desc')
          .get();

        const comments = [];
        commentsSnapshot.forEach((commentDoc) => {
          const commentData = commentDoc.data();
          comments.push({
            id: commentDoc.id,
            ...commentData,
            createdAt: commentData.createdAt
              ? commentData.createdAt.toDate().toISOString()
              : null,
          });
        });

        allPosts.push({
          id: postId,
          ...data,
          createdAt: data.createdAt
            ? data.createdAt.toDate().toISOString()
            : null,
          comments, // Include comments here
        });
      }

      return res.json(allPosts);
    } catch (err) {
      console.error('Error in GET /api/posts:', err);
      return res.status(500).json({ error: 'Internal server error.' });
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
  
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can delete posts.' });
      }
  
      const postRef = postsCollection.doc(postId);
      const postDoc = await postRef.get();
  
      if (!postDoc.exists) {
        return res.status(404).json({ error: 'Post not found.' });
      }
  
      await postRef.delete();
  
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
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});