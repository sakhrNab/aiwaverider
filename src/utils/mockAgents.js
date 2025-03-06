/**
 * Generate mock agents for development and testing
 * @param {number} count - Number of agents to generate
 * @returns {Array} - Array of mock agent objects
 */
export const generateMockAgents = (count) => {
  // Categories that might match the ones in the filter
  const categories = ['Design', 'Drawing & Painting', '3D', 'Self Improvement', 
    'Music & Sound Design', 'Software Development', 'Business'];
  
  // Create consistent price formats - either numbers or properly formatted strings
  const createPrice = (index) => {
    // Make 20% of agents free
    if (index % 5 === 0) {
      return 0; // Numeric 0 for free agents
    }
    
    // Subscription agents (10%)
    if (index % 10 === 3) {
      const price = 5 + Math.floor(Math.random() * 20); // $5-$25 range
      return `$${price}/month`;
    }
    
    // Regular priced agents (70%)
    const price = 5 + Math.floor(Math.random() * 95); // $5-$100 range
    return price; // Return as a number for consistency
  };

  // Create tags list - each agent will get a random subset
  const allTags = [
    'Design', 'Art', 'Productivity', 'Writing', 'Education', 
    'Business', 'Entertainment', 'AI', 'Assistant', 'Creativity'
  ];
  
  // Create features list - each agent will get a random subset
  const allFeatures = [
    'API Access', 'Customizable', 'Mobile Compatible', 'Desktop App',
    'Web Interface', 'Voice Enabled', 'Free', 'Subscription'
  ];

  return Array(count).fill().map((_, i) => ({
    id: `agent-${i+1}`,
    title: `AI Agent ${i+1}`,
    name: `Agent ${i+1}`,
    price: createPrice(i),
    imageUrl: `https://picsum.photos/300/200?random=${i+100}`,
    isWishlisted: Math.random() > 0.8,
    isBestseller: Math.random() > 0.85,
    isNew: Math.random() > 0.9,
    category: categories[Math.floor(Math.random() * categories.length)],
    // Add random tags from the list (1-3 tags)
    tags: [...allTags].sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1),
    // Add random features from the list (1-3 features)
    features: [...allFeatures].sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1),
    // Optional popularity score for trending sort (1-100)
    popularity: Math.floor(Math.random() * 100) + 1,
    creator: {
      id: `creator-${i}`,
      name: i === 0 ? '168flyerchess' : 
            i === 1 ? 'Seth Hesh' : 
            i === 2 ? 'Seth Hesh' :
            i === 3 ? 'Trishonna' :
            i === 4 ? 'Jordi Bruin' :
            i === 5 ? 'Marketplace Creator' :
            `Creator ${i+1}`,
      avatar: `https://picsum.photos/50/50?random=${i+200}`
    },
    rating: {
      average: (4 + Math.random()).toFixed(1),
      count: Math.floor(Math.random() * 1000) + 10
    },
    description: `This is a description for agent ${i+1}. It showcases the agent's capabilities.`
  }));
};

/**
 * Generate mock wishlists for development and testing
 * @returns {Array} - Array of mock wishlist objects
 */
export const generateMockWishlists = () => {
  // Categories that might match user interests
  const categories = ['Design', 'Drawing & Painting', '3D', 'Self Improvement', 'Music & Sound Design', 'Software Development', 'Business'];
  
  // Create wishlists with more personalized names and items
  return [
    {
      id: 'wishlist-1',
      name: 'Essential Design Tools',
      category: 'Design',
      creator: {
        id: 'user-1',
        name: 'John Doe',
        avatar: 'https://picsum.photos/50/50?random=w1'
      },
      items: [
        {
          id: 'agent-101',
          name: 'Brand Designer Pro',
          imageUrl: 'https://picsum.photos/100/100?random=101'
        },
        {
          id: 'agent-102',
          name: 'Color Palette Generator',
          imageUrl: 'https://picsum.photos/100/100?random=102'
        },
        {
          id: 'agent-103',
          name: 'Logo Maker AI',
          imageUrl: 'https://picsum.photos/100/100?random=103'
        }
      ]
    },
    {
      id: 'wishlist-2',
      name: 'Coding Assistants',
      category: 'Software Development',
      creator: {
        id: 'user-2',
        name: 'Jane Smith',
        avatar: 'https://picsum.photos/50/50?random=w2'
      },
      items: [
        {
          id: 'agent-201',
          name: 'Full-Stack Helper',
          imageUrl: 'https://picsum.photos/100/100?random=201'
        },
        {
          id: 'agent-202',
          name: 'React Component Generator',
          imageUrl: 'https://picsum.photos/100/100?random=202'
        }
      ]
    },
    {
      id: 'wishlist-3',
      name: 'Creative Writing Tools',
      category: 'Writing',
      creator: {
        id: 'user-3',
        name: 'Sam Johnson',
        avatar: 'https://picsum.photos/50/50?random=w3'
      },
      items: [
        {
          id: 'agent-301',
          name: 'Story Plotter',
          imageUrl: 'https://picsum.photos/100/100?random=301'
        },
        {
          id: 'agent-302',
          name: 'Character Developer',
          imageUrl: 'https://picsum.photos/100/100?random=302'
        },
        {
          id: 'agent-303',
          name: 'Dialogue Writer',
          imageUrl: 'https://picsum.photos/100/100?random=303'
        }
      ]
    }
  ];
}; 