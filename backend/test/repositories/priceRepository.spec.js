const { jest: jestConfig } = require('../../jest.config');

// Mock Firebase
const mockCollection = {
  doc: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn()
};

const mockDocRef = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

const mockQueryRef = {
  get: jest.fn(),
  where: jest.fn(),
  limit: jest.fn()
};

mockCollection.doc.mockReturnValue(mockDocRef);
mockCollection.where.mockReturnValue(mockQueryRef);
mockCollection.orderBy.mockReturnValue(mockCollection);
mockCollection.limit.mockReturnValue(mockQueryRef);
mockQueryRef.where.mockReturnValue(mockQueryRef);
mockQueryRef.limit.mockReturnValue(mockQueryRef);

const mockDb = {
  collection: jest.fn(() => mockCollection)
};

// Mock price document
const mockPriceDoc = {
  id: 'agent-123',
  exists: true,
  data: jest.fn(() => ({
    agentId: 'agent-123',
    amount: 29.99,
    currency: 'USD',
    isFree: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }))
};

// Mock agent document
const mockAgentDoc = {
  id: 'agent-123',
  exists: true,
  data: jest.fn(() => ({
    name: 'Test Agent',
    description: 'This is a test agent'
  }))
};

// Mock database responses
const mockSnapshot = {
  empty: false,
  docs: [mockPriceDoc],
  forEach: jest.fn(callback => {
    mockSnapshot.docs.forEach(doc => {
      callback(doc);
    });
  })
};

const emptySnapshot = {
  empty: true,
  docs: [],
  forEach: jest.fn()
};

// Mock the Firebase config
jest.mock('../../config/firebase', () => ({
  db: mockDb
}));

// Import repository after mocks
const priceRepository = require('../../repositories/priceRepository');

describe('Price Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocRef.get.mockResolvedValue(mockPriceDoc);
    mockQueryRef.get.mockResolvedValue(mockSnapshot);
  });

  describe('getPriceByAgentId', () => {
    it('should get a price by agent ID', async () => {
      // Execute
      const result = await priceRepository.getPriceByAgentId('agent-123');

      // Verify
      expect(mockDb.collection).toHaveBeenCalledWith('agent-prices');
      expect(mockCollection.doc).toHaveBeenCalledWith('agent-123');
      expect(mockDocRef.get).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'agent-123',
        agentId: 'agent-123',
        amount: 29.99,
        currency: 'USD',
        isFree: false,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });

    it('should throw an error if agent ID is not provided', async () => {
      await expect(priceRepository.getPriceByAgentId()).rejects.toThrow('Agent ID is required');
    });

    it('should return null if price is not found', async () => {
      // Setup
      mockDocRef.get.mockResolvedValueOnce({ exists: false });

      // Execute
      const result = await priceRepository.getPriceByAgentId('nonexistent');

      // Verify
      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      // Setup
      mockDocRef.get.mockRejectedValueOnce(new Error('Database error'));

      // Execute and verify
      await expect(priceRepository.getPriceByAgentId('agent-123')).rejects.toThrow('Database error');
    });
  });

  describe('getPricesByAgentIds', () => {
    it('should get prices for multiple agents', async () => {
      // Setup
      const agentIds = ['agent-1', 'agent-2'];
      const mockPrices = [
        { id: 'agent-1', amount: 9.99, currency: 'USD' },
        { id: 'agent-2', amount: 19.99, currency: 'USD' }
      ];

      // Mock the response for the query
      const mockPriceDocs = mockPrices.map(price => ({
        id: price.id,
        data: () => price
      }));
      const mockBatchSnapshot = {
        empty: false,
        docs: mockPriceDocs,
        forEach: jest.fn(cb => mockPriceDocs.forEach(cb))
      };
      mockQueryRef.get.mockResolvedValueOnce(mockBatchSnapshot);

      // Execute
      const result = await priceRepository.getPricesByAgentIds(agentIds);

      // Verify
      expect(mockCollection.where).toHaveBeenCalledWith('agentId', 'in', agentIds);
      expect(mockQueryRef.get).toHaveBeenCalled();
      expect(result).toEqual(mockPrices);
    });

    it('should return empty array if no agent IDs are provided', async () => {
      // Execute
      const result = await priceRepository.getPricesByAgentIds([]);

      // Verify
      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      // Setup
      mockQueryRef.get.mockRejectedValueOnce(new Error('Database error'));

      // Execute and verify
      await expect(priceRepository.getPricesByAgentIds(['agent-1'])).rejects.toThrow('Database error');
    });
  });

  describe('createOrUpdatePrice', () => {
    it('should create a new price', async () => {
      // Setup
      const agentId = 'agent-123';
      const priceData = {
        amount: 29.99,
        currency: 'USD',
        isFree: false
      };

      // Mock the agent document
      mockDb.collection.mockImplementation((collection) => {
        if (collection === 'agents') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockAgentDoc)
            })
          };
        }
        return mockCollection;
      });

      // Mock price document doesn't exist yet
      mockDocRef.get.mockResolvedValueOnce({ exists: false });
      
      // Execute
      await priceRepository.createOrUpdatePrice(agentId, priceData);

      // Verify
      expect(mockDocRef.set).toHaveBeenCalledWith(expect.objectContaining({
        ...priceData,
        agentId,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      }), { merge: true });
    });

    it('should update an existing price', async () => {
      // Setup
      const agentId = 'agent-123';
      const priceData = {
        amount: 39.99,
        currency: 'USD',
        isFree: false
      };

      // Mock the agent document
      mockDb.collection.mockImplementation((collection) => {
        if (collection === 'agents') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockAgentDoc)
            })
          };
        }
        return mockCollection;
      });

      // Price document exists
      mockDocRef.get.mockResolvedValueOnce(mockPriceDoc);
      
      // Execute
      await priceRepository.createOrUpdatePrice(agentId, priceData);

      // Verify
      expect(mockDocRef.set).toHaveBeenCalledWith(expect.objectContaining({
        ...priceData,
        agentId,
        updatedAt: expect.any(Date)
      }), { merge: true });
    });

    it('should throw an error if agent ID is not provided', async () => {
      await expect(priceRepository.createOrUpdatePrice(null, { amount: 29.99 })).rejects.toThrow('Agent ID is required');
    });

    it('should throw an error if price data is not provided', async () => {
      await expect(priceRepository.createOrUpdatePrice('agent-123', null)).rejects.toThrow('Price data is required');
    });

    it('should throw an error if agent is not found', async () => {
      // Setup
      const agentId = 'nonexistent';
      const priceData = {
        amount: 29.99,
        currency: 'USD'
      };

      // Mock agent not found
      mockDb.collection.mockImplementation((collection) => {
        if (collection === 'agents') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ exists: false })
            })
          };
        }
        return mockCollection;
      });

      // Execute and verify
      await expect(priceRepository.createOrUpdatePrice(agentId, priceData)).rejects.toThrow(`Agent with ID ${agentId} not found`);
    });
  });

  describe('deletePrice', () => {
    it('should delete a price', async () => {
      // Setup
      const agentId = 'agent-123';
      
      // Execute
      const result = await priceRepository.deletePrice(agentId);

      // Verify
      expect(mockCollection.doc).toHaveBeenCalledWith(agentId);
      expect(mockDocRef.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if price does not exist', async () => {
      // Setup
      const agentId = 'nonexistent';
      mockDocRef.get.mockResolvedValueOnce({ exists: false });
      
      // Execute
      const result = await priceRepository.deletePrice(agentId);

      // Verify
      expect(result).toBe(false);
    });

    it('should throw an error if agent ID is not provided', async () => {
      await expect(priceRepository.deletePrice()).rejects.toThrow('Agent ID is required');
    });
  });

  describe('getAllPrices', () => {
    it('should get all prices with default parameters', async () => {
      // Setup
      const limit = 100;
      
      // Execute
      const result = await priceRepository.getAllPrices();

      // Verify
      expect(mockCollection.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(mockCollection.limit).toHaveBeenCalledWith(limit);
      expect(mockQueryRef.get).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: 'agent-123',
          agentId: 'agent-123',
          amount: 29.99,
          currency: 'USD',
          isFree: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      ]);
    });

    it('should handle pagination with startAfter', async () => {
      // Setup
      const limit = 10;
      const startAfter = 'agent-5';
      mockCollection.startAfter.mockReturnValue(mockQueryRef);
      
      // Execute
      const result = await priceRepository.getAllPrices(limit, startAfter);

      // Verify
      expect(mockCollection.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(mockCollection.limit).toHaveBeenCalledWith(limit);
      expect(mockDocRef.get).toHaveBeenCalled(); // For startAfter
      expect(mockCollection.startAfter).toHaveBeenCalled();
      expect(mockQueryRef.get).toHaveBeenCalled();
    });
  });

  describe('getPricesByCurrency', () => {
    it('should get prices by currency', async () => {
      // Setup
      const currency = 'USD';
      const limit = 100;
      
      // Execute
      const result = await priceRepository.getPricesByCurrency(currency, limit);

      // Verify
      expect(mockCollection.where).toHaveBeenCalledWith('currency', '==', currency);
      expect(mockQueryRef.limit).toHaveBeenCalledWith(limit);
      expect(mockQueryRef.get).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: 'agent-123',
          agentId: 'agent-123',
          amount: 29.99,
          currency: 'USD',
          isFree: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      ]);
    });

    it('should throw an error if currency is not provided', async () => {
      await expect(priceRepository.getPricesByCurrency()).rejects.toThrow('Currency is required');
    });
  });

  describe('getPricesInRange', () => {
    it('should get prices in a specific range', async () => {
      // Setup
      const minPrice = 10;
      const maxPrice = 50;
      const currency = 'USD';
      const limit = 100;
      
      mockQueryRef.where.mockReturnValue(mockQueryRef);
      
      // Execute
      const result = await priceRepository.getPricesInRange(minPrice, maxPrice, currency, limit);

      // Verify
      expect(mockCollection.where).toHaveBeenCalledWith('currency', '==', currency);
      expect(mockQueryRef.where).toHaveBeenCalledWith('amount', '>=', minPrice);
      expect(mockQueryRef.where).toHaveBeenCalledWith('amount', '<=', maxPrice);
      expect(mockQueryRef.limit).toHaveBeenCalledWith(limit);
      expect(mockQueryRef.get).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: 'agent-123',
          agentId: 'agent-123',
          amount: 29.99,
          currency: 'USD',
          isFree: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      ]);
    });

    it('should throw an error if min or max price is not provided', async () => {
      await expect(priceRepository.getPricesInRange()).rejects.toThrow('Min and max price are required');
    });
  });
}); 