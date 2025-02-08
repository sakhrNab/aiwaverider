const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const multer = require('multer');
const validateFirebaseToken = require('../middleware/authenticate');
const crypto = require('crypto'); // NEW: require crypto

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Initialize Firestore
const db = admin.firestore();

// GET /api/profile - Retrieve the main profile details.
router.get('/', validateFirebaseToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userDoc.data());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/profile - Update profile information.
router.put('/', validateFirebaseToken, async (req, res) => {
  try {
    const updateData = req.body; // e.g., { firstName, lastName, displayName, bio, ... }
    await db.collection('users').doc(req.user.uid).update(updateData);
    const updatedDoc = await db.collection('users').doc(req.user.uid).get();
    res.json(updatedDoc.data());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Updated upload-avatar endpoint
router.put('/upload-avatar', validateFirebaseToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    // Compute md5 hash of file buffer
    const fileHash = crypto.createHash('md5').update(req.file.buffer).digest('hex');
    const storage = admin.storage();
    const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET);
    // Create a file reference using the hash as filename
    const fileName = `avatars/${fileHash}-${req.file.originalname}`;
    const fileRef = bucket.file(fileName);
    // Check if file exists already
    const [exists] = await fileRef.exists();
    if (!exists) {
      // Upload file if not exists
      await fileRef.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });
    }
    // Get public URL (assumes file is public or token is added)
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    // Update profile, etc...
    return res.json({ photoURL: publicUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to upload avatar.' });
  }
});

// PUT /api/profile/interests - Update topics of interest.
router.put('/interests', validateFirebaseToken, async (req, res) => {
  try {
    const { interests } = req.body; // interests should be an array of strings
    await db.collection('users').doc(req.user.uid).update({ interests });
    res.json({ interests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/profile/notifications - Get current notification settings.
router.get('/notifications', validateFirebaseToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userDoc.data().notifications || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/profile/notifications - Update notification settings.
router.put('/notifications', validateFirebaseToken, async (req, res) => {
  try {
    const { notifications } = req.body; // notifications should be an object, e.g., { email: true, inApp: false }
    await db.collection('users').doc(req.user.uid).update({ notifications });
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/profile/subscriptions - Get user's subscriptions.
router.get('/subscriptions', validateFirebaseToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userDoc.data().subscriptions || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/profile/favorites - Get the list of bookmarked articles.
router.get('/favorites', validateFirebaseToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userDoc.data().favorites || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/favorites - Add an article to favorites.
router.post('/favorites', validateFirebaseToken, async (req, res) => {
  try {
    const { favoriteId } = req.body;
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const favorites = userDoc.data().favorites || [];
    if (!favorites.includes(favoriteId)) {
      favorites.push(favoriteId);
      await userRef.update({ favorites });
    }
    res.json(favorites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/profile/favorites/:id - Remove an article from favorites.
router.delete('/favorites/:id', validateFirebaseToken, async (req, res) => {
  try {
    const favoriteId = req.params.id;
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    let favorites = userDoc.data().favorites || [];
    favorites = favorites.filter(id => id !== favoriteId);
    await userRef.update({ favorites });
    res.json(favorites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/profile/community - Retrieve community information (e.g., a Discord invite link).
router.get('/community', validateFirebaseToken, async (req, res) => {
  // You can store your Discord invite URL in an environment variable.
  const discordInvite = process.env.DISCORD_INVITE || 'https://discord.gg/your-invite-code';
  res.json({ discordInvite });
});

module.exports = router;
