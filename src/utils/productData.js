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
  return products
    .sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount)
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