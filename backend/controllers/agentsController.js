const admin = require('firebase-admin');
const db = admin.firestore ? admin.firestore() : null;
const cache = require('../utils/cache');

// Cache keys
const CACHE_KEYS = {
  AGENTS: 'agents',
  FEATURED: 'featured_agents',
  AGENT: 'agent_',
  WISHLISTS: 'user_wishlists_',
  WISHLIST: 'wishlist_'
};

// Mock data for development
const generateMockAgents = (count = 20, category = 'All', filter = 'Hot & Now') => {
  const categories = ['Design', '3D', 'Business', 'Audio', 'Video', 'Development', 'Writing'];
  const agents = [];
  
  for (let i = 1; i <= count; i++) {
    const isFree = Math.random() > 0.7;
    const categoryName = category === 'All' ? 
      categories[Math.floor(Math.random() * categories.length)] : 
      category;
      
    agents.push({
      id: `agent-${i}`,
      name: `Agent ${i}`,
      description: `AI agent for ${categoryName} tasks, helping with various workflows and automations.`,
      imageUrl: `https://picsum.photos/300/200?random=${i}`,
      category: categoryName,
      price: isFree ? 0 : Math.floor(Math.random() * 100) + 5,
      isFree: isFree,
      rating: (Math.random() * 2 + 3).toFixed(1),
      reviewCount: Math.floor(Math.random() * 1000) + 10,
      dateCreated: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
      popularity: Math.floor(Math.random() * 100),
      creator: {
        id: `creator-${Math.floor(Math.random() * 10) + 1}`,
        name: `Creator ${String.fromCharCode(65 + Math.floor(Math.random() * 8))}`,
        avatar: `https://picsum.photos/50/50?random=${Math.floor(Math.random() * 100)}`
      }
    });
  }
  
  // Apply filter logic
  if (filter === 'Hot & Now') {
    agents.sort((a, b) => b.popularity - a.popularity);
  } else if (filter === 'Free') {
    return agents.filter(agent => agent.isFree);
  } else if (filter === 'Newest') {
    agents.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
  } else if (filter === 'Top Rated') {
    agents.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
  }
  
  return agents;
};

const generateMockFeaturedAgents = (count = 8) => {
  const agents = generateMockAgents(count);
  return agents.map(agent => ({
    ...agent,
    featured: true,
    popularity: agent.popularity + 50 // Featured agents are more popular
  }));
};

const generateMockWishlists = () => {
  const mockAgents = generateMockAgents(16);
  
  return [
    {
      id: 'wishlist-1',
      name: 'My Favorite Tools',
      description: 'Collection of productivity tools',
      isPublic: true,
      dateCreated: new Date(Date.now() - 5000000000),
      creator: {
        id: 'user-1',
        name: 'User One',
        avatar: 'https://picsum.photos/50/50?random=user1'
      },
      items: mockAgents.slice(0, 4).map(agent => ({
        id: agent.id,
        imageUrl: agent.imageUrl,
        name: agent.name
      }))
    },
    {
      id: 'wishlist-2',
      name: 'Design Resources',
      description: 'Essential design tools and assets',
      isPublic: true,
      dateCreated: new Date(Date.now() - 3000000000),
      creator: {
        id: 'user-2',
        name: 'User Two',
        avatar: 'https://picsum.photos/50/50?random=user2'
      },
      items: mockAgents.slice(4, 8).map(agent => ({
        id: agent.id,
        imageUrl: agent.imageUrl,
        name: agent.name
      }))
    },
    {
      id: 'wishlist-3',
      name: 'Development Stack',
      description: 'Coding and development agents',
      isPublic: true,
      dateCreated: new Date(Date.now() - 1000000000),
      creator: {
        id: 'user-3',
        name: 'User Three',
        avatar: 'https://picsum.photos/50/50?random=user3'
      },
      items: mockAgents.slice(8, 12).map(agent => ({
        id: agent.id,
        imageUrl: agent.imageUrl,
        name: agent.name
      }))
    },
    {
      id: 'wishlist-4',
      name: 'Content Creation',
      description: 'Tools for creating amazing content',
      isPublic: true,
      dateCreated: new Date(Date.now() - 500000000),
      creator: {
        id: 'user-4',
        name: 'User Four',
        avatar: 'https://picsum.photos/50/50?random=user4'
      },
      items: mockAgents.slice(12, 16).map(agent => ({
        id: agent.id, 
        imageUrl: agent.imageUrl,
        name: agent.name
      }))
    }
  ];
};

// Get all agents with filtering
const getAgents = async (req, res) => {
  try {
    const { category = 'All', filter = 'Hot & Now', page = 1, limit = 20, search = '' } = req.query;
    
    // In a production environment, we would:
    // 1. Check cache
    // 2. Query database if not in cache
    // 3. Store results in cache
    
    // For development, use mock data
    let mockAgents = generateMockAgents(parseInt(limit) * 3, category, filter);
    
    // Apply search filter if provided
    if (search) {
      mockAgents = mockAgents.filter(agent => 
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.description.toLowerCase().includes(search.toLowerCase()) ||
        agent.creator.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedAgents = mockAgents.slice(startIndex, endIndex);
    
    const result = {
      agents: paginatedAgents,
      page: parseInt(page),
      limit: parseInt(limit),
      total: mockAgents.length,
      hasMore: endIndex < mockAgents.length
    };
    
    return res.json(result);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return res.status(500).json({ error: 'Failed to fetch agents' });
  }
};

// Get featured agents
const getFeaturedAgents = async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    
    // For development, use mock data
    const featuredAgents = generateMockFeaturedAgents(parseInt(limit));
    
    return res.json(featuredAgents);
  } catch (error) {
    console.error('Error fetching featured agents:', error);
    return res.status(500).json({ error: 'Failed to fetch featured agents' });
  }
};

// Get individual agent by ID
const getAgentById = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // For development, generate a specific agent
    const mockAgents = generateMockAgents(50);
    const agent = mockAgents.find(a => a.id === agentId) || 
                  { 
                    id: agentId,
                    name: `Agent ${agentId.split('-')[1] || 'Detail'}`,
                    description: 'This is a detailed view of the agent with comprehensive information about its capabilities, use cases, and benefits.',
                    longDescription: `
                      <h2>About This Agent</h2>
                      <p>This AI-powered agent helps you accomplish tasks faster and more efficiently. It integrates with your workflow to automate repetitive tasks, provide insights, and enhance your productivity.</p>
                      
                      <h2>Key Features</h2>
                      <ul>
                        <li>Automated workflow integration</li>
                        <li>Smart content generation</li>
                        <li>Data analysis and visualization</li>
                        <li>Custom settings and preferences</li>
                        <li>Export options in multiple formats</li>
                      </ul>
                      
                      <h2>Use Cases</h2>
                      <p>This agent is perfect for professionals who need to:</p>
                      <ul>
                        <li>Streamline their creative process</li>
                        <li>Generate content ideas quickly</li>
                        <li>Analyze large datasets efficiently</li>
                        <li>Automate repetitive tasks</li>
                      </ul>
                    `,
                    imageUrl: `https://picsum.photos/600/400?random=${agentId}`,
                    category: 'Productivity',
                    price: 29.99,
                    isFree: false,
                    rating: 4.7,
                    reviewCount: 238,
                    dateCreated: new Date(Date.now() - 30000000),
                    popularity: 95,
                    requirements: 'Works with all major browsers and operating systems',
                    creator: {
                      id: 'creator-special',
                      name: 'AI Wave Rider Team',
                      avatar: 'https://picsum.photos/50/50?random=special',
                      bio: 'We create cutting-edge AI tools to enhance your productivity and creativity.'
                    },
                    reviews: [
                      {
                        id: 'review-1',
                        user: {
                          name: 'John D.',
                          avatar: 'https://picsum.photos/50/50?random=rev1'
                        },
                        rating: 5,
                        date: new Date(Date.now() - 5000000),
                        text: 'Absolutely incredible tool! Has completely transformed my workflow.'
                      },
                      {
                        id: 'review-2',
                        user: {
                          name: 'Sarah M.',
                          avatar: 'https://picsum.photos/50/50?random=rev2'
                        },
                        rating: 4,
                        date: new Date(Date.now() - 15000000),
                        text: 'Very useful for my daily tasks. Would recommend to colleagues.'
                      },
                      {
                        id: 'review-3',
                        user: {
                          name: 'Michael R.',
                          avatar: 'https://picsum.photos/50/50?random=rev3'
                        },
                        rating: 5,
                        date: new Date(Date.now() - 25000000),
                        text: 'Best investment I made this year for my productivity!'
                      }
                    ],
                    relatedAgents: generateMockAgents(4)
                  };
    
    return res.json(agent);
  } catch (error) {
    console.error(`Error fetching agent ${req.params.agentId}:`, error);
    return res.status(500).json({ error: 'Failed to fetch agent details' });
  }
};

// Get user's wishlists
const getWishlists = async (req, res) => {
  try {
    // For development, use mock data
    const wishlists = generateMockWishlists();
    
    return res.json(wishlists);
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    return res.status(500).json({ error: 'Failed to fetch wishlists' });
  }
};

// Get detailed wishlist by ID
const getWishlistById = async (req, res) => {
  try {
    const { wishlistId } = req.params;
    
    // For development, use mock data
    const wishlists = generateMockWishlists();
    const wishlist = wishlists.find(w => w.id === wishlistId);
    
    if (!wishlist) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }
    
    return res.json(wishlist);
  } catch (error) {
    console.error(`Error fetching wishlist ${req.params.wishlistId}:`, error);
    return res.status(500).json({ error: 'Failed to fetch wishlist details' });
  }
};

// Toggle agent in wishlist (add or remove)
const toggleWishlist = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // In a production environment, this would update the database
    // For development, just return a success response
    
    return res.json({ 
      success: true,
      action: Math.random() > 0.5 ? 'added' : 'removed',
      agentId
    });
  } catch (error) {
    console.error(`Error toggling wishlist for agent ${req.params.agentId}:`, error);
    return res.status(500).json({ error: 'Failed to update wishlist' });
  }
};

module.exports = {
  getAgents,
  getFeaturedAgents,
  getAgentById,
  getWishlists,
  getWishlistById,
  toggleWishlist
}; 