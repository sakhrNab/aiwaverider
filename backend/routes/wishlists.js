const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const validateFirebaseToken = require('../middleware/authenticate');
const publicCacheMiddleware = require('../middleware/publicCacheMiddleware');

// Get all wishlists (publicly available)
router.get('/', publicCacheMiddleware({ duration: 900 }), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const wishlistsSnapshot = await db.collection('wishlists')
      .limit(parseInt(limit))
      .get();
    
    // Default placeholder as data URI
    const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='24' text-anchor='middle' fill='%23999'%3EAW%3C/text%3E%3C/svg%3E";
    const defaultItemImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='14' text-anchor='middle' fill='%23999'%3EItem%3C/text%3E%3C/svg%3E";
    
    const wishlists = [];
    wishlistsSnapshot.forEach(doc => {
      const wishlistData = doc.data();
      
      // Ensure the wishlist has a consistent structure
      const wishlist = {
        id: doc.id,
        name: wishlistData.name || `Wishlist ${doc.id}`,
        description: wishlistData.description || '',
        creator: wishlistData.creator || {
          id: 'system',
          name: 'AI Wave Rider',
          avatar: defaultAvatar
        },
        items: Array.isArray(wishlistData.items) ? wishlistData.items : [],
        createdAt: wishlistData.createdAt || new Date(),
        likes: wishlistData.likes || 0,
        views: wishlistData.views || 0
      };
      
      // Ensure each item has a consistent structure
      if (wishlist.items.length > 0) {
        wishlist.items = wishlist.items.map(item => ({
          id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
          name: item.name || 'Unknown Item',
          imageUrl: item.imageUrl || defaultItemImage,
          price: item.price || 'Free'
        }));
      }
      
      // Ensure creator has an avatar
      if (wishlist.creator && !wishlist.creator.avatar) {
        wishlist.creator.avatar = defaultAvatar;
      }
      
      wishlists.push(wishlist);
    });
    
    return res.status(200).json(wishlists);
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    return res.status(500).json({ error: 'Failed to fetch wishlists' });
  }
});

// Get user's wishlists (requires authentication)
router.get('/user/me', validateFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const wishlistsSnapshot = await db.collection('wishlists')
      .where('creator.id', '==', uid)
      .get();
    
    const wishlists = [];
    wishlistsSnapshot.forEach(doc => {
      wishlists.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return res.status(200).json(wishlists);
  } catch (error) {
    console.error('Error fetching user wishlists:', error);
    return res.status(500).json({ error: 'Failed to fetch user wishlists' });
  }
});

// Get a specific wishlist by ID
router.get('/:wishlistId', publicCacheMiddleware({ duration: 600 }), async (req, res) => {
  try {
    const { wishlistId } = req.params;
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    
    if (!wishlistDoc.exists) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }
    
    // Default placeholder as data URI
    const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='24' text-anchor='middle' fill='%23999'%3EAW%3C/text%3E%3C/svg%3E";
    const defaultItemImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='14' text-anchor='middle' fill='%23999'%3EItem%3C/text%3E%3C/svg%3E";
    
    // Get the wishlist data and ensure consistent structure
    const wishlistData = wishlistDoc.data();
    const wishlist = {
      id: wishlistDoc.id,
      name: wishlistData.name || `Wishlist ${wishlistDoc.id}`,
      description: wishlistData.description || '',
      creator: wishlistData.creator || {
        id: 'system',
        name: 'AI Wave Rider',
        avatar: defaultAvatar
      },
      items: Array.isArray(wishlistData.items) ? wishlistData.items : [],
      createdAt: wishlistData.createdAt || new Date(),
      likes: wishlistData.likes || 0,
      views: wishlistData.views || 0
    };
    
    // Ensure each item has a consistent structure
    if (wishlist.items.length > 0) {
      wishlist.items = wishlist.items.map(item => ({
        id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
        name: item.name || 'Unknown Item',
        imageUrl: item.imageUrl || defaultItemImage,
        price: item.price || 'Free'
      }));
    }
    
    // Ensure creator has an avatar
    if (wishlist.creator && !wishlist.creator.avatar) {
      wishlist.creator.avatar = defaultAvatar;
    }
    
    return res.status(200).json(wishlist);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

module.exports = router; 