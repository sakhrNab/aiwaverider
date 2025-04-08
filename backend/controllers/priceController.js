/**
 * @fileoverview Controller for handling price-related HTTP requests
 */

const priceService = require('../services/price/priceService');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

/**
 * Get price by agent ID
 * @route GET /api/prices/agent/:agentId
 * @access Public
 */
const getPriceByAgentId = asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  
  logger.info(`Fetching price for agent: ${agentId}`);
  const price = await priceService.getPriceByAgentId(agentId);
  
  return res.status(200).json({ 
    success: true, 
    data: price 
  });
});

/**
 * Get prices for multiple agents
 * @route POST /api/prices/agents
 * @access Public
 */
const getPricesByAgentIds = asyncHandler(async (req, res) => {
  const { agentIds } = req.body;
  
  if (!agentIds || !Array.isArray(agentIds)) {
    throw new AppError(400, 'Valid array of agent IDs is required');
  }
  
  logger.info(`Fetching prices for ${agentIds.length} agents`);
  const prices = await priceService.getPricesByAgentIds(agentIds);
  
  return res.status(200).json({ 
    success: true, 
    data: prices 
  });
});

/**
 * Create or update price
 * @route PUT /api/prices/agent/:agentId
 * @access Admin
 */
const createOrUpdatePrice = asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const priceData = req.body;
  
  logger.info(`Creating/updating price for agent: ${agentId}`);
  const price = await priceService.createOrUpdatePrice(agentId, priceData);
  
  return res.status(200).json({ 
    success: true, 
    data: price,
    message: 'Price updated successfully'
  });
});

/**
 * Delete price
 * @route DELETE /api/prices/agent/:agentId
 * @access Admin
 */
const deletePrice = asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  
  logger.info(`Deleting price for agent: ${agentId}`);
  await priceService.deletePrice(agentId);
  
  return res.status(200).json({ 
    success: true, 
    message: 'Price deleted successfully' 
  });
});

/**
 * Get all prices with pagination
 * @route GET /api/prices
 * @access Public
 */
const getAllPrices = asyncHandler(async (req, res) => {
  const limit = req.query.limit || 100;
  const startAfter = req.query.startAfter || null;
  
  logger.info(`Fetching all prices with limit: ${limit}`);
  const prices = await priceService.getAllPrices(limit, startAfter);
  
  return res.status(200).json({ 
    success: true, 
    count: prices.length,
    data: prices 
  });
});

/**
 * Get prices by currency
 * @route GET /api/prices/currency/:currency
 * @access Public
 */
const getPricesByCurrency = asyncHandler(async (req, res) => {
  const { currency } = req.params;
  const limit = req.query.limit || 100;
  
  logger.info(`Fetching prices for currency: ${currency}`);
  const prices = await priceService.getPricesByCurrency(currency, limit);
  
  return res.status(200).json({ 
    success: true, 
    count: prices.length,
    data: prices 
  });
});

/**
 * Get prices in range
 * @route GET /api/prices/range
 * @access Public
 */
const getPricesInRange = asyncHandler(async (req, res) => {
  const { minPrice, maxPrice, currency = 'USD' } = req.query;
  const limit = req.query.limit || 100;
  
  if (!minPrice || !maxPrice) {
    throw new AppError(400, 'Min and max price are required');
  }
  
  logger.info(`Fetching prices in range: ${minPrice}-${maxPrice} ${currency}`);
  const prices = await priceService.getPricesInRange(minPrice, maxPrice, currency, limit);
  
  return res.status(200).json({ 
    success: true, 
    count: prices.length,
    data: prices 
  });
});

/**
 * Get all prices for agents on sale
 * @route GET /api/prices/sale
 * @access Public
 */
const getOnSalePrices = asyncHandler(async (req, res) => {
  const limit = req.query.limit || 50;
  
  logger.info(`Fetching prices for agents on sale`);
  const prices = await priceService.getOnSalePrices(limit);
  
  return res.status(200).json({ 
    success: true, 
    count: prices.length,
    data: prices 
  });
});

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