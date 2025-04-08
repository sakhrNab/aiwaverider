/**
 * Agent Service
 * 
 * Handles business logic for agent management operations.
 */

const agentRepository = require('../../repositories/agentRepository');
const logger = require('../../utils/logger');

class AgentService {
  /**
   * Get all agents with pagination and filtering
   * @param {Object} options - Options for pagination and filtering
   * @returns {Promise<Object>} - Paginated results of agents
   */
  static async getAllAgents(options = {}) {
    try {
      return await agentRepository.findAll(options);
    } catch (error) {
      logger.error(`Error getting all agents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific agent by ID
   * @param {string} agentId - The agent ID
   * @returns {Promise<Object>} - The agent object
   * @throws {Error} - If agent not found
   */
  static async getAgentById(agentId) {
    try {
      const agent = await agentRepository.findById(agentId);
      
      if (!agent) {
        throw new Error('Agent not found');
      }
      
      return agent;
    } catch (error) {
      logger.error(`Error getting agent by ID: ${error.message}`, { agentId });
      throw error;
    }
  }

  /**
   * Get multiple agents by their IDs
   * @param {Array<string>} agentIds - Array of agent IDs
   * @returns {Promise<Array<Object>>} - Array of agent objects
   */
  static async getAgentsByIds(agentIds) {
    try {
      return await agentRepository.findByIds(agentIds);
    } catch (error) {
      logger.error(`Error getting agents by IDs: ${error.message}`, { agentIds });
      throw error;
    }
  }

  /**
   * Search for agents by name, category, or description
   * @param {string} query - The search query
   * @param {Object} options - Additional options for pagination and filtering
   * @returns {Promise<Object>} - Paginated search results
   */
  static async searchAgents(query, options = {}) {
    try {
      return await agentRepository.search(query, options);
    } catch (error) {
      logger.error(`Error searching agents: ${error.message}`, { query });
      throw error;
    }
  }

  /**
   * Get featured agents
   * @param {number} limit - Number of featured agents to retrieve
   * @returns {Promise<Array<Object>>} - Array of featured agent objects
   */
  static async getFeaturedAgents(limit = 6) {
    try {
      return await agentRepository.findFeatured(limit);
    } catch (error) {
      logger.error(`Error getting featured agents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get agents grouped by category
   * @param {number} limit - Maximum number of agents per category
   * @returns {Promise<Object>} - Object with categories as keys and arrays of agents as values
   */
  static async getAgentsByCategory(limit = 5) {
    try {
      return await agentRepository.findByCategory(limit);
    } catch (error) {
      logger.error(`Error getting agents by category: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get agents similar to a specific agent
   * @param {string} agentId - The reference agent ID
   * @param {number} limit - Maximum number of similar agents to retrieve
   * @returns {Promise<Array<Object>>} - Array of similar agent objects
   */
  static async getSimilarAgents(agentId, limit = 4) {
    try {
      const agent = await this.getAgentById(agentId);
      
      if (!agent) {
        throw new Error('Reference agent not found');
      }
      
      // Get agents in the same category
      return await agentRepository.findSimilar(agent, limit);
    } catch (error) {
      logger.error(`Error getting similar agents: ${error.message}`, { agentId });
      throw error;
    }
  }

  /**
   * Get the top rated agents
   * @param {number} limit - Maximum number of top rated agents to retrieve
   * @returns {Promise<Array<Object>>} - Array of top rated agent objects
   */
  static async getTopRatedAgents(limit = 10) {
    try {
      return await agentRepository.findTopRated(limit);
    } catch (error) {
      logger.error(`Error getting top rated agents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the newest agents
   * @param {number} limit - Maximum number of newest agents to retrieve
   * @returns {Promise<Array<Object>>} - Array of newest agent objects
   */
  static async getNewestAgents(limit = 10) {
    try {
      return await agentRepository.findNewest(limit);
    } catch (error) {
      logger.error(`Error getting newest agents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get agents by a specific creator
   * @param {string} creatorId - The creator ID
   * @param {Object} options - Options for pagination
   * @returns {Promise<Object>} - Paginated results of agents by the creator
   */
  static async getAgentsByCreator(creatorId, options = {}) {
    try {
      return await agentRepository.findByCreator(creatorId, options);
    } catch (error) {
      logger.error(`Error getting agents by creator: ${error.message}`, { creatorId });
      throw error;
    }
  }
}

module.exports = AgentService; 