const { jest: jestConfig } = require('../../jest.config');

// Mock firebase
const mockGet = jest.fn();
const mockAdd = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockStartAfter = jest.fn();
const mockCollection = jest.fn().mockReturnThis();
const mockDoc = jest.fn().mockReturnThis();

// Mock Firebase response structure
const mockSnapshot = {
  docs: [],
  exists: true,
  data: jest.fn(),
  id: 'mock-id'
};

// Mock Logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock Firebase db
jest.mock('../../config/firebase', () => ({
  collection: mockCollection
}));

// Mock logger
jest.mock('../../utils/logger', () => mockLogger);

// Override wishlistRepository's db property after importing
const wishlistRepository = require('../../repositories/wishlistRepository');
// Replace the db object with our mock
wishlistRepository.db = {
  collection: mockCollection
};

describe('WishlistRepository', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockGet.mockResolvedValue(mockSnapshot);
    mockAdd.mockResolvedValue({ id: 'new-wishlist-id', get: () => Promise.resolve(mockSnapshot) });
    mockUpdate.mockResolvedValue();
    mockDelete.mockResolvedValue();
    mockWhere.mockReturnThis();
    mockOrderBy.mockReturnThis();
    mockLimit.mockReturnThis();
    mockStartAfter.mockReturnThis();

    // Configure mocks for method chaining
    mockCollection.mockReturnValue({
      doc: mockDoc,
      add: mockAdd,
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      get: mockGet
    });

    mockDoc.mockReturnValue({
      get: mockGet,
      update: mockUpdate,
      delete: mockDelete
    });

    mockWhere.mockReturnValue({
      orderBy: mockOrderBy,
      get: mockGet
    });

    mockOrderBy.mockReturnValue({
      limit: mockLimit,
      get: mockGet
    });

    mockLimit.mockReturnValue({
      startAfter: mockStartAfter,
      get: mockGet
    });

    mockStartAfter.mockReturnValue({
      get: mockGet
    });

    // Default snapshot data
    mockSnapshot.docs = [
      { id: 'wishlist-1', data: () => ({ name: 'Test Wishlist 1', userId: 'user-1', isPublic: true }) },
      { id: 'wishlist-2', data: () => ({ name: 'Test Wishlist 2', userId: 'user-1', isPublic: false }) }
    ];
    mockSnapshot.data.mockReturnValue({ name: 'Test Wishlist', userId: 'user-1' });
  });

  describe('createWishlist', () => {
    it('should create a wishlist document', async () => {
      const wishlistData = {
        name: 'New Wishlist',
        userId: 'user-123',
        isPublic: true
      };

      const result = await wishlistRepository.createWishlist(wishlistData);

      expect(mockCollection).toHaveBeenCalledWith('wishlists');
      expect(mockAdd).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'new-wishlist-id');
      expect(result).toHaveProperty('name', 'Test Wishlist');
    });

    it('should handle errors when creating wishlist', async () => {
      mockAdd.mockRejectedValue(new Error('Firebase error'));

      await expect(wishlistRepository.createWishlist({})).rejects.toThrow('Firebase error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getWishlistById', () => {
    it('should get a wishlist by ID', async () => {
      const result = await wishlistRepository.getWishlistById('wishlist-1');

      expect(mockCollection).toHaveBeenCalledWith('wishlists');
      expect(mockDoc).toHaveBeenCalledWith('wishlist-1');
      expect(mockGet).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'mock-id');
      expect(result).toHaveProperty('name', 'Test Wishlist');
    });

    it('should return null if wishlist does not exist', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const result = await wishlistRepository.getWishlistById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle errors when getting wishlist', async () => {
      mockGet.mockRejectedValue(new Error('Firebase error'));

      await expect(wishlistRepository.getWishlistById('wishlist-1')).rejects.toThrow('Firebase error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getPublicWishlists', () => {
    it('should get all public wishlists with pagination', async () => {
      const result = await wishlistRepository.getPublicWishlists(10);

      expect(mockCollection).toHaveBeenCalledWith('wishlists');
      expect(mockWhere).toHaveBeenCalledWith('isPublic', '==', true);
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('id', 'wishlist-1');
    });

    it('should handle pagination with lastId', async () => {
      mockGet.mockResolvedValueOnce({ exists: true });

      await wishlistRepository.getPublicWishlists(10, 'last-id');

      expect(mockDoc).toHaveBeenCalledWith('last-id');
      expect(mockStartAfter).toHaveBeenCalled();
    });

    it('should handle errors when getting public wishlists', async () => {
      mockGet.mockRejectedValue(new Error('Firebase error'));

      await expect(wishlistRepository.getPublicWishlists()).rejects.toThrow('Firebase error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserWishlists', () => {
    it('should get all wishlists for a specific user', async () => {
      const result = await wishlistRepository.getUserWishlists('user-1');

      expect(mockCollection).toHaveBeenCalledWith('wishlists');
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user-1');
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('id', 'wishlist-1');
    });

    it('should handle errors when getting user wishlists', async () => {
      mockGet.mockRejectedValue(new Error('Firebase error'));

      await expect(wishlistRepository.getUserWishlists('user-1')).rejects.toThrow('Firebase error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateWishlist', () => {
    it('should update a wishlist document', async () => {
      const updateData = {
        name: 'Updated Wishlist',
        isPublic: false
      };

      await wishlistRepository.updateWishlist('wishlist-1', updateData);

      expect(mockCollection).toHaveBeenCalledWith('wishlists');
      expect(mockDoc).toHaveBeenCalledWith('wishlist-1');
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdate.mock.calls[0][0]).toHaveProperty('name', 'Updated Wishlist');
      expect(mockUpdate.mock.calls[0][0]).toHaveProperty('isPublic', false);
      expect(mockUpdate.mock.calls[0][0]).toHaveProperty('updatedAt');
    });

    it('should handle errors when updating wishlist', async () => {
      mockUpdate.mockRejectedValue(new Error('Firebase error'));

      await expect(wishlistRepository.updateWishlist('wishlist-1', {})).rejects.toThrow('Firebase error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('deleteWishlist', () => {
    it('should delete a wishlist document', async () => {
      const result = await wishlistRepository.deleteWishlist('wishlist-1');

      expect(mockCollection).toHaveBeenCalledWith('wishlists');
      expect(mockDoc).toHaveBeenCalledWith('wishlist-1');
      expect(mockDelete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle errors when deleting wishlist', async () => {
      mockDelete.mockRejectedValue(new Error('Firebase error'));

      await expect(wishlistRepository.deleteWishlist('wishlist-1')).rejects.toThrow('Firebase error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('isAgentInWishlists', () => {
    it('should check if an agent is in any of a user\'s wishlists', async () => {
      // Set up mock data with agents
      mockSnapshot.docs = [
        { 
          id: 'wishlist-1', 
          data: () => ({ 
            name: 'Test Wishlist 1', 
            userId: 'user-1', 
            isPublic: true,
            agents: ['agent-1', 'agent-2'] 
          }) 
        },
        { 
          id: 'wishlist-2', 
          data: () => ({ 
            name: 'Test Wishlist 2', 
            userId: 'user-1', 
            isPublic: false,
            agents: ['agent-3'] 
          }) 
        }
      ];

      const result = await wishlistRepository.isAgentInWishlists('user-1', 'agent-1');
      expect(result).toBe(true);
      
      const resultNotFound = await wishlistRepository.isAgentInWishlists('user-1', 'agent-not-exists');
      expect(resultNotFound).toBe(false);
    });

    it('should handle wishlists with no agents property', async () => {
      mockSnapshot.docs = [
        { 
          id: 'wishlist-1', 
          data: () => ({ 
            name: 'Test Wishlist 1', 
            userId: 'user-1', 
            isPublic: true
            // No agents property
          }) 
        }
      ];

      const result = await wishlistRepository.isAgentInWishlists('user-1', 'agent-1');
      expect(result).toBe(false);
    });

    it('should handle errors when checking if agent is in wishlists', async () => {
      mockGet.mockRejectedValue(new Error('Firebase error'));

      await expect(wishlistRepository.isAgentInWishlists('user-1', 'agent-1')).rejects.toThrow('Firebase error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
}); 