const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { auth } = require('../middleware/auth');

// Collection reference
const COLLECTION_NAME = 'ai_tools';

/**
 * @route   GET /api/ai-tools
 * @desc    Get all AI tools
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all AI tools...');
    
    // Get tools with optional filtering
    const query = admin.firestore().collection(COLLECTION_NAME)
      .orderBy('createdAt', 'desc');
    
    // Execute query
    const snapshot = await query.get();
    
    // Map the documents
    const tools = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return res.json({
      success: true,
      count: tools.length,
      data: tools
    });
  } catch (error) {
    console.error('Error fetching AI tools:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching AI tools'
    });
  }
});

/**
 * @route   GET /api/ai-tools/:id
 * @desc    Get a single AI tool by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    // Get the document
    const doc = await admin.firestore().collection(COLLECTION_NAME).doc(id).get();
    
    // Check if the document exists
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'AI tool not found'
      });
    }
    
    return res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    console.error(`Error fetching AI tool ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching AI tool'
    });
  }
});

/**
 * @route   POST /api/ai-tools
 * @desc    Create a new AI tool
 * @access  Private (Admin only)
 */
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
    }
    
    const { title, description, link, image, keyword, tags } = req.body;
    
    // Validate required fields
    if (!title || !description || !link) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, and link are required fields'
      });
    }
    
    // Prepare the document
    const newTool = {
      title,
      description,
      link,
      image: image || '',
      keyword: keyword || '',
      tags: tags || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid
    };
    
    // Add the document
    const docRef = await admin.firestore().collection(COLLECTION_NAME).add(newTool);
    
    // Get the created document
    const createdDoc = await docRef.get();
    
    return res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        ...createdDoc.data()
      }
    });
  } catch (error) {
    console.error('Error creating AI tool:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while creating AI tool'
    });
  }
});

/**
 * @route   PUT /api/ai-tools/:id
 * @desc    Update an AI tool
 * @access  Private (Admin only)
 */
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
    }
    
    const id = req.params.id;
    const { title, description, link, image, keyword, tags } = req.body;
    
    // Check if the tool exists
    const toolRef = admin.firestore().collection(COLLECTION_NAME).doc(id);
    const doc = await toolRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'AI tool not found'
      });
    }
    
    // Prepare the update data
    const updateData = {
      ...(title && { title }),
      ...(description && { description }),
      ...(link && { link }),
      ...(image && { image }),
      ...(keyword && { keyword }),
      ...(tags && { tags }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid
    };
    
    // Update the document
    await toolRef.update(updateData);
    
    // Get the updated document
    const updatedDoc = await toolRef.get();
    
    return res.json({
      success: true,
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error(`Error updating AI tool ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Server error while updating AI tool'
    });
  }
});

/**
 * @route   DELETE /api/ai-tools/:id
 * @desc    Delete an AI tool
 * @access  Private (Admin only)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
    }
    
    const id = req.params.id;
    
    // Check if the tool exists
    const toolRef = admin.firestore().collection(COLLECTION_NAME).doc(id);
    const doc = await toolRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'AI tool not found'
      });
    }
    
    // Delete the document
    await toolRef.delete();
    
    return res.json({
      success: true,
      message: `AI tool ${id} has been deleted`
    });
  } catch (error) {
    console.error(`Error deleting AI tool ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Server error while deleting AI tool'
    });
  }
});

module.exports = router; 