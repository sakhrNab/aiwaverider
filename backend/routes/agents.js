// backend/routes/agents.js
const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agentsController');
const validateFirebaseToken = require('../middleware/authenticate');
const publicCacheMiddleware = require('../middleware/publicCacheMiddleware');
const upload = require('../middleware/upload');
const { db } = require('../config/firebase');
const admin = require('firebase-admin');
const { authenticate } = require('../middleware/auth');

// Cache durations based on environment
const getDefaultCacheDuration = () => {
  return process.env.NODE_ENV === 'development' ? 30 : 300; // 30 seconds in dev, 5 minutes in production
};

const getFeaturedCacheDuration = () => {
  return process.env.NODE_ENV === 'development' ? 60 : 900; // 1 minute in dev, 15 minutes in production
};

// Public endpoints (cached)
router.get('/', publicCacheMiddleware({ duration: getDefaultCacheDuration() }), agentsController.getAgents);
router.get('/featured', publicCacheMiddleware({ duration: getFeaturedCacheDuration() }), agentsController.getFeaturedAgents);

// Cache busting route
router.get('/refresh-cache', validateFirebaseToken, (req, res) => {
  // Clear the cache for the agents routes
  if (req.app.locals.cache) {
    const cacheKeys = Array.from(req.app.locals.cache.keys());
    const agentCacheKeys = cacheKeys.filter(key => key.includes('/api/agents'));
    
    agentCacheKeys.forEach(key => {
      req.app.locals.cache.del(key);
    });
    
    console.log(`Cleared ${agentCacheKeys.length} agent cache entries`);
    return res.status(200).json({ message: `Cleared ${agentCacheKeys.length} agent cache entries` });
  }
  
  return res.status(200).json({ message: 'No cache to clear' });
});

// Add a specific route for Firebase document IDs
router.get('/doc/:docId', publicCacheMiddleware({ duration: getDefaultCacheDuration() }), (req, res) => {
  // Set the agentId parameter to the docId and forward to the getAgentById controller
  req.params.id = req.params.docId;
  return agentsController.getAgentById(req, res);
});

// Add a specific route for the 'agent-XX' format IDs
router.get('/agent-:numericId([0-9]+)', publicCacheMiddleware({ duration: getDefaultCacheDuration() }), (req, res) => {
  // Set the agentId parameter and forward to the getAgentById controller
  // This captures 'agent-41' format directly using route parameter
  const agentId = `agent-${req.params.numericId}`;
  console.log(`Special route captured agent-XX format: ${agentId}`);
  req.params.id = agentId;
  return agentsController.getAgentById(req, res);
});

router.get('/:agentId', publicCacheMiddleware({ duration: getDefaultCacheDuration() }), agentsController.getAgentById);

// GET /api/agents/:agentId/downloads - Get download count for an agent
router.get('/:agentId/downloads', agentsController.getDownloadCount);

// POST /api/agents/:agentId/downloads - Increment download count
router.post('/:agentId/downloads', validateFirebaseToken, agentsController.incrementDownloadCount);

// ----- AGENT REVIEWS AND RATINGS -----

// Get reviews for an agent
router.get('/:agentId/reviews', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const reviewsQuery = db.collection('agent_reviews')
      .where('agentId', '==', agentId)
      .orderBy('createdAt', 'desc');
      
    const reviewsSnapshot = await reviewsQuery.get();
    const reviews = [];
    
    reviewsSnapshot.forEach(doc => {
      reviews.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching agent reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Add a review to an agent
router.post('/:agentId/reviews', validateFirebaseToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { content, rating } = req.body;
    const userId = req.user.uid;
    const userName = req.user.displayName || req.user.email.split('@')[0];
    
    // Validate input
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Review content is required' });
    }
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check if agent exists
    const agentRef = db.collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Create review document
    const reviewData = {
      agentId,
      userId,
      userName,
      content,
      rating,
      createdAt: new Date().toISOString()
    };
    
    const reviewRef = await db.collection('agent_reviews').add(reviewData);
    
    // Update agent's rating
    const agentData = agentDoc.data();
    const currentRating = agentData.rating || { average: 0, count: 0 };
    const reviews = agentData.reviews || [];
    
    // Calculate new average
    const totalRating = (currentRating.average * currentRating.count) + rating;
    const newCount = currentRating.count + 1;
    const newAverage = totalRating / newCount;
    
    // Add review to agent document
    const newReview = {
      id: reviewRef.id,
      userId,
      userName,
      content,
      rating,
      createdAt: new Date().toISOString()
    };
    
    // Update agent document
    await agentRef.update({
      rating: {
        average: newAverage,
        count: newCount
      },
      reviews: admin.firestore.FieldValue.arrayUnion(newReview)
    });
    
    res.status(201).json({
      success: true,
      reviewId: reviewRef.id,
      newRating: {
        average: newAverage,
        count: newCount
      }
    });
    
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Toggle like on an agent
router.post('/:agentId/toggle-like', validateFirebaseToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user.uid;
    
    // Check if agent exists
    const agentRef = db.collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const agentData = agentDoc.data();
    const likes = agentData.likes || [];
    const userLikedIndex = likes.indexOf(userId);
    
    let updatedLikes;
    let liked;
    
    if (userLikedIndex >= 0) {
      // User already liked, remove the like
      updatedLikes = likes.filter(id => id !== userId);
      liked = false;
    } else {
      // User hasn't liked, add the like
      updatedLikes = [...likes, userId];
      liked = true;
    }
    
    // Update agent document
    await agentRef.update({
      likes: updatedLikes
    });
    
    res.json({
      success: true,
      liked,
      likesCount: updatedLikes.length
    });
    
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Run the database update script programmatically
router.post('/update-collections', async (req, res) => {
  try {
    // Import the update script functions
    const { initializeCollections } = require('../scripts/updateAgentsCollection');
    
    // Run the initialization
    await initializeCollections();
    
    res.json({ success: true, message: 'Agent collections updated successfully' });
  } catch (error) {
    console.error('Error running update script:', error);
    res.status(500).json({ error: 'Failed to update collections' });
  }
});

// Protected endpoints (require authentication)
router.get('/wishlists', validateFirebaseToken, agentsController.getWishlists);
router.post('/wishlists/:agentId', validateFirebaseToken, agentsController.toggleWishlist);
router.get('/wishlists/:wishlistId', validateFirebaseToken, agentsController.getWishlistById);

// Admin endpoints for agent management (require admin role)
// Use upload middleware to handle file uploads - set up fields for both image and icon
router.post('/', validateFirebaseToken, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'icon', maxCount: 1 }
]), agentsController.createAgent);

// Also update the patch route to handle file uploads
router.patch('/:agentId', validateFirebaseToken, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'icon', maxCount: 1 }
]), agentsController.updateAgent);

router.delete('/:agentId', validateFirebaseToken, agentsController.deleteAgent);

// Development endpoint - only available in development environment
if (process.env.NODE_ENV === 'development') {
  router.post('/seed', agentsController.seedAgents);
}

// Get agent stats (download count, etc.) - public endpoint
router.get('/:agentId/stats', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Check if agent exists
    const agentRef = db.collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const agentData = agentDoc.data();
    
    // Return relevant public stats
    res.json({
      downloadCount: agentData.downloadCount || 0,
      viewCount: agentData.viewCount || 0,
      rating: agentData.rating || { average: 0, count: 0 },
      reviewCount: agentData.reviews?.length || 0,
      likesCount: Array.isArray(agentData.likes) ? agentData.likes.length : (agentData.likes || 0)
    });
    
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({ error: 'Failed to fetch agent stats' });
  }
});

// Increment download count - works for both authenticated and unauthenticated users
router.post('/:agentId/increment-downloads', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Check if agent exists
    const agentRef = db.collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Increment download count
    await agentRef.update({
      downloadCount: admin.firestore.FieldValue.increment(1)
    });
    
    res.json({ 
      success: true,
      message: 'Download count incremented successfully'
    });
    
  } catch (error) {
    console.error('Error incrementing download count:', error);
    res.status(500).json({ error: 'Failed to increment download count' });
  }
});

module.exports = router; 