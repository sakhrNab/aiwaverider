/**
 * Tests for Agent Service
 */

const { jest: jestConfig } = require('@jest/globals');

// Create mocks
const mockAgentRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIds: jest.fn(),
  search: jest.fn(),
  findFeatured: jest.fn(),
  findByCategory: jest.fn(),
  findSimilar: jest.fn(),
  findTopRated: jest.fn(),
  findNewest: jest.fn(),
  findByCreator: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock the repository and logger
jest.mock('../../../repositories/agentRepository', () => mockAgentRepository);
jest.mock('../../../utils/logger', () => mockLogger);

// Import the service after mocking
const AgentService = require('../../../services/agent/agentService');

describe('Agent Service', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllAgents', () => {
    it('should get all agents with pagination and filtering', async () => {
      // Setup
      const mockResult = {
        agents: [
          { id: 'agent-1', name: 'Agent 1' },
          { id: 'agent-2', name: 'Agent 2' }
        ],
        totalCount: 2,
        page: 1,
        totalPages: 1
      };
      mockAgentRepository.findAll.mockResolvedValue(mockResult);
      
      const options = {
        limit: 10,
        offset: 0,
        filters: { category: 'AI' }
      };
      
      // Execute
      const result = await AgentService.getAllAgents(options);
      
      // Verify
      expect(mockAgentRepository.findAll).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockResult);
    });

    it('should handle repository errors', async () => {
      // Setup
      mockAgentRepository.findAll.mockRejectedValue(new Error('Database error'));
      
      // Execute & Verify
      await expect(AgentService.getAllAgents()).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getAgentById', () => {
    it('should get an agent by ID', async () => {
      // Setup
      const mockAgent = { id: 'agent-123', name: 'Test Agent' };
      mockAgentRepository.findById.mockResolvedValue(mockAgent);
      
      // Execute
      const agent = await AgentService.getAgentById('agent-123');
      
      // Verify
      expect(mockAgentRepository.findById).toHaveBeenCalledWith('agent-123');
      expect(agent).toEqual(mockAgent);
    });

    it('should throw an error if agent is not found', async () => {
      // Setup
      mockAgentRepository.findById.mockResolvedValue(null);
      
      // Execute & Verify
      await expect(AgentService.getAgentById('non-existent')).rejects.toThrow('Agent not found');
      expect(mockAgentRepository.findById).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('getAgentsByIds', () => {
    it('should get multiple agents by their IDs', async () => {
      // Setup
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1' },
        { id: 'agent-2', name: 'Agent 2' }
      ];
      mockAgentRepository.findByIds.mockResolvedValue(mockAgents);
      
      const agentIds = ['agent-1', 'agent-2'];
      
      // Execute
      const agents = await AgentService.getAgentsByIds(agentIds);
      
      // Verify
      expect(mockAgentRepository.findByIds).toHaveBeenCalledWith(agentIds);
      expect(agents).toEqual(mockAgents);
    });
  });

  describe('searchAgents', () => {
    it('should search for agents by query', async () => {
      // Setup
      const mockResult = {
        agents: [
          { id: 'agent-1', name: 'Smart Agent' },
          { id: 'agent-2', name: 'Smart Assistant' }
        ],
        totalCount: 2,
        page: 1,
        totalPages: 1
      };
      mockAgentRepository.search.mockResolvedValue(mockResult);
      
      const query = 'smart';
      const options = { limit: 10, offset: 0 };
      
      // Execute
      const result = await AgentService.searchAgents(query, options);
      
      // Verify
      expect(mockAgentRepository.search).toHaveBeenCalledWith(query, options);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getFeaturedAgents', () => {
    it('should get featured agents', async () => {
      // Setup
      const mockAgents = [
        { id: 'agent-1', name: 'Featured Agent 1', featured: true },
        { id: 'agent-2', name: 'Featured Agent 2', featured: true }
      ];
      mockAgentRepository.findFeatured.mockResolvedValue(mockAgents);
      
      const limit = 5;
      
      // Execute
      const featuredAgents = await AgentService.getFeaturedAgents(limit);
      
      // Verify
      expect(mockAgentRepository.findFeatured).toHaveBeenCalledWith(limit);
      expect(featuredAgents).toEqual(mockAgents);
    });
  });

  describe('getAgentsByCategory', () => {
    it('should get agents grouped by category', async () => {
      // Setup
      const mockResults = {
        'AI': [
          { id: 'agent-1', name: 'AI Agent 1', category: 'AI' },
          { id: 'agent-2', name: 'AI Agent 2', category: 'AI' }
        ],
        'Finance': [
          { id: 'agent-3', name: 'Finance Agent', category: 'Finance' }
        ]
      };
      mockAgentRepository.findByCategory.mockResolvedValue(mockResults);
      
      const limit = 5;
      
      // Execute
      const agentsByCategory = await AgentService.getAgentsByCategory(limit);
      
      // Verify
      expect(mockAgentRepository.findByCategory).toHaveBeenCalledWith(limit);
      expect(agentsByCategory).toEqual(mockResults);
    });
  });

  describe('getSimilarAgents', () => {
    it('should get agents similar to a specific agent', async () => {
      // Setup
      const mockAgent = { 
        id: 'agent-123', 
        name: 'Test Agent', 
        category: 'AI' 
      };
      
      const mockSimilarAgents = [
        { id: 'agent-456', name: 'Similar Agent 1', category: 'AI' },
        { id: 'agent-789', name: 'Similar Agent 2', category: 'AI' }
      ];
      
      mockAgentRepository.findById.mockResolvedValue(mockAgent);
      mockAgentRepository.findSimilar.mockResolvedValue(mockSimilarAgents);
      
      const limit = 4;
      
      // Execute
      const similarAgents = await AgentService.getSimilarAgents('agent-123', limit);
      
      // Verify
      expect(mockAgentRepository.findById).toHaveBeenCalledWith('agent-123');
      expect(mockAgentRepository.findSimilar).toHaveBeenCalledWith(mockAgent, limit);
      expect(similarAgents).toEqual(mockSimilarAgents);
    });

    it('should throw an error if the reference agent is not found', async () => {
      // Setup
      mockAgentRepository.findById.mockResolvedValue(null);
      
      // Execute & Verify
      await expect(AgentService.getSimilarAgents('non-existent')).rejects.toThrow('Agent not found');
    });
  });

  describe('getTopRatedAgents', () => {
    it('should get the top rated agents', async () => {
      // Setup
      const mockTopAgents = [
        { id: 'agent-1', name: 'Top Agent 1', rating: 5 },
        { id: 'agent-2', name: 'Top Agent 2', rating: 4.9 }
      ];
      mockAgentRepository.findTopRated.mockResolvedValue(mockTopAgents);
      
      const limit = 10;
      
      // Execute
      const topAgents = await AgentService.getTopRatedAgents(limit);
      
      // Verify
      expect(mockAgentRepository.findTopRated).toHaveBeenCalledWith(limit);
      expect(topAgents).toEqual(mockTopAgents);
    });
  });

  describe('getNewestAgents', () => {
    it('should get the newest agents', async () => {
      // Setup
      const mockNewestAgents = [
        { id: 'agent-1', name: 'New Agent 1', createdAt: '2025-01-02' },
        { id: 'agent-2', name: 'New Agent 2', createdAt: '2025-01-01' }
      ];
      mockAgentRepository.findNewest.mockResolvedValue(mockNewestAgents);
      
      const limit = 10;
      
      // Execute
      const newestAgents = await AgentService.getNewestAgents(limit);
      
      // Verify
      expect(mockAgentRepository.findNewest).toHaveBeenCalledWith(limit);
      expect(newestAgents).toEqual(mockNewestAgents);
    });
  });

  describe('getAgentsByCreator', () => {
    it('should get agents by a specific creator', async () => {
      // Setup
      const mockResult = {
        agents: [
          { id: 'agent-1', name: 'Agent 1', creatorId: 'creator-123' },
          { id: 'agent-2', name: 'Agent 2', creatorId: 'creator-123' }
        ],
        totalCount: 2,
        page: 1,
        totalPages: 1
      };
      mockAgentRepository.findByCreator.mockResolvedValue(mockResult);
      
      const creatorId = 'creator-123';
      const options = { limit: 10, offset: 0 };
      
      // Execute
      const result = await AgentService.getAgentsByCreator(creatorId, options);
      
      // Verify
      expect(mockAgentRepository.findByCreator).toHaveBeenCalledWith(creatorId, options);
      expect(result).toEqual(mockResult);
    });
  });
}); 