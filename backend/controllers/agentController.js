/**
 * Agent Controller
 * 
 * Handles HTTP requests related to agents, using the service layer
 */

const agentService = require('../services/agent/agentService');
const priceService = require('../services/price/priceService'); // Assuming this exists or will be implemented
const logger = require('../utils/logger');

/**
 * Get all agents with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAgents = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'newest', 
      category,
      minPrice,
      maxPrice,
      search,
      featured 
    } = req.query;
    
    const options = {
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      sort,
      filters: {}
    };
    
    if (category) options.filters.category = category;
    if (minPrice) options.filters.minPrice = parseFloat(minPrice);
    if (maxPrice) options.filters.maxPrice = parseFloat(maxPrice);
    if (featured === 'true') options.filters.featured = true;
    
    let result;
    
    if (search) {
      result = await agentService.searchAgents(search, options);
    } else {
      result = await agentService.getAllAgents(options);
    }
    
    return res.json({ 
      success: true,
      ...result
    });
  } catch (error) {
    logger.error(`Controller error getting agents: ${error.message}`);
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Get agent by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAgentById = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    const agent = await agentService.getAgentById(agentId);
    
    // Get current price
    const price = await priceService.getCurrentPrice(agentId);
    
    return res.json({ 
      success: true,
      agent: {
        ...agent,
        currentPrice: price
      }
    });
  } catch (error) {
    logger.error(`Controller error getting agent by ID: ${error.message}`);
    
    return res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message
    });
  }
};

/**
 * Get similar agents
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSimilarAgents = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 4 } = req.query;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    const similarAgents = await agentService.getSimilarAgents(agentId, parseInt(limit, 10));
    
    return res.json({ 
      success: true,
      agents: similarAgents
    });
  } catch (error) {
    logger.error(`Controller error getting similar agents: ${error.message}`);
    
    return res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message
    });
  }
};

/**
 * Get featured agents
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getFeaturedAgents = async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const featuredAgents = await agentService.getFeaturedAgents(parseInt(limit, 10));
    
    return res.json({ 
      success: true,
      agents: featuredAgents
    });
  } catch (error) {
    logger.error(`Controller error getting featured agents: ${error.message}`);
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Get agents by category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAgentsByCategory = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const agentsByCategory = await agentService.getAgentsByCategory(parseInt(limit, 10));
    
    return res.json({ 
      success: true,
      categories: agentsByCategory
    });
  } catch (error) {
    logger.error(`Controller error getting agents by category: ${error.message}`);
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Get top rated agents
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTopRatedAgents = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const topAgents = await agentService.getTopRatedAgents(parseInt(limit, 10));
    
    return res.json({ 
      success: true,
      agents: topAgents
    });
  } catch (error) {
    logger.error(`Controller error getting top rated agents: ${error.message}`);
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Get newest agents
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getNewestAgents = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const newestAgents = await agentService.getNewestAgents(parseInt(limit, 10));
    
    return res.json({ 
      success: true,
      agents: newestAgents
    });
  } catch (error) {
    logger.error(`Controller error getting newest agents: ${error.message}`);
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Get agents by creator ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAgentsByCreator = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    if (!creatorId) {
      return res.status(400).json({ error: 'Creator ID is required' });
    }
    
    const options = {
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10)
    };
    
    const result = await agentService.getAgentsByCreator(creatorId, options);
    
    return res.json({ 
      success: true,
      ...result
    });
  } catch (error) {
    logger.error(`Controller error getting agents by creator: ${error.message}`);
    
    return res.status(500).json({
      error: error.message
    });
  }
};

/**
 * Increment download count for an agent
 */
exports.incrementDownloadCount = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Validate agent ID
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    // Get agent reference
    const agentRef = db.collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();
    
    // Check if agent exists
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Increment download count using atomic operation
    await agentRef.update({
      downloadCount: admin.firestore.FieldValue.increment(1),
      // Also update the statistics object if it exists
      'statistics.downloads': admin.firestore.FieldValue.increment(1)
    });
    
    // Get updated agent data
    const updatedAgentDoc = await agentRef.get();
    const updatedAgentData = updatedAgentDoc.data();
    
    // Return success response with updated count
    return res.json({ 
      success: true, 
      downloadCount: updatedAgentData.downloadCount || 0,
      message: 'Download count incremented successfully'
    });
  } catch (error) {
    console.error('Error incrementing download count:', error);
    return res.status(500).json({ error: 'Failed to increment download count' });
  }
};

/**
 * Get download count for an agent
 */
exports.getDownloadCount = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Validate agent ID
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    // Get agent document
    const agentDoc = await db.collection('agents').doc(agentId).get();
    
    // Check if agent exists
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const agentData = agentDoc.data();
    
    // Return download count (check both possible locations)
    const downloadCount = agentData.downloadCount || agentData.statistics?.downloads || 0;
    
    return res.json({ downloadCount });
  } catch (error) {
    console.error('Error getting download count:', error);
    return res.status(500).json({ error: 'Failed to get download count' });
  }
}; 