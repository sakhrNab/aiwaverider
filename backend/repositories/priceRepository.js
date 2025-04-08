/**
 * @fileoverview Repository for managing agent price data in the database
 */

const { db } = require('../config/firebase');
const logger = require('../utils/logger');

const COLLECTION_NAME = 'agent-prices';
const AGENT_COLLECTION = 'agents';

/**
 * Get a price by agent ID
 * @param {string} agentId - ID of the agent
 * @returns {Promise<Object|null>} Price data or null if not found
 */
const getPriceByAgentId = async (agentId) => {
  if (!agentId) {
    throw new Error('Agent ID is required');
  }

  try {
    const docRef = db.collection(COLLECTION_NAME).doc(agentId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error(`Error getting price for agent ${agentId}: ${error.message}`);
    throw error;
  }
};

/**
 * Get prices for multiple agent IDs
 * @param {string[]} agentIds - Array of agent IDs
 * @returns {Promise<Array>} Array of price objects
 */
const getPricesByAgentIds = async (agentIds) => {
  if (!agentIds || agentIds.length === 0) {
    return [];
  }

  try {
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('agentId', 'in', agentIds)
      .get();

    const prices = [];
    snapshot.forEach(doc => {
      prices.push({ id: doc.id, ...doc.data() });
    });

    return prices;
  } catch (error) {
    logger.error('Error getting prices for multiple agents: ' + error.message);
    throw error;
  }
};

/**
 * Create or update a price for an agent
 * @param {string} agentId - ID of the agent
 * @param {Object} priceData - Price data to save
 * @returns {Promise<Object>} Saved price data
 */
const createOrUpdatePrice = async (agentId, priceData) => {
  if (!agentId) {
    throw new Error('Agent ID is required');
  }

  if (!priceData) {
    throw new Error('Price data is required');
  }

  try {
    // First verify that the agent exists
    const agentRef = db.collection(AGENT_COLLECTION).doc(agentId);
    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    const docRef = db.collection(COLLECTION_NAME).doc(agentId);
    const doc = await docRef.get();
    
    const now = new Date();
    let saveData = {
      ...priceData,
      agentId,
      updatedAt: now
    };
    
    // If document doesn't exist, add createdAt
    if (!doc.exists) {
      saveData.createdAt = now;
    }
    
    await docRef.set(saveData, { merge: true });
    
    return { id: agentId, ...saveData };
  } catch (error) {
    logger.error(`Error creating/updating price for agent ${agentId}: ${error.message}`);
    throw error;
  }
};

/**
 * Delete a price
 * @param {string} agentId - ID of the agent
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
const deletePrice = async (agentId) => {
  if (!agentId) {
    throw new Error('Agent ID is required');
  }

  try {
    const docRef = db.collection(COLLECTION_NAME).doc(agentId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return false;
    }
    
    await docRef.delete();
    return true;
  } catch (error) {
    logger.error(`Error deleting price for agent ${agentId}: ${error.message}`);
    throw error;
  }
};

/**
 * Get all prices with pagination
 * @param {number} limit - Number of results to return (default: 100)
 * @param {string} startAfter - ID to start after for pagination
 * @returns {Promise<Array>} Array of price objects
 */
const getAllPrices = async (limit = 100, startAfter = null) => {
  try {
    let query = db.collection(COLLECTION_NAME)
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    if (startAfter) {
      const startAfterDoc = await db.collection(COLLECTION_NAME).doc(startAfter).get();
      query = query.startAfter(startAfterDoc);
    }
    
    const snapshot = await query.get();
    
    const prices = [];
    snapshot.forEach(doc => {
      prices.push({ id: doc.id, ...doc.data() });
    });
    
    return prices;
  } catch (error) {
    logger.error('Error getting all prices: ' + error.message);
    throw error;
  }
};

/**
 * Get prices by currency
 * @param {string} currency - Currency code (e.g., USD, EUR)
 * @param {number} limit - Number of results to return (default: 100)
 * @returns {Promise<Array>} Array of price objects with the specified currency
 */
const getPricesByCurrency = async (currency, limit = 100) => {
  if (!currency) {
    throw new Error('Currency is required');
  }

  try {
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('currency', '==', currency)
      .limit(limit)
      .get();
    
    const prices = [];
    snapshot.forEach(doc => {
      prices.push({ id: doc.id, ...doc.data() });
    });
    
    return prices;
  } catch (error) {
    logger.error(`Error getting prices for currency ${currency}: ${error.message}`);
    throw error;
  }
};

/**
 * Get prices in a specific range
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price
 * @param {string} currency - Currency code (e.g., USD, EUR)
 * @param {number} limit - Number of results to return (default: 100)
 * @returns {Promise<Array>} Array of price objects within the specified range
 */
const getPricesInRange = async (minPrice, maxPrice, currency = 'USD', limit = 100) => {
  if (minPrice === undefined || maxPrice === undefined) {
    throw new Error('Min and max price are required');
  }

  try {
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('currency', '==', currency)
      .where('amount', '>=', minPrice)
      .where('amount', '<=', maxPrice)
      .limit(limit)
      .get();
    
    const prices = [];
    snapshot.forEach(doc => {
      prices.push({ id: doc.id, ...doc.data() });
    });
    
    return prices;
  } catch (error) {
    logger.error(`Error getting prices in range ${minPrice}-${maxPrice} ${currency}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getPriceByAgentId,
  getPricesByAgentIds,
  createOrUpdatePrice,
  deletePrice,
  getAllPrices,
  getPricesByCurrency,
  getPricesInRange
}; 