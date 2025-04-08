const { db, admin } = require('../config/firebase');
const wishlistService = require('../services/wishlist/wishlistService');
const logger = require('../utils/logger');

// Modify this line to handle the case where sanitize might not be available
let sanitizeObject;
try {
  // Try to load the sanitize utility
  const sanitizeUtils = require('../utils/sanitize');
  sanitizeObject = sanitizeUtils.sanitizeObject;
} catch (err) {
  // If sanitize utility isn't available, create a simple passthrough function
  console.log('Sanitize utility not available, using fallback');
  sanitizeObject = (obj) => obj;
}

/**
 * Get all wishlists
 */
exports.getWishlists = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit, 10);
    
    // Get all public wishlists
    const wishlistsSnapshot = await db.collection('wishlists')
      .where('isPublic', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(limitNum)
      .get();
    
    if (wishlistsSnapshot.empty) {
      return res.json({ wishlists: [] });
    }
    
    const wishlists = [];
    
    // Process each wishlist
    for (const doc of wishlistsSnapshot.docs) {
      try {
        const wishlistData = doc.data();
        
        // Get creator info
        let creatorData = null;
        if (wishlistData.creatorId) {
          try {
            const creatorDoc = await db.collection('users').doc(wishlistData.creatorId).get();
            if (creatorDoc.exists) {
              const creatorDocData = creatorDoc.data() || {};
              creatorData = {
                id: creatorDoc.id,
                name: creatorDocData.username || creatorDocData.displayName || 'Unknown User',
                avatar: creatorDocData.photoURL || null
              };
            }
          } catch (creatorError) {
            console.error('Error getting creator data:', creatorError);
            // Continue with null creatorData
          }
        }
        
        // Get first few items in the wishlist
        const itemsSnapshot = await db.collection('wishlists')
          .doc(doc.id)
          .collection('items')
          .limit(4)
          .get();
        
        const items = [];
        
        for (const itemDoc of itemsSnapshot.docs) {
          try {
            const itemData = itemDoc.data() || {};
            
            // Get basic agent info
            let agentData = null;
            if (itemData.agentId) {
              try {
                const agentDoc = await db.collection('agents').doc(itemData.agentId).get();
                if (agentDoc.exists) {
                  const agent = agentDoc.data() || {};
                  agentData = {
                    id: agentDoc.id,
                    title: agent.title || agent.name || 'Unnamed Agent',
                    imageUrl: agent.imageUrl || null
                  };
                }
              } catch (agentError) {
                console.error('Error getting agent data:', agentError);
                // Continue with null agentData
              }
            }
            
            // Safely convert dates
            let addedAtDate = null;
            if (itemData.addedAt) {
              try {
                addedAtDate = itemData.addedAt.toDate();
              } catch (dateError) {
                console.error('Error converting addedAt date:', dateError);
                // Keep as null
              }
            }
            
            items.push({
              id: itemDoc.id,
              agentId: itemData.agentId || null,
              addedAt: addedAtDate,
              ...agentData
            });
          } catch (itemError) {
            console.error('Error processing wishlist item:', itemError);
            // Skip this item and continue
          }
        }
        
        // Safely convert dates
        let createdAtDate = null;
        let updatedAtDate = null;
        
        if (wishlistData.createdAt) {
          try {
            createdAtDate = wishlistData.createdAt.toDate();
          } catch (dateError) {
            console.error('Error converting createdAt date:', dateError);
            // Keep as null
          }
        }
        
        if (wishlistData.updatedAt) {
          try {
            updatedAtDate = wishlistData.updatedAt.toDate();
          } catch (dateError) {
            console.error('Error converting updatedAt date:', dateError);
            // Keep as null
          }
        }
        
        wishlists.push({
          id: doc.id,
          name: wishlistData.name || 'Unnamed Wishlist',
          description: wishlistData.description || '',
          itemCount: wishlistData.itemCount || 0,
          creator: creatorData,
          items,
          createdAt: createdAtDate,
          updatedAt: updatedAtDate
        });
      } catch (wishlistError) {
        console.error('Error processing wishlist:', wishlistError);
        // Skip this wishlist and continue
      }
    }
    
    return res.json({ wishlists });
  } catch (error) {
    console.error('Error getting wishlists:', error);
    return res.status(500).json({ error: 'Failed to retrieve wishlists', message: error.message });
  }
};

/**
 * Get user's wishlists
 */
exports.getUserWishlists = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    const options = {
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10)
    };
    
    const result = await wishlistService.getUserWishlists(userId, options);
    
    return res.json({ 
      success: true,
      ...result
    });
  } catch (error) {
    logger.error(`Controller error getting user wishlists: ${error.message}`);
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Get wishlist by ID
 */
exports.getWishlistById = async (req, res) => {
  try {
    const { wishlistId } = req.params;
    // User ID may be undefined for non-authenticated requests
    const userId = req.user ? req.user.id : null;
    
    if (!wishlistId) {
      return res.status(400).json({ error: 'Wishlist ID is required' });
    }
    
    const wishlist = await wishlistService.getWishlistById(wishlistId, userId);
    
    return res.json({ 
      success: true,
      wishlist
    });
  } catch (error) {
    logger.error(`Controller error getting wishlist by ID: ${error.message}`);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Create a new wishlist
 */
exports.createWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const wishlistData = req.body;
    
    if (!wishlistData || !wishlistData.name) {
      return res.status(400).json({ error: 'Wishlist name is required' });
    }
    
    const wishlist = await wishlistService.createWishlist(userId, wishlistData);
    
    return res.status(201).json({ 
      success: true,
      wishlist
    });
  } catch (error) {
    logger.error(`Controller error creating wishlist: ${error.message}`);
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Update a wishlist
 */
exports.updateWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { wishlistId } = req.params;
    const updateData = req.body;
    
    if (!wishlistId) {
      return res.status(400).json({ error: 'Wishlist ID is required' });
    }
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Update data is required' });
    }
    
    const wishlist = await wishlistService.updateWishlist(wishlistId, userId, updateData);
    
    return res.json({ 
      success: true,
      wishlist
    });
  } catch (error) {
    logger.error(`Controller error updating wishlist: ${error.message}`);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Delete a wishlist
 */
exports.deleteWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { wishlistId } = req.params;
    
    if (!wishlistId) {
      return res.status(400).json({ error: 'Wishlist ID is required' });
    }
    
    await wishlistService.deleteWishlist(wishlistId, userId);
    
    return res.json({ 
      success: true,
      message: 'Wishlist deleted successfully'
    });
  } catch (error) {
    logger.error(`Controller error deleting wishlist: ${error.message}`);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Toggle agent in wishlist
 */
exports.toggleWishlistItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { wishlistId, agentId } = req.params;
    
    if (!wishlistId) {
      return res.status(400).json({ error: 'Wishlist ID is required' });
    }
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    // First, get the wishlist to check if the agent is already in it
    const wishlist = await wishlistService.getWishlistById(wishlistId, userId);
    
    let result;
    const existingItem = wishlist.items.find(item => item.agentId === agentId);
    
    if (existingItem) {
      // Remove if already in wishlist
      result = await wishlistService.removeFromWishlist(wishlistId, userId, agentId);
    } else {
      // Add if not in wishlist
      result = await wishlistService.addToWishlist(wishlistId, userId, agentId);
    }
    
    return res.json({ 
      success: true,
      wishlist: result,
      status: existingItem ? 'removed' : 'added'
    });
  } catch (error) {
    logger.error(`Controller error toggling wishlist item: ${error.message}`);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('Not authorized') || error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Check if agent is in user's wishlist
 */
exports.checkWishlistItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    const result = await wishlistService.isAgentInWishlists(userId, agentId);
    
    return res.json({ 
      success: true,
      ...result
    });
  } catch (error) {
    logger.error(`Controller error checking wishlist item: ${error.message}`);
    
    return res.status(500).json({
      error: error.message
    });
  }
}; 