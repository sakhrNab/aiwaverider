/**
 * @fileoverview Service for managing agent pricing and related business logic
 */

const priceRepository = require('../../repositories/priceRepository');
const agentService = require('../agent/agentService');
const logger = require('../../utils/logger');
const AppError = require('../../utils/appError');

/**
 * Get price by agent ID
 * @param {string} agentId - ID of the agent
 * @returns {Promise<Object|null>} Price data or null if not found
 * @throws {AppError} If the agent ID is missing or an error occurs
 */
const getPriceByAgentId = async (agentId) => {
  if (!agentId) {
    logger.error('Missing required agent ID when getting price');
    throw new AppError(400, 'Agent ID is required');
  }

  try {
    // First check if the agent exists
    const agent = await agentService.getAgentById(agentId);
    if (!agent) {
      logger.error(`Agent not found for ID: ${agentId}`);
      throw new AppError(404, 'Agent not found');
    }

    const price = await priceRepository.getPriceByAgentId(agentId);
    return price;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Error in price service - getPriceByAgentId: ${error.message}`);
    throw new AppError(500, 'Failed to get price information');
  }
};

/**
 * Get prices for multiple agent IDs
 * @param {string[]} agentIds - Array of agent IDs
 * @returns {Promise<Array>} Array of price objects
 * @throws {AppError} If the input is invalid or an error occurs
 */
const getPricesByAgentIds = async (agentIds) => {
  if (!agentIds || !Array.isArray(agentIds)) {
    logger.error('Invalid agent IDs provided when getting prices');
    throw new AppError(400, 'Valid array of agent IDs is required');
  }

  try {
    const prices = await priceRepository.getPricesByAgentIds(agentIds);
    return prices;
  } catch (error) {
    logger.error(`Error in price service - getPricesByAgentIds: ${error.message}`);
    throw new AppError(500, 'Failed to get prices for agents');
  }
};

/**
 * Create or update a price for an agent
 * @param {string} agentId - ID of the agent
 * @param {Object} priceData - Price data to save
 * @returns {Promise<Object>} Saved price data
 * @throws {AppError} If input validation fails or an error occurs
 */
const createOrUpdatePrice = async (agentId, priceData) => {
  if (!agentId) {
    logger.error('Missing agent ID when creating/updating price');
    throw new AppError(400, 'Agent ID is required');
  }

  if (!priceData) {
    logger.error('Missing price data when creating/updating price');
    throw new AppError(400, 'Price data is required');
  }

  // Validate required price fields
  if (!priceData.amount) {
    logger.error('Missing amount in price data');
    throw new AppError(400, 'Price amount is required');
  }

  if (!priceData.currency) {
    logger.error('Missing currency in price data');
    throw new AppError(400, 'Price currency is required');
  }

  try {
    // First check if the agent exists
    const agent = await agentService.getAgentById(agentId);
    if (!agent) {
      logger.error(`Agent not found for ID: ${agentId}`);
      throw new AppError(404, 'Agent not found');
    }

    // Clean and prepare the price data
    const cleanedPriceData = {
      amount: parseFloat(priceData.amount),
      currency: priceData.currency.toUpperCase(),
      saleAmount: priceData.saleAmount ? parseFloat(priceData.saleAmount) : null,
      isOnSale: !!priceData.isOnSale,
    };

    const savedPrice = await priceRepository.createOrUpdatePrice(agentId, cleanedPriceData);
    return savedPrice;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Error in price service - createOrUpdatePrice: ${error.message}`);
    throw new AppError(500, 'Failed to save price information');
  }
};

/**
 * Delete a price for an agent
 * @param {string} agentId - ID of the agent
 * @returns {Promise<boolean>} True if deleted, false if not found
 * @throws {AppError} If agent ID is missing or an error occurs
 */
const deletePrice = async (agentId) => {
  if (!agentId) {
    logger.error('Missing agent ID when deleting price');
    throw new AppError(400, 'Agent ID is required');
  }

  try {
    const result = await priceRepository.deletePrice(agentId);
    return result;
  } catch (error) {
    logger.error(`Error in price service - deletePrice: ${error.message}`);
    throw new AppError(500, 'Failed to delete price information');
  }
};

/**
 * Get all prices with pagination
 * @param {number} limit - Number of results to return (default: 100)
 * @param {string} startAfter - ID to start after for pagination
 * @returns {Promise<Array>} Array of price objects
 * @throws {AppError} If an error occurs
 */
const getAllPrices = async (limit = 100, startAfter = null) => {
  try {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      logger.error(`Invalid limit value provided: ${limit}`);
      throw new AppError(400, 'Limit must be a positive number');
    }
    
    const prices = await priceRepository.getAllPrices(parsedLimit, startAfter);
    return prices;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Error in price service - getAllPrices: ${error.message}`);
    throw new AppError(500, 'Failed to get price information');
  }
};

/**
 * Get prices by currency
 * @param {string} currency - Currency code (e.g., USD, EUR)
 * @param {number} limit - Number of results to return (default: 100)
 * @returns {Promise<Array>} Array of price objects
 * @throws {AppError} If currency is missing or an error occurs
 */
const getPricesByCurrency = async (currency, limit = 100) => {
  if (!currency) {
    logger.error('Missing currency when getting prices by currency');
    throw new AppError(400, 'Currency is required');
  }

  try {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      logger.error(`Invalid limit value provided: ${limit}`);
      throw new AppError(400, 'Limit must be a positive number');
    }
    
    const prices = await priceRepository.getPricesByCurrency(currency.toUpperCase(), parsedLimit);
    return prices;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Error in price service - getPricesByCurrency: ${error.message}`);
    throw new AppError(500, 'Failed to get prices by currency');
  }
};

/**
 * Get prices in a specific range
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price
 * @param {string} currency - Currency code (e.g., USD, EUR)
 * @param {number} limit - Number of results to return (default: 100)
 * @returns {Promise<Array>} Array of price objects
 * @throws {AppError} If parameters are invalid or an error occurs
 */
const getPricesInRange = async (minPrice, maxPrice, currency = 'USD', limit = 100) => {
  // Validate input parameters
  const min = parseFloat(minPrice);
  const max = parseFloat(maxPrice);
  
  if (isNaN(min) || isNaN(max)) {
    logger.error(`Invalid price range values: min=${minPrice}, max=${maxPrice}`);
    throw new AppError(400, 'Valid min and max price values are required');
  }
  
  if (min > max) {
    logger.error(`Min price (${min}) is greater than max price (${max})`);
    throw new AppError(400, 'Minimum price cannot be greater than maximum price');
  }

  if (!currency) {
    logger.error('Missing currency when getting prices in range');
    throw new AppError(400, 'Currency is required');
  }

  try {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      logger.error(`Invalid limit value provided: ${limit}`);
      throw new AppError(400, 'Limit must be a positive number');
    }
    
    const prices = await priceRepository.getPricesInRange(
      min, 
      max, 
      currency.toUpperCase(),
      parsedLimit
    );
    return prices;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Error in price service - getPricesInRange: ${error.message}`);
    throw new AppError(500, 'Failed to get prices in range');
  }
};

/**
 * Get all prices for agents on sale
 * @param {number} limit - Number of results to return (default: 50)
 * @returns {Promise<Array>} Array of price objects for agents on sale
 * @throws {AppError} If an error occurs
 */
const getOnSalePrices = async (limit = 50) => {
  try {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      logger.error(`Invalid limit value provided: ${limit}`);
      throw new AppError(400, 'Limit must be a positive number');
    }
    
    // Get all prices (up to the limit)
    const allPrices = await priceRepository.getAllPrices(parsedLimit * 2); // Get more to filter
    
    // Filter for those on sale
    const onSalePrices = allPrices.filter(price => price.isOnSale === true);
    
    // Return only up to the limit
    return onSalePrices.slice(0, parsedLimit);
  } catch (error) {
    logger.error(`Error in price service - getOnSalePrices: ${error.message}`);
    throw new AppError(500, 'Failed to get sale prices');
  }
};

module.exports = {
  getPriceByAgentId,
  getPricesByAgentIds,
  createOrUpdatePrice,
  deletePrice,
  getAllPrices,
  getPricesByCurrency,
  getPricesInRange,
  getOnSalePrices
}; 