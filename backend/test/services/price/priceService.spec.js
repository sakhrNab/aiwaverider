const { jest: jestConfig } = require('../../../jest.config');

// Mock the repository
const mockPriceRepository = {
  getPriceByAgentId: jest.fn(),
  getPricesByAgentIds: jest.fn(),
  createOrUpdatePrice: jest.fn(),
  deletePrice: jest.fn(),
  getAllPrices: jest.fn(),
  getPricesByCurrency: jest.fn(),
  getPricesInRange: jest.fn()
};

// Mock the agent service
const mockAgentService = {
  getAgentById: jest.fn()
};

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock AppError
class MockAppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Mock the dependencies
jest.mock('../../../repositories/priceRepository', () => mockPriceRepository);
jest.mock('../../../services/agent/agentService', () => mockAgentService);
jest.mock('../../../utils/logger', () => mockLogger);
jest.mock('../../../middleware/errorHandler', () => ({
  AppError: MockAppError
}));

// Import the service after mocking dependencies
const priceService = require('../../../services/price/priceService');

describe('Price Service', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPriceByAgentId', () => {
    it('should get a price by agent ID', async () => {
      // Setup mock data
      const agentId = 'agent-123';
      const mockPrice = {
        id: agentId,
        amount: 9.99,
        currency: 'USD',
        isFree: false
      };

      // Setup repository mock
      mockPriceRepository.getPriceByAgentId.mockResolvedValue(mockPrice);

      // Execute
      const result = await priceService.getPriceByAgentId(agentId);

      // Verify
      expect(mockPriceRepository.getPriceByAgentId).toHaveBeenCalledWith(agentId);
      expect(result).toEqual(mockPrice);
    });

    it('should throw an error if agent ID is not provided', async () => {
      await expect(priceService.getPriceByAgentId()).rejects.toThrow('Agent ID is required');
    });

    it('should throw an error if price is not found', async () => {
      const agentId = 'nonexistent';
      mockPriceRepository.getPriceByAgentId.mockResolvedValue(null);

      await expect(priceService.getPriceByAgentId(agentId)).rejects.toThrow('Price not found');
    });

    it('should handle repository errors', async () => {
      const agentId = 'agent-123';
      const error = new Error('Database error');
      mockPriceRepository.getPriceByAgentId.mockRejectedValue(error);

      await expect(priceService.getPriceByAgentId(agentId)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getPriceByAgentIdOrDefault', () => {
    it('should get price if it exists', async () => {
      // Setup mock data
      const agentId = 'agent-123';
      const mockPrice = {
        id: agentId,
        amount: 9.99,
        currency: 'USD',
        isFree: false
      };

      // Setup repository mock
      mockPriceRepository.getPriceByAgentId.mockResolvedValue(mockPrice);

      // Execute
      const result = await priceService.getPriceByAgentIdOrDefault(agentId);

      // Verify
      expect(mockPriceRepository.getPriceByAgentId).toHaveBeenCalledWith(agentId);
      expect(result).toEqual(mockPrice);
    });

    it('should return default price if price is not found', async () => {
      // Setup
      const agentId = 'agent-123';
      mockPriceRepository.getPriceByAgentId.mockResolvedValue(null);

      // Execute
      const result = await priceService.getPriceByAgentIdOrDefault(agentId);

      // Verify
      expect(mockPriceRepository.getPriceByAgentId).toHaveBeenCalledWith(agentId);
      expect(result).toEqual({
        agentId,
        amount: 0,
        currency: 'USD',
        isFree: true,
        features: [],
        isDefault: true
      });
    });

    it('should throw an error if agent ID is not provided', async () => {
      await expect(priceService.getPriceByAgentIdOrDefault()).rejects.toThrow('Agent ID is required');
    });
  });

  describe('getPricesByAgentIds', () => {
    it('should get prices for multiple agents', async () => {
      // Setup
      const agentIds = ['agent-1', 'agent-2', 'agent-3'];
      const mockPrices = [
        { id: 'agent-1', amount: 9.99, currency: 'USD' },
        { id: 'agent-2', amount: 19.99, currency: 'USD' },
        { id: 'agent-3', amount: 0, currency: 'USD', isFree: true }
      ];

      mockPriceRepository.getPricesByAgentIds.mockResolvedValue(mockPrices);

      // Execute
      const result = await priceService.getPricesByAgentIds(agentIds);

      // Verify
      expect(mockPriceRepository.getPricesByAgentIds).toHaveBeenCalledWith(agentIds);
      expect(result).toEqual(mockPrices);
    });

    it('should throw an error if agent IDs are not provided', async () => {
      await expect(priceService.getPricesByAgentIds()).rejects.toThrow('Agent IDs must be an array');
      await expect(priceService.getPricesByAgentIds('not-an-array')).rejects.toThrow('Agent IDs must be an array');
    });
  });

  describe('createOrUpdatePrice', () => {
    it('should create or update a price', async () => {
      // Setup
      const agentId = 'agent-123';
      const priceData = {
        amount: 29.99,
        currency: 'USD',
        features: ['feature1', 'feature2']
      };
      const createdPrice = {
        id: agentId,
        agentId,
        amount: 29.99,
        currency: 'USD',
        features: ['feature1', 'feature2'],
        isFree: false,
        updatedAt: expect.any(Date)
      };

      mockAgentService.getAgentById.mockResolvedValue({ id: agentId, name: 'Test Agent' });
      mockPriceRepository.createOrUpdatePrice.mockResolvedValue(createdPrice);

      // Execute
      const result = await priceService.createOrUpdatePrice(agentId, priceData);

      // Verify
      expect(mockAgentService.getAgentById).toHaveBeenCalledWith(agentId);
      expect(mockPriceRepository.createOrUpdatePrice).toHaveBeenCalledWith(agentId, {
        ...priceData,
        isFree: false
      });
      expect(result).toEqual(createdPrice);
    });

    it('should set isFree to true if amount is 0', async () => {
      // Setup
      const agentId = 'agent-123';
      const priceData = {
        amount: 0,
        currency: 'USD'
      };

      mockAgentService.getAgentById.mockResolvedValue({ id: agentId, name: 'Test Agent' });
      mockPriceRepository.createOrUpdatePrice.mockResolvedValue({
        ...priceData,
        id: agentId,
        agentId,
        isFree: true
      });

      // Execute
      await priceService.createOrUpdatePrice(agentId, priceData);

      // Verify
      expect(mockPriceRepository.createOrUpdatePrice).toHaveBeenCalledWith(agentId, {
        ...priceData,
        isFree: true
      });
    });

    it('should throw an error if agent ID is not provided', async () => {
      await expect(priceService.createOrUpdatePrice(null, { amount: 10, currency: 'USD' })).rejects.toThrow('Agent ID is required');
    });

    it('should throw an error if price data is not provided', async () => {
      await expect(priceService.createOrUpdatePrice('agent-123', null)).rejects.toThrow('Price data is required');
    });

    it('should throw an error if agent does not exist', async () => {
      // Setup
      const agentId = 'nonexistent';
      const priceData = {
        amount: 29.99,
        currency: 'USD'
      };

      mockAgentService.getAgentById.mockRejectedValue(new Error('Agent not found'));

      // Execute and verify
      await expect(priceService.createOrUpdatePrice(agentId, priceData)).rejects.toThrow('Agent with ID nonexistent not found');
    });

    it('should validate price data', async () => {
      // Test missing amount
      await expect(priceService.createOrUpdatePrice('agent-123', { currency: 'USD' })).rejects.toThrow('Price amount is required');

      // Test invalid amount type
      await expect(priceService.createOrUpdatePrice('agent-123', { amount: 'not-a-number', currency: 'USD' })).rejects.toThrow('Price amount must be a number');

      // Test negative amount
      await expect(priceService.createOrUpdatePrice('agent-123', { amount: -10, currency: 'USD' })).rejects.toThrow('Price amount cannot be negative');

      // Test missing currency
      await expect(priceService.createOrUpdatePrice('agent-123', { amount: 10 })).rejects.toThrow('Currency is required');

      // Test invalid currency type
      await expect(priceService.createOrUpdatePrice('agent-123', { amount: 10, currency: 123 })).rejects.toThrow('Currency must be a string');

      // Test invalid features type
      await expect(priceService.createOrUpdatePrice('agent-123', { amount: 10, currency: 'USD', features: 'not-an-array' })).rejects.toThrow('Features must be an array');
    });
  });

  describe('deletePrice', () => {
    it('should delete a price', async () => {
      // Setup
      const agentId = 'agent-123';
      mockPriceRepository.deletePrice.mockResolvedValue(true);

      // Execute
      const result = await priceService.deletePrice(agentId);

      // Verify
      expect(mockPriceRepository.deletePrice).toHaveBeenCalledWith(agentId);
      expect(result).toBe(true);
    });

    it('should throw an error if agent ID is not provided', async () => {
      await expect(priceService.deletePrice()).rejects.toThrow('Agent ID is required');
    });

    it('should throw an error if price is not found', async () => {
      // Setup
      const agentId = 'nonexistent';
      mockPriceRepository.deletePrice.mockResolvedValue(false);

      // Execute and verify
      await expect(priceService.deletePrice(agentId)).rejects.toThrow('Price not found for agent nonexistent');
    });
  });

  describe('getAllPrices', () => {
    it('should get all prices with default options', async () => {
      // Setup
      const mockPrices = [
        { id: 'agent-1', amount: 9.99, currency: 'USD' },
        { id: 'agent-2', amount: 19.99, currency: 'USD' }
      ];
      mockPriceRepository.getAllPrices.mockResolvedValue(mockPrices);

      // Execute
      const result = await priceService.getAllPrices();

      // Verify
      expect(mockPriceRepository.getAllPrices).toHaveBeenCalledWith(100, null);
      expect(result).toEqual(mockPrices);
    });

    it('should get all prices with custom options', async () => {
      // Setup
      const options = {
        limit: 10,
        startAfter: 'agent-5'
      };
      const mockPrices = [
        { id: 'agent-6', amount: 9.99, currency: 'USD' },
        { id: 'agent-7', amount: 19.99, currency: 'USD' }
      ];
      mockPriceRepository.getAllPrices.mockResolvedValue(mockPrices);

      // Execute
      const result = await priceService.getAllPrices(options);

      // Verify
      expect(mockPriceRepository.getAllPrices).toHaveBeenCalledWith(10, 'agent-5');
      expect(result).toEqual(mockPrices);
    });
  });

  describe('getPricesByCurrency', () => {
    it('should get prices by currency', async () => {
      // Setup
      const currency = 'EUR';
      const mockPrices = [
        { id: 'agent-1', amount: 9.99, currency: 'EUR' },
        { id: 'agent-2', amount: 19.99, currency: 'EUR' }
      ];
      mockPriceRepository.getPricesByCurrency.mockResolvedValue(mockPrices);

      // Execute
      const result = await priceService.getPricesByCurrency(currency);

      // Verify
      expect(mockPriceRepository.getPricesByCurrency).toHaveBeenCalledWith(currency, 100);
      expect(result).toEqual(mockPrices);
    });

    it('should throw an error if currency is not provided', async () => {
      await expect(priceService.getPricesByCurrency()).rejects.toThrow('Currency is required');
    });
  });

  describe('getPricesInRange', () => {
    it('should get prices in a range', async () => {
      // Setup
      const minPrice = 10;
      const maxPrice = 30;
      const currency = 'USD';
      const limit = 50;
      const mockPrices = [
        { id: 'agent-1', amount: 19.99, currency: 'USD' },
        { id: 'agent-2', amount: 29.99, currency: 'USD' }
      ];
      mockPriceRepository.getPricesInRange.mockResolvedValue(mockPrices);

      // Execute
      const result = await priceService.getPricesInRange(minPrice, maxPrice, currency, limit);

      // Verify
      expect(mockPriceRepository.getPricesInRange).toHaveBeenCalledWith(minPrice, maxPrice, currency, limit);
      expect(result).toEqual(mockPrices);
    });

    it('should throw an error if min or max price is not provided', async () => {
      await expect(priceService.getPricesInRange()).rejects.toThrow('Min and max price are required');
      await expect(priceService.getPricesInRange(10)).rejects.toThrow('Min and max price are required');
    });

    it('should throw an error if prices are negative', async () => {
      await expect(priceService.getPricesInRange(-10, 30)).rejects.toThrow('Prices cannot be negative');
      await expect(priceService.getPricesInRange(10, -30)).rejects.toThrow('Prices cannot be negative');
    });

    it('should throw an error if min price is greater than max price', async () => {
      await expect(priceService.getPricesInRange(40, 30)).rejects.toThrow('Min price cannot be greater than max price');
    });
  });
}); 