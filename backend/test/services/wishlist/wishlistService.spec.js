/**
 * Tests for Wishlist Service
 */

const { jest: jestConfig } = require('@jest/globals');

// Create mocks
const mockWishlistRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

const mockAgentService = {
  getAgentById: jest.fn(),
  getAgentsByIds: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock the repositories and dependencies
jest.mock('../../../repositories/wishlistRepository', () => mockWishlistRepository);
jest.mock('../../../services/agent/agentService', () => mockAgentService);
jest.mock('../../../utils/logger', () => mockLogger);

// Import the service after mocking
const WishlistService = require('../../../services/wishlist/wishlistService');

describe('Wishlist Service', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublicWishlists', () => {
    it('should get all public wishlists with pagination', async () => {
      // Setup
      const mockResult = {
        wishlists: [
          { id: 'wishlist-1', name: 'Public Wishlist 1', isPrivate: false },
          { id: 'wishlist-2', name: 'Public Wishlist 2', isPrivate: false }
        ],
        totalCount: 2,
        page: 1,
        totalPages: 1
      };
      mockWishlistRepository.findAll.mockResolvedValue(mockResult);
      
      const options = {
        limit: 10,
        offset: 0
      };
      
      // Execute
      const result = await WishlistService.getPublicWishlists(options);
      
      // Verify
      expect(mockWishlistRepository.findAll).toHaveBeenCalledWith({
        ...options,
        filters: {
          isPrivate: false
        }
      });
      expect(result).toEqual(mockResult);
    });

    it('should handle repository errors', async () => {
      // Setup
      mockWishlistRepository.findAll.mockRejectedValue(new Error('Database error'));
      
      // Execute & Verify
      await expect(WishlistService.getPublicWishlists()).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserWishlists', () => {
    it('should get all wishlists for a specific user', async () => {
      // Setup
      const userId = 'user-123';
      const mockResult = {
        wishlists: [
          { id: 'wishlist-1', name: 'User Wishlist 1', creatorId: userId },
          { id: 'wishlist-2', name: 'User Wishlist 2', creatorId: userId }
        ],
        totalCount: 2,
        page: 1,
        totalPages: 1
      };
      mockWishlistRepository.findAll.mockResolvedValue(mockResult);
      
      const options = {
        limit: 10,
        offset: 0
      };
      
      // Execute
      const result = await WishlistService.getUserWishlists(userId, options);
      
      // Verify
      expect(mockWishlistRepository.findAll).toHaveBeenCalledWith({
        ...options,
        filters: {
          creatorId: userId
        }
      });
      expect(result).toEqual(mockResult);
    });

    it('should throw an error if userId is not provided', async () => {
      // Execute & Verify
      await expect(WishlistService.getUserWishlists()).rejects.toThrow('User ID is required');
      expect(mockWishlistRepository.findAll).not.toHaveBeenCalled();
    });
  });

  describe('getWishlistById', () => {
    it('should get a wishlist by ID', async () => {
      // Setup
      const wishlistId = 'wishlist-123';
      const userId = 'user-123';
      
      const mockWishlist = {
        id: wishlistId,
        name: 'Test Wishlist',
        creatorId: userId,
        isPrivate: false,
        items: [
          { agentId: 'agent-1', addedAt: '2023-01-01' },
          { agentId: 'agent-2', addedAt: '2023-01-02' }
        ]
      };
      
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1' },
        { id: 'agent-2', name: 'Agent 2' }
      ];
      
      mockWishlistRepository.findById.mockResolvedValue(mockWishlist);
      mockAgentService.getAgentsByIds.mockResolvedValue(mockAgents);
      
      // Execute
      const wishlist = await WishlistService.getWishlistById(wishlistId, userId);
      
      // Verify
      expect(mockWishlistRepository.findById).toHaveBeenCalledWith(wishlistId);
      expect(mockAgentService.getAgentsByIds).toHaveBeenCalledWith(['agent-1', 'agent-2']);
      
      // Check if agent details are attached to items
      expect(wishlist.items[0].agent).toEqual({ id: 'agent-1', name: 'Agent 1' });
      expect(wishlist.items[1].agent).toEqual({ id: 'agent-2', name: 'Agent 2' });
    });

    it('should throw an error if wishlist is not found', async () => {
      // Setup
      mockWishlistRepository.findById.mockResolvedValue(null);
      
      // Execute & Verify
      await expect(WishlistService.getWishlistById('non-existent')).rejects.toThrow('Wishlist not found');
    });

    it('should throw an error if wishlist is private and user is not the creator', async () => {
      // Setup
      const wishlistId = 'wishlist-123';
      const creatorId = 'user-123';
      const otherUserId = 'user-456';
      
      const mockWishlist = {
        id: wishlistId,
        name: 'Private Wishlist',
        creatorId: creatorId,
        isPrivate: true
      };
      
      mockWishlistRepository.findById.mockResolvedValue(mockWishlist);
      
      // Execute & Verify
      await expect(WishlistService.getWishlistById(wishlistId, otherUserId)).rejects.toThrow('Access denied to private wishlist');
    });
  });

  describe('createWishlist', () => {
    it('should create a new wishlist with valid data', async () => {
      // Setup
      const userId = 'user-123';
      const wishlistData = {
        name: 'New Wishlist',
        description: 'My collection of agents'
      };
      
      const createdWishlist = {
        id: 'wishlist-123',
        name: 'New Wishlist',
        description: 'My collection of agents',
        creatorId: userId,
        isPrivate: false,
        items: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      };
      
      mockWishlistRepository.create.mockResolvedValue(createdWishlist);
      
      // Execute
      const result = await WishlistService.createWishlist(userId, wishlistData);
      
      // Verify
      expect(mockWishlistRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Wishlist',
        description: 'My collection of agents',
        creatorId: userId,
        isPrivate: false,
        items: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      }));
      expect(result).toEqual(createdWishlist);
    });

    it('should throw an error if userId is not provided', async () => {
      // Execute & Verify
      await expect(WishlistService.createWishlist(null, { name: 'Test' })).rejects.toThrow('User ID is required');
      expect(mockWishlistRepository.create).not.toHaveBeenCalled();
    });

    it('should throw an error if wishlist name is not provided', async () => {
      // Execute & Verify
      await expect(WishlistService.createWishlist('user-123', {})).rejects.toThrow('Wishlist name is required');
      expect(mockWishlistRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateWishlist', () => {
    it('should update a wishlist with valid data', async () => {
      // Setup
      const wishlistId = 'wishlist-123';
      const userId = 'user-123';
      const updateData = {
        name: 'Updated Wishlist',
        description: 'Updated description'
      };
      
      const existingWishlist = {
        id: wishlistId,
        name: 'Old Wishlist',
        description: 'Old description',
        creatorId: userId
      };
      
      const updatedWishlist = {
        ...existingWishlist,
        ...updateData,
        updatedAt: expect.any(String)
      };
      
      mockWishlistRepository.findById.mockResolvedValue(existingWishlist);
      mockWishlistRepository.update.mockResolvedValue(updatedWishlist);
      
      // Execute
      const result = await WishlistService.updateWishlist(wishlistId, userId, updateData);
      
      // Verify
      expect(mockWishlistRepository.findById).toHaveBeenCalledWith(wishlistId);
      expect(mockWishlistRepository.update).toHaveBeenCalledWith(wishlistId, expect.objectContaining({
        name: 'Updated Wishlist',
        description: 'Updated description',
        updatedAt: expect.any(String)
      }));
      expect(result).toEqual(updatedWishlist);
    });

    it('should throw an error if wishlist is not found', async () => {
      // Setup
      mockWishlistRepository.findById.mockResolvedValue(null);
      
      // Execute & Verify
      await expect(WishlistService.updateWishlist('non-existent', 'user-123', { name: 'Test' })).rejects.toThrow('Wishlist not found');
      expect(mockWishlistRepository.update).not.toHaveBeenCalled();
    });

    it('should throw an error if user is not the creator of the wishlist', async () => {
      // Setup
      const wishlistId = 'wishlist-123';
      const creatorId = 'user-123';
      const otherUserId = 'user-456';
      
      const existingWishlist = {
        id: wishlistId,
        name: 'Test Wishlist',
        creatorId: creatorId
      };
      
      mockWishlistRepository.findById.mockResolvedValue(existingWishlist);
      
      // Execute & Verify
      await expect(WishlistService.updateWishlist(wishlistId, otherUserId, { name: 'Updated' })).rejects.toThrow('Not authorized to update this wishlist');
      expect(mockWishlistRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteWishlist', () => {
    it('should delete a wishlist', async () => {
      // Setup
      const wishlistId = 'wishlist-123';
      const userId = 'user-123';
      
      const existingWishlist = {
        id: wishlistId,
        name: 'Test Wishlist',
        creatorId: userId
      };
      
      mockWishlistRepository.findById.mockResolvedValue(existingWishlist);
      mockWishlistRepository.delete.mockResolvedValue({ success: true });
      
      // Execute
      await WishlistService.deleteWishlist(wishlistId, userId);
      
      // Verify
      expect(mockWishlistRepository.findById).toHaveBeenCalledWith(wishlistId);
      expect(mockWishlistRepository.delete).toHaveBeenCalledWith(wishlistId);
    });

    it('should throw an error if wishlist is not found', async () => {
      // Setup
      mockWishlistRepository.findById.mockResolvedValue(null);
      
      // Execute & Verify
      await expect(WishlistService.deleteWishlist('non-existent', 'user-123')).rejects.toThrow('Wishlist not found');
      expect(mockWishlistRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw an error if user is not the creator of the wishlist', async () => {
      // Setup
      const wishlistId = 'wishlist-123';
      const creatorId = 'user-123';
      const otherUserId = 'user-456';
      
      const existingWishlist = {
        id: wishlistId,
        name: 'Test Wishlist',
        creatorId: creatorId
      };
      
      mockWishlistRepository.findById.mockResolvedValue(existingWishlist);
      
      // Execute & Verify
      await expect(WishlistService.deleteWishlist(wishlistId, otherUserId)).rejects.toThrow('Not authorized to delete this wishlist');
      expect(mockWishlistRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('addToWishlist', () => {
    it('should add an agent to a wishlist', async () => {
      // Setup
      const wishlistId = 'wishlist-123';
      const userId = 'user-123';
      const agentId = 'agent-123';
      
      const existingWishlist = {
        id: wishlistId,
        name: 'Test Wishlist',
        creatorId: userId,
        items: []
      };
      
      const agent = {
        id: agentId,
        name: 'Test Agent'
      };
      
      const updatedWishlist = {
        ...existingWishlist,
        items: [
          {
            agentId,
            addedAt: expect.any(String)
          }
        ],
        updatedAt: expect.any(String)
      };
      
      mockWishlistRepository.findById.mockResolvedValue(existingWishlist);
      mockAgentService.getAgentById.mockResolvedValue(agent);
      mockWishlistRepository.update.mockResolvedValue(updatedWishlist);
      
      // Execute
      const result = await WishlistService.addToWishlist(wishlistId, userId, agentId);
      
      // Verify
      expect(mockWishlistRepository.findById).toHaveBeenCalledWith(wishlistId);
      expect(mockAgentService.getAgentById).toHaveBeenCalledWith(agentId);
      expect(mockWishlistRepository.update).toHaveBeenCalledWith(wishlistId, expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            agentId,
            addedAt: expect.any(String)
          })
        ]),
        updatedAt: expect.any(String)
      }));
      expect(result).toEqual(updatedWishlist);
    });

    it('should throw an error if agent is already in the wishlist', async () => {
      // Setup
      const wishlistId = 'wishlist-123';
      const userId = 'user-123';
      const agentId = 'agent-123';
      
      const existingWishlist = {
        id: wishlistId,
        name: 'Test Wishlist',
        creatorId: userId,
        items: [
          { agentId, addedAt: '2023-01-01' }
        ]
      };
      
      const agent = {
        id: agentId,
        name: 'Test Agent'
      };
      
      mockWishlistRepository.findById.mockResolvedValue(existingWishlist);
      mockAgentService.getAgentById.mockResolvedValue(agent);
      
      // Execute & Verify
      await expect(WishlistService.addToWishlist(wishlistId, userId, agentId)).rejects.toThrow('Agent is already in the wishlist');
      expect(mockWishlistRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('removeFromWishlist', () => {
    it('should remove an agent from a wishlist', async () => {
      // Setup
      const wishlistId = 'wishlist-123';
      const userId = 'user-123';
      const agentId = 'agent-123';
      
      const existingWishlist = {
        id: wishlistId,
        name: 'Test Wishlist',
        creatorId: userId,
        items: [
          { agentId, addedAt: '2023-01-01' }
        ]
      };
      
      const updatedWishlist = {
        ...existingWishlist,
        items: [],
        updatedAt: expect.any(String)
      };
      
      mockWishlistRepository.findById.mockResolvedValue(existingWishlist);
      mockWishlistRepository.update.mockResolvedValue(updatedWishlist);
      
      // Execute
      const result = await WishlistService.removeFromWishlist(wishlistId, userId, agentId);
      
      // Verify
      expect(mockWishlistRepository.findById).toHaveBeenCalledWith(wishlistId);
      expect(mockWishlistRepository.update).toHaveBeenCalledWith(wishlistId, expect.objectContaining({
        items: [],
        updatedAt: expect.any(String)
      }));
      expect(result).toEqual(updatedWishlist);
    });

    it('should throw an error if agent is not in the wishlist', async () => {
      // Setup
      const wishlistId = 'wishlist-123';
      const userId = 'user-123';
      const agentId = 'agent-123';
      
      const existingWishlist = {
        id: wishlistId,
        name: 'Test Wishlist',
        creatorId: userId,
        items: []
      };
      
      mockWishlistRepository.findById.mockResolvedValue(existingWishlist);
      
      // Execute & Verify
      await expect(WishlistService.removeFromWishlist(wishlistId, userId, agentId)).rejects.toThrow('Agent is not in the wishlist');
      expect(mockWishlistRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('isAgentInWishlists', () => {
    it('should return true if agent is in any wishlist', async () => {
      // Setup
      const userId = 'user-123';
      const agentId = 'agent-123';
      
      const mockWishlists = {
        wishlists: [
          {
            id: 'wishlist-1',
            name: 'Wishlist 1',
            items: []
          },
          {
            id: 'wishlist-2',
            name: 'Wishlist 2',
            items: [
              { agentId, addedAt: '2023-01-01' }
            ]
          }
        ]
      };
      
      // Mock getUserWishlists as it's a method of the same class
      jest.spyOn(WishlistService, 'getUserWishlists').mockResolvedValue(mockWishlists);
      
      // Execute
      const result = await WishlistService.isAgentInWishlists(userId, agentId);
      
      // Verify
      expect(WishlistService.getUserWishlists).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        isWishlisted: true,
        wishlistId: 'wishlist-2'
      });
    });

    it('should return false if agent is not in any wishlist', async () => {
      // Setup
      const userId = 'user-123';
      const agentId = 'agent-123';
      
      const mockWishlists = {
        wishlists: [
          {
            id: 'wishlist-1',
            name: 'Wishlist 1',
            items: []
          },
          {
            id: 'wishlist-2',
            name: 'Wishlist 2',
            items: [
              { agentId: 'other-agent', addedAt: '2023-01-01' }
            ]
          }
        ]
      };
      
      // Mock getUserWishlists as it's a method of the same class
      jest.spyOn(WishlistService, 'getUserWishlists').mockResolvedValue(mockWishlists);
      
      // Execute
      const result = await WishlistService.isAgentInWishlists(userId, agentId);
      
      // Verify
      expect(WishlistService.getUserWishlists).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        isWishlisted: false,
        wishlistId: null
      });
    });

    it('should throw an error if userId or agentId is not provided', async () => {
      // Execute & Verify
      await expect(WishlistService.isAgentInWishlists(null, 'agent-123')).rejects.toThrow('User ID and agent ID are required');
      await expect(WishlistService.isAgentInWishlists('user-123', null)).rejects.toThrow('User ID and agent ID are required');
    });
  });
}); 