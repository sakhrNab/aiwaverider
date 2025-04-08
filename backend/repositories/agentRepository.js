/**
 * Agent Repository
 * 
 * Abstracts database operations for agents
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Initialize Firestore
const db = admin.firestore();

class AgentRepository {
  /**
   * Get agent by ID
   * @param {string} agentId - The agent ID
   * @returns {Promise<Object>} - The agent
   */
  async getAgentById(agentId) {
    try {
      const agentDoc = await db.collection('agents').doc(agentId).get();
      
      if (!agentDoc.exists) {
        return null;
      }
      
      return {
        id: agentDoc.id,
        ...agentDoc.data()
      };
    } catch (error) {
      logger.error(`Repository error getting agent by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find agent by ID (alias for getAgentById for service compatibility)
   * @param {string} agentId - The agent ID
   * @returns {Promise<Object>} - The agent
   */
  async findById(agentId) {
    return this.getAgentById(agentId);
  }

  /**
   * Get all agents
   * @returns {Promise<Array>} - Array of agents
   */
  async getAllAgents() {
    try {
      const agentsSnapshot = await db.collection('agents').get();
      
      return agentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error(`Repository error getting all agents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find all agents with pagination and filtering
   * @param {Object} options - Options for pagination and filtering
   * @returns {Promise<Object>} - Paginated results of agents
   */
  async findAll(options = {}) {
    try {
      const { page = 1, limit = 10, category, sortBy, sortOrder = 'desc' } = options;
      const offset = (page - 1) * limit;
      
      let query = db.collection('agents');
      
      // Apply category filter if provided
      if (category) {
        query = query.where('category', '==', category);
      }
      
      // Apply sorting if provided
      if (sortBy) {
        query = query.orderBy(sortBy, sortOrder);
      }
      
      // Get total count for pagination
      const countSnapshot = await query.count().get();
      const totalItems = countSnapshot.data().count;
      
      // Get paginated results
      const snapshot = await query.limit(limit).offset(offset).get();
      
      const agents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        agents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems,
          totalPages: Math.ceil(totalItems / limit)
        }
      };
    } catch (error) {
      logger.error(`Repository error finding all agents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find agents by multiple IDs
   * @param {Array<string>} agentIds - Array of agent IDs
   * @returns {Promise<Array<Object>>} - Array of agent objects
   */
  async findByIds(agentIds) {
    try {
      const agents = [];
      
      // Firebase doesn't support a direct "in" query for document IDs
      // So we need to fetch each document individually
      for (const agentId of agentIds) {
        const agent = await this.getAgentById(agentId);
        if (agent) {
          agents.push(agent);
        }
      }
      
      return agents;
    } catch (error) {
      logger.error(`Repository error finding agents by IDs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for agents by name, category, or description
   * @param {string} query - The search query
   * @param {Object} options - Additional options for pagination and filtering
   * @returns {Promise<Object>} - Paginated search results
   */
  async search(query, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;
      
      // Get all agents since Firestore doesn't support text search directly
      const snapshot = await db.collection('agents').get();
      
      // Filter locally based on search query
      const allAgents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const lowercaseQuery = query.toLowerCase();
      
      const matchedAgents = allAgents.filter(agent => {
        const nameMatch = agent.name && agent.name.toLowerCase().includes(lowercaseQuery);
        const categoryMatch = agent.category && agent.category.toLowerCase().includes(lowercaseQuery);
        const descriptionMatch = agent.description && agent.description.toLowerCase().includes(lowercaseQuery);
        
        return nameMatch || categoryMatch || descriptionMatch;
      });
      
      // Apply pagination
      const paginatedAgents = matchedAgents.slice(offset, offset + limit);
      
      return {
        agents: paginatedAgents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: matchedAgents.length,
          totalPages: Math.ceil(matchedAgents.length / limit)
        }
      };
    } catch (error) {
      logger.error(`Repository error searching agents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find featured agents
   * @param {number} limit - Number of featured agents to retrieve
   * @returns {Promise<Array<Object>>} - Array of featured agent objects
   */
  async findFeatured(limit = 6) {
    try {
      const snapshot = await db.collection('agents')
        .where('featured', '==', true)
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error(`Repository error finding featured agents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find agents by category
   * @param {number} limit - Maximum number of agents per category
   * @returns {Promise<Object>} - Object with categories as keys and arrays of agents as values
   */
  async findByCategory(limit = 5) {
    try {
      // Get all agents
      const snapshot = await db.collection('agents').get();
      
      const allAgents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Group agents by category
      const agentsByCategory = {};
      
      allAgents.forEach(agent => {
        if (agent.category) {
          if (!agentsByCategory[agent.category]) {
            agentsByCategory[agent.category] = [];
          }
          
          if (agentsByCategory[agent.category].length < limit) {
            agentsByCategory[agent.category].push(agent);
          }
        }
      });
      
      return agentsByCategory;
    } catch (error) {
      logger.error(`Repository error finding agents by category: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find agents similar to a specific agent
   * @param {Object} agent - The reference agent
   * @param {number} limit - Maximum number of similar agents to retrieve
   * @returns {Promise<Array<Object>>} - Array of similar agent objects
   */
  async findSimilar(agent, limit = 4) {
    try {
      // Find agents in the same category
      const snapshot = await db.collection('agents')
        .where('category', '==', agent.category)
        .where('id', '!=', agent.id)
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error(`Repository error finding similar agents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find top rated agents
   * @param {number} limit - Maximum number of top rated agents to retrieve
   * @returns {Promise<Array<Object>>} - Array of top rated agent objects
   */
  async findTopRated(limit = 10) {
    try {
      const snapshot = await db.collection('agents')
        .orderBy('rating', 'desc')
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error(`Repository error finding top rated agents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find newest agents
   * @param {number} limit - Maximum number of newest agents to retrieve
   * @returns {Promise<Array<Object>>} - Array of newest agent objects
   */
  async findNewest(limit = 10) {
    try {
      const snapshot = await db.collection('agents')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error(`Repository error finding newest agents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find agents by creator
   * @param {string} creatorId - The creator ID
   * @param {Object} options - Options for pagination
   * @returns {Promise<Object>} - Paginated results of agents by the creator
   */
  async findByCreator(creatorId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;
      
      // Count total matching documents
      const countSnapshot = await db.collection('agents')
        .where('creatorId', '==', creatorId)
        .count()
        .get();
      
      const totalItems = countSnapshot.data().count;
      
      // Get paginated results
      const snapshot = await db.collection('agents')
        .where('creatorId', '==', creatorId)
        .limit(limit)
        .offset(offset)
        .get();
      
      const agents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        agents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems,
          totalPages: Math.ceil(totalItems / limit)
        }
      };
    } catch (error) {
      logger.error(`Repository error finding agents by creator: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new agent
   * @param {string} agentId - The agent ID
   * @param {Object} agentData - The agent data
   * @returns {Promise<Object>} - The created agent
   */
  async createAgent(agentId, agentData) {
    try {
      await db.collection('agents').doc(agentId).set({
        ...agentData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      return {
        id: agentId,
        ...agentData
      };
    } catch (error) {
      logger.error(`Repository error creating agent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an agent
   * @param {string} agentId - The agent ID
   * @param {Object} updateData - The data to update
   * @returns {Promise<void>}
   */
  async updateAgent(agentId, updateData) {
    try {
      await db.collection('agents').doc(agentId).update({
        ...updateData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Repository error updating agent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an agent
   * @param {string} agentId - The agent ID
   * @returns {Promise<void>}
   */
  async deleteAgent(agentId) {
    try {
      await db.collection('agents').doc(agentId).delete();
    } catch (error) {
      logger.error(`Repository error deleting agent: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new AgentRepository();