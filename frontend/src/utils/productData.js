// Sample product data for our store
export const products = [
  {
    id: 'resume-template',
    title: 'Resume Template (Google Docs editable version)',
    description: 'A professional resume template that you can edit in Google Docs. Perfect for job seekers looking to stand out.',
    price: 9.99,
    imageUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop',
    category: 'Templates',
    creator: {
      name: 'Jeff Su',
      id: 'jeff-su',
      avatar: 'https://randomuser.me/api/portraits/men/42.jpg'
    },
    rating: 4.8,
    ratingCount: 325
  },
  {
    id: 'chatgpt-prompts',
    title: 'ChatGPT Prompts to Increase Productivity (37 Ways)',
    description: 'Boost your productivity with these 37 carefully crafted prompts for ChatGPT.',
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1669023270661-7a702ec2d216?w=600&auto=format&fit=crop',
    category: 'AI Tools',
    creator: {
      name: 'Jeff Su',
      id: 'jeff-su',
      avatar: 'https://randomuser.me/api/portraits/men/42.jpg'
    },
    rating: 4.9,
    ratingCount: 257
  },
  {
    id: 'how-to-build-kickass-slides',
    title: 'How to Build Kickass Slides (60-page playbook)',
    description: 'A comprehensive 60-page playbook that teaches you how to create stunning presentation slides.',
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1558403194-611308249627?w=600&auto=format&fit=crop',
    category: 'Playbooks',
    creator: {
      name: 'Hemp Lee',
      id: 'hemp-lee',
      avatar: 'https://randomuser.me/api/portraits/men/37.jpg'
    },
    rating: 4.7,
    ratingCount: 189
  },
  {
    id: 'agent-startup-guide',
    title: 'Agent Start-up Guide (Deutsch)',
    description: 'A comprehensive guide in German for starting up with AI agents.',
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1679692363620-d774a6cd92e9?w=600&auto=format&fit=crop',
    category: 'Guides',
    creator: {
      name: 'Jeff Su',
      id: 'jeff-su',
      avatar: 'https://randomuser.me/api/portraits/men/42.jpg'
    },
    rating: 4.6,
    ratingCount: 142
  },
  {
    id: 'chatgpt-prompts-job-search',
    title: 'ChatGPT Prompts for Job Search',
    description: 'Effective prompts to help you leverage ChatGPT in your job search.',
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1664575196412-ed801e8333a1?w=600&auto=format&fit=crop',
    category: 'AI Tools',
    creator: {
      name: 'Jeff Su',
      id: 'jeff-su',
      avatar: 'https://randomuser.me/api/portraits/men/42.jpg'
    },
    rating: 5.0,
    ratingCount: 257
  },
  {
    id: 'notion-daily-planner',
    title: 'A Productive Notion Daily Planner (2023 Version)',
    description: 'Organize your day effectively with this Notion template for daily planning.',
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&auto=format&fit=crop',
    category: 'Templates',
    creator: {
      name: 'Jeff Su',
      id: 'jeff-su',
      avatar: 'https://randomuser.me/api/portraits/men/42.jpg'
    },
    rating: 4.9,
    ratingCount: 335
  },
  {
    id: 'jeff-resumes',
    title: 'Jeff\'s Resumes (Free PDF Version)',
    description: 'A collection of professionally designed resume templates in PDF format.',
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1517436073-3b3b97825ac4?w=600&auto=format&fit=crop',
    category: 'Templates',
    creator: {
      name: 'Jeff Su',
      id: 'jeff-su',
      avatar: 'https://randomuser.me/api/portraits/men/42.jpg'
    },
    rating: 4.8,
    ratingCount: 288
  },
  {
    id: 'cover-letter-templates',
    title: 'Jeff Su\'s Cover Letter Templates (PDF Version)',
    description: 'Professional cover letter templates to help you land your dream job.',
    price: 4.99,
    imageUrl: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=600&auto=format&fit=crop',
    category: 'Templates',
    creator: {
      name: 'Jeff Su',
      id: 'jeff-su',
      avatar: 'https://randomuser.me/api/portraits/men/42.jpg'
    },
    rating: 4.7,
    ratingCount: 237
  },
  {
    id: 'chatgpt-yourself',
    title: 'Tell Me About Yourself (using ChatGPT)',
    description: 'Learn how to craft the perfect "tell me about yourself" response with ChatGPT.',
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1678451270811-90cfd534c032?w=600&auto=format&fit=crop',
    category: 'AI Tools',
    creator: {
      name: 'Jeff Su',
      id: 'jeff-su',
      avatar: 'https://randomuser.me/api/portraits/men/42.jpg'
    },
    rating: 4.6,
    ratingCount: 193
  },
  {
    id: 'first-90-days',
    title: 'The First 90 Days Exercise (Google Sheet template)',
    description: 'A structured plan to help you succeed in your first 90 days at a new job.',
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1583912086096-8c60d75a53f9?w=600&auto=format&fit=crop',
    category: 'Templates',
    creator: {
      name: 'Hemp Lee',
      id: 'hemp-lee',
      avatar: 'https://randomuser.me/api/portraits/men/37.jpg'
    },
    rating: 4.9,
    ratingCount: 276
  }
];

// Make sure each product has a compatible interface with agents
products.forEach((product, index) => {
  // Ensure each product has properties expected by the agent interface
  if (!product.rating.average && product.rating) {
    product.rating = {
      average: product.rating,
      count: product.ratingCount || 0
    };
    delete product.ratingCount;
  }
  
  // Add detailUrl property
  product.detailUrl = `/agents/${product.id}`;
  
  // Add product attributes for recommendation system
  // First two products are bestsellers
  if (index < 2) {
    product.isBestseller = true;
  }
  
  // Products with high ratings are trending
  if (product.rating?.average > 4.8 || (typeof product.rating === 'number' && product.rating > 4.8)) {
    product.isTrending = true;
  }
  
  // Last two products are new
  if (index >= products.length - 2) {
    product.isNew = true;
  }
  
  // First product in each category is featured
  const productsInCategory = products.filter(p => p.category === product.category);
  if (productsInCategory.indexOf(product) === 0) {
    product.isFeatured = true;
  }
});

// Get a product by ID
export const getProductById = (id) => {
  return products.find(product => product.id === id);
};

// Get related products (excluding the current product)
export const getRelatedProducts = (id, limit = 3) => {
  const currentProduct = getProductById(id);
  if (!currentProduct) return [];
  
  // Get products in the same category
  const sameCategory = products.filter(product => 
    product.id !== id && product.category === currentProduct.category
  );
  
  // Get products by the same creator
  const sameCreator = products.filter(product => 
    product.id !== id && product.creator.id === currentProduct.creator.id
  );
  
  // Combine and remove duplicates
  const combined = [...new Set([...sameCategory, ...sameCreator])];
  
  // Return random selection up to the limit
  return combined
    .sort(() => 0.5 - Math.random())
    .slice(0, limit);
};

// Get featured products
export const getFeaturedProducts = (limit = 4) => {
  // First make sure none of the products are debug recommendations
  const validProducts = products.filter(
    product => 
      product.title && 
      typeof product.title === 'string' && 
      !product.title.includes('Debug Recommendation')
  );
  
  // Sort by rating and return top limit
  return validProducts
    .sort((a, b) => {
      // Get rating values, handling both number and object formats
      const ratingA = a.rating?.average || a.rating || 0;
      const ratingB = b.rating?.average || b.rating || 0;
      
      // Sort by rating first, then by number of ratings (popularity)
      return ratingB - ratingA || 
        (b.rating?.count || b.ratingCount || 0) - 
        (a.rating?.count || a.ratingCount || 0);
    })
    .slice(0, limit);
};

// Search products
export const searchProducts = (query) => {
  const lowercaseQuery = query.toLowerCase();
  return products.filter(product => 
    product.title.toLowerCase().includes(lowercaseQuery) ||
    product.description.toLowerCase().includes(lowercaseQuery) ||
    product.category.toLowerCase().includes(lowercaseQuery) ||
    product.creator.name.toLowerCase().includes(lowercaseQuery)
  );
};

// Create array to add any debug recommendations we need to correct
const debugRecommendations = products.filter(product => 
  product.title && 
  typeof product.title === 'string' && 
  product.title.includes('Debug Recommendation')
);

// If we found any debug recommendations, replace them with proper data
if (debugRecommendations.length > 0) {
  console.log('Found and fixing debug recommendations in productData.js');
  
  // Replace each debug recommendation with a valid agent
  debugRecommendations.forEach(debugRec => {
    const index = products.findIndex(p => p.id === debugRec.id);
    if (index !== -1) {
      // Replace with a properly formatted product
      products[index] = {
        id: debugRec.id,
        title: `AI ${debugRec.id.split('-').pop()} Assistant`,
        description: 'An AI assistant to help with your tasks',
        price: debugRec.price || 9.99,
        imageUrl: debugRec.imageUrl || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop',
        category: 'AI Tools',
        creator: {
          name: 'AI Waverider',
          id: 'ai-wave-rider',
          avatar: 'https://randomuser.me/api/portraits/men/22.jpg'
        },
        rating: {
          average: 4.5,
          count: 120
        },
        detailUrl: `/agents/${debugRec.id}`
      };
    }
  });
} 

/**
 * Get products with similar attributes to the purchased products
 * 
 * @param {Array} purchasedItems - Array of products that were purchased
 * @param {number} limit - Maximum number of recommendations to return
 * @returns {Array} Array of recommended products
 */
export const getSimilarProductRecommendations = (purchasedItems = [], limit = 3) => {
  if (!Array.isArray(purchasedItems) || purchasedItems.length === 0) {
    return getFeaturedProducts(limit); // Fallback to featured products if no purchases
  }

  // Extract categories, and other product attributes from purchased items
  const purchasedCategories = new Set();
  const purchasedCreators = new Set();
  const attributes = {
    isBestseller: false,
    isTrending: false,
    isNew: false,
    isFeatured: false
  };
  
  // Collect information from purchased items
  purchasedItems.forEach(item => {
    if (!item) return;
    
    // Add category and creator
    if (item.category) purchasedCategories.add(item.category);
    if (item.creator?.id) purchasedCreators.add(item.creator.id);
    
    // Track attributes
    if (item.isBestseller) attributes.isBestseller = true;
    if (item.isTrending) attributes.isTrending = true;
    if (item.isNew) attributes.isNew = true;
    if (item.isFeatured) attributes.isFeatured = true;
  });

  // Find products that match either by category, creator, or attributes
  const matchingProducts = products.filter(product => {
    // Skip the products that were already purchased
    if (purchasedItems.some(item => item && item.id === product.id)) return false;
    
    // Check if product matches any criteria
    const matchesCategory = product.category && purchasedCategories.has(product.category);
    const matchesCreator = product.creator?.id && purchasedCreators.has(product.creator.id);
    
    // Check if product matches any of the attributes we're looking for
    const matchesAttributes = (
      (attributes.isBestseller && product.isBestseller) ||
      (attributes.isTrending && product.isTrending) ||
      (attributes.isNew && product.isNew) ||
      (attributes.isFeatured && product.isFeatured)
    );
    
    return matchesCategory || matchesCreator || matchesAttributes;
  });
  
  // If we don't have enough matches, get some by ratings
  if (matchingProducts.length < limit) {
    const highRatedProducts = products
      .filter(product => 
        !purchasedItems.some(item => item && item.id === product.id) && 
        !matchingProducts.some(item => item.id === product.id)
      )
      .sort((a, b) => {
        const ratingA = a.rating?.average || a.rating || 0;
        const ratingB = b.rating?.average || b.rating || 0;
        return ratingB - ratingA;
      })
      .slice(0, limit - matchingProducts.length);
    
    matchingProducts.push(...highRatedProducts);
  }
  
  // Randomize and limit the results
  return matchingProducts
    .sort(() => 0.5 - Math.random())
    .slice(0, limit);
}; 