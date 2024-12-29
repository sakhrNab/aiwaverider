// backend/controllers/postsController.js

const sanitizeHtml = require('../utils/sanitize');
const {
  uploadImageToGitHub,
  deleteImageFromGitHub,
} = require('../utils/github');
const admin = require('firebase-admin');

const postsCollection = admin.firestore().collection('posts');
const commentsCollection = admin.firestore().collection('comments');
const usersCollection = admin.firestore().collection('users');

const createPost = async (req, res, user) => {
  try {
    const { title, description, category, additionalHTML, graphHTML } = req.body;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Title, description, and category are required.' });
    }

    // Handle image upload if provided
    let imageUrl = null;
    let imageSha = null;
    if (req.file) {
      const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
      const uploadResult = await uploadImageToGitHub(filename, req.file.buffer);
      if (!uploadResult || !uploadResult.url || !uploadResult.sha) {
        throw new Error('Image upload failed: Missing URL or SHA.');
      }
      imageUrl = uploadResult.url;
      imageSha = uploadResult.sha;
    }

    // Get username from users collection
    const userDoc = await usersCollection.doc(user.id).get();
    const username = userDoc.exists ? userDoc.data().username : 'Unknown User';

    // Sanitize inputs
    const sanitizedAdditionalHTML = sanitizeHtml(additionalHTML || '');
    const sanitizedGraphHTML = sanitizeHtml(graphHTML || '');

    // Add post to Firestore
    const newPostRef = await postsCollection.add({
      title,
      description,
      category,
      imageUrl,
      imageSha,
      additionalHTML: sanitizedAdditionalHTML,
      graphHTML: sanitizedGraphHTML,
      createdBy: user.id || null,
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
    console.error('Error in createPost:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// Similarly, define other controller functions like updatePost, deletePost, etc.

module.exports = {
  createPost,
  // export other controller functions as needed
};
