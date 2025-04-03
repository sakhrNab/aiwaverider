console.log('Loading agentsController.js');

// Import necessary modules
const { db, admin } = require('../config/firebase');

// Cache keys for consistent cache handling
const CACHE_KEYS = {
  AGENTS: 'agents',
  FEATURED: 'featured_agents',
  AGENT: 'agent_',
  WISHLISTS: 'user_wishlists_',
  WISHLIST: 'wishlist_'
};

// Cache TTL for agents (5 minutes)
const AGENTS_CACHE_TTL = 5 * 60;

/**
 * Get all agents with optional filtering
 */
const getAgents = async (req, res) => {
  try {
    const {
      category = 'All',
      filter = 'Hot & Now',
      priceMin,
      priceMax,
      rating,
      tags,
      features,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Create cache key based on request parameters
    const cacheKey = `${CACHE_KEYS.AGENTS}:${category}:${filter}:${priceMin || 0}:${priceMax || 'max'}:${rating || 0}:${tags || ''}:${features || ''}:${search || ''}:${page}:${limit}`;
    
    // Build query
    let query = db.collection('agents');
    
    // Apply category filter
    if (category && category !== 'All') {
      query = query.where('category', '==', category);
    }

    // Get documents
    let agentsSnapshot = await query.get();
    let agents = [];

    agentsSnapshot.forEach(doc => {
      agents.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Apply other filters in-memory (since Firestore has limitations with complex queries)
    
    // If the filter is 'Free', only return free agents
    if (filter === 'Free') {
      agents = agents.filter(agent => {
        if (typeof agent.price === 'number') {
          return agent.price === 0;
        }
        if (typeof agent.price === 'string') {
          const lowerPrice = agent.price.toLowerCase();
          return lowerPrice === 'free' || lowerPrice === '$0' || lowerPrice === '0';
        }
        return false;
      });
    }
    
    // Apply price filter
    if (priceMin !== undefined || priceMax !== undefined) {
      const min = priceMin ? parseFloat(priceMin) : 0;
      const max = priceMax ? parseFloat(priceMax) : Infinity;
      
      agents = agents.filter(agent => {
        let price = agent.price;
        if (typeof price === 'string') {
          // Extract number from string like "$25" or "$25/month"
          const numValue = parseFloat(price.replace(/[^0-9.]/g, ''));
          if (!isNaN(numValue)) {
            price = numValue;
          }
        }
        return price >= min && price <= max;
      });
    }

    // Apply rating filter
    if (rating) {
      const minRating = parseFloat(rating);
      agents = agents.filter(agent => {
        const agentRating = agent.rating?.average ? parseFloat(agent.rating.average) : 0;
        return agentRating >= minRating;
      });
    }

    // Apply tag filters
    if (tags) {
      const tagsList = tags.split(',');
      agents = agents.filter(agent => {
        // Check if category matches any tag
        if (agent.category && tagsList.includes(agent.category)) {
          return true;
        }
        
        // Check agent tags if available
        if (agent.tags && Array.isArray(agent.tags)) {
          return agent.tags.some(tag => tagsList.includes(tag));
        }
        
        return false;
      });
    }

    // Apply feature filters
    if (features) {
      const featuresList = features.split(',');
      agents = agents.filter(agent => {
        // Check for 'Free' feature
        if (featuresList.includes('Free') && 
            (agent.price === 0 || agent.price === '0' || 
             agent.price === 'Free' || agent.price === '$0')) {
          return true;
        }
        
        // Check for 'Subscription' feature
        if (featuresList.includes('Subscription') && 
            typeof agent.price === 'string' && 
            (agent.price.includes('/month') || agent.price.includes('a month'))) {
          return true;
        }
        
        // Check other features
        if (agent.features && Array.isArray(agent.features)) {
          return agent.features.some(feature => featuresList.includes(feature));
        }
        
        return false;
      });
    }

    // Apply search filter
    if (search) {
      const searchQuery = search.toLowerCase().trim();
      agents = agents.filter(agent => 
        (agent.name && agent.name.toLowerCase().includes(searchQuery)) ||
        (agent.title && agent.title.toLowerCase().includes(searchQuery)) ||
        (agent.description && agent.description.toLowerCase().includes(searchQuery)) ||
        (agent.creator && agent.creator.name && 
         agent.creator.name.toLowerCase().includes(searchQuery))
      );
    }

    // Apply sorting based on filter type
    if (filter === 'Hot & Now') {
      agents.sort((a, b) => b.popularity - a.popularity);
    } else if (filter === 'Top Rated') {
      agents.sort((a, b) => {
        const ratingA = a.rating?.average ? parseFloat(a.rating.average) : 0;
        const ratingB = b.rating?.average ? parseFloat(b.rating.average) : 0;
        return ratingB - ratingA;
      });
    } else if (filter === 'Newest') {
      agents.sort((a, b) => {
        // If dateCreated exists, use it, otherwise fall back to createdAt
        const dateA = a.dateCreated ? new Date(a.dateCreated) : 
                     (a.createdAt ? new Date(a.createdAt) : new Date(0));
        const dateB = b.dateCreated ? new Date(b.dateCreated) : 
                     (b.createdAt ? new Date(b.createdAt) : new Date(0));
        return dateB - dateA;
      });
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedAgents = agents.slice(startIndex, startIndex + parseInt(limit));

    const result = {
      agents: paginatedAgents,
      total: agents.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(agents.length / limit)
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return res.status(500).json({ error: 'Failed to fetch agents' });
  }
};

/**
 * Get featured agents
 */
const getFeaturedAgents = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    // Get featured agents (bestsellers or manually selected)
    let query = db.collection('agents')
      .where('isBestseller', '==', true)
      .limit(parseInt(limit));
    
    const agentsSnapshot = await query.get();
    let agents = [];

    agentsSnapshot.forEach(doc => {
      agents.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // If we don't have enough bestsellers, add some recent agents
    if (agents.length < parseInt(limit)) {
      const remainingLimit = parseInt(limit) - agents.length;
      const newAgentsQuery = db.collection('agents')
        .where('isBestseller', '==', false)
        .where('isNew', '==', true)
        .limit(remainingLimit);
      
      const newAgentsSnapshot = await newAgentsQuery.get();
      
      newAgentsSnapshot.forEach(doc => {
        agents.push({
          id: doc.id,
          ...doc.data()
        });
      });
    }

    return res.status(200).json({ agents });
  } catch (error) {
    console.error('Error fetching featured agents:', error);
    return res.status(500).json({ error: 'Failed to fetch featured agents' });
  }
};

/**
 * Get a single agent by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getAgentById = async (req, res) => {
  try {
    // Get agentId from either params.id or params.agentId
    const agentId = req.params.id || req.params.agentId;
    
    // Log the request details for debugging
    console.log(`Attempting to get agent with ID: "${agentId}"`);
    
    // Basic validation - only check if it exists and is a string
    if (!agentId || typeof agentId !== 'string') {
      console.error('Invalid agent ID format:', agentId);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid agent ID format',
        error: 'Agent ID must be a valid string' 
      });
    }
    
    // Clean the agent ID - accept more formats
    let cleanAgentId = agentId.trim();
    
    // Only check for actual path separators (/ or \), NOT hyphens
    // Hyphens are valid in IDs like "agent-41"
    if (cleanAgentId.includes('/') || cleanAgentId.includes('\\')) {
      console.log(`Agent ID contains actual path separators, extracting ID portion`);
      const parts = cleanAgentId.split(/[/\\]/);
      cleanAgentId = parts[parts.length - 1];
      console.log(`Extracted ID from path: ${cleanAgentId}`);
      
      // Check again for path separators after extraction to prevent directory traversal
      if (cleanAgentId.includes('/') || cleanAgentId.includes('\\')) {
        console.error('Agent ID still contains path separators after cleaning:', cleanAgentId);
        return res.status(400).json({ 
          success: false,
          message: 'Invalid agent ID format',
          error: 'Agent ID must be a valid string without path separators' 
        });
      }
    }
    
    // For standard "agent-X" format, we have two options:
    // 1. Use the ID as is (agent-41)
    // 2. Strip the prefix and use just the number (41)
    
    let originalId = cleanAgentId; // Save original ID before any transformations
    
    // Check if it's prefixed with 'agent-' and strip it if needed
    if (cleanAgentId.startsWith('agent-')) {
      const numericPart = cleanAgentId.substring(6);
      // Only use the numeric part if it looks valid
      if (/^\d+$/.test(numericPart)) {
        cleanAgentId = numericPart;
        console.log(`Stripped 'agent-' prefix, using numeric ID: ${cleanAgentId}`);
      }
    }
    
    // Fetch the agent document - first try with cleaned ID
    let agentDoc = await db.collection('agents').doc(cleanAgentId).get();
    
    // If not found and we modified the ID, try with the original format
    if (!agentDoc.exists && cleanAgentId !== originalId) {
      console.log(`Agent not found with cleaned ID: ${cleanAgentId}, trying original ID: ${originalId}`);
      agentDoc = await db.collection('agents').doc(originalId).get();
    }
    
    if (!agentDoc.exists) {
      console.error(`Agent not found with either ID format: ${cleanAgentId} or ${originalId}`);
      return res.status(404).json({ 
        success: false,
        message: 'Agent not found',
        error: `No agent exists with ID: ${agentId}` 
      });
    }
    
    // Get agent data
    const agentData = {
      id: agentDoc.id,
      ...agentDoc.data()
    };
    
    // Fetch reviews related to this agent
    const reviewsSnapshot = await db.collection('reviews')
      .where('agentId', '==', cleanAgentId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    const reviews = [];
    reviewsSnapshot.forEach(doc => {
      reviews.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Add reviews to the agent data
    agentData.reviews = reviews;
    
    // Calculate average rating if there are reviews
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
      agentData.averageRating = totalRating / reviews.length;
      agentData.reviewCount = reviews.length;
    }
    
    // Return successful response
    return res.status(200).json({
      success: true,
      message: 'Agent retrieved successfully',
      data: agentData
    });
    
  } catch (error) {
    console.error('Error getting agent by ID:', error);
    // Return structured error response
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent',
      error: error.message,
      details: {
        code: error.code,
        path: req.path,
        params: req.params
      }
    });
  }
};

/**
 * Toggle agent in user's wishlist (add or remove)
 */
const toggleWishlist = async (req, res) => {
  try {
    // Extract agentId and sanitize it
    let agentId = req.params.agentId;
    
    // Check if the ID contains extra path segments
    if (agentId && agentId.includes('/')) {
      agentId = agentId.split('/')[0];
    }
    
    // Check if the ID contains query parameters
    if (agentId && agentId.includes('?')) {
      agentId = agentId.split('?')[0];
    }
    
    // Validate agent ID
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      console.error('Invalid agent ID for wishlist toggle:', agentId);
      return res.status(400).json({ error: 'Invalid agent ID provided' });
    }

    const sanitizedAgentId = agentId.trim();
    const { uid } = req.user; // From auth middleware
    
    // Check if agent exists
    const agentDoc = await db.collection('agents').doc(sanitizedAgentId).get();
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Wishlist ID is a combination of user ID and agent ID
    const wishlistId = `${uid}_${sanitizedAgentId}`;
    const wishlistRef = db.collection('wishlists').doc(wishlistId);
    
    // Check if wishlist item exists
    const wishlistDoc = await wishlistRef.get();
    
    if (wishlistDoc.exists) {
      // If it exists, remove it
      await wishlistRef.delete();
      
      // Decrement wishlist count on agent
      const agentRef = db.collection('agents').doc(sanitizedAgentId);
      await db.runTransaction(async (transaction) => {
        const agentDoc = await transaction.get(agentRef);
        if (agentDoc.exists) {
          const currentCount = agentDoc.data().wishlistCount || 0;
          transaction.update(agentRef, { 
            wishlistCount: Math.max(0, currentCount - 1) 
          });
        }
      });
      
      return res.status(200).json({ 
        message: 'Agent removed from wishlist',
        inWishlist: false
      });
    } else {
      // If it doesn't exist, add it
      await wishlistRef.set({
        userId: uid,
        agentId: sanitizedAgentId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Increment wishlist count on agent
      const agentRef = db.collection('agents').doc(sanitizedAgentId);
      await db.runTransaction(async (transaction) => {
        const agentDoc = await transaction.get(agentRef);
        if (agentDoc.exists) {
          const currentCount = agentDoc.data().wishlistCount || 0;
          transaction.update(agentRef, { 
            wishlistCount: currentCount + 1 
          });
        }
      });
      
      return res.status(201).json({ 
        message: 'Agent added to wishlist',
        inWishlist: true
      });
    }
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    return res.status(500).json({ error: 'Failed to update wishlist' });
  }
};

/**
 * Get agent wishlists for the current user
 */
const getWishlists = async (req, res) => {
  try {
    const { uid } = req.user; // From auth middleware
    
    // Query wishlists for this user
    const wishlistsSnapshot = await db.collection('wishlists')
      .where('userId', '==', uid)
      .get();
    
    const agentIds = [];
    wishlistsSnapshot.forEach(doc => {
      agentIds.push(doc.data().agentId);
    });
    
    // If no wishlisted agents, return empty array
    if (agentIds.length === 0) {
      return res.status(200).json({ agents: [] });
    }
    
    // Fetch agent details for each ID
    // Note: Firestore doesn't support direct "where in" with more than 10 items
    const agents = [];
    
    // Process in batches of 10 if there are many agent IDs
    for (let i = 0; i < agentIds.length; i += 10) {
      const batchIds = agentIds.slice(i, i + 10);
      const batchSnapshot = await db.collection('agents')
        .where(admin.firestore.FieldPath.documentId(), 'in', batchIds)
        .get();
      
      batchSnapshot.forEach(doc => {
        agents.push({
          id: doc.id,
          ...doc.data()
        });
      });
    }
    
    return res.status(200).json({ agents });
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    return res.status(500).json({ error: 'Failed to fetch wishlists' });
  }
};

/**
 * Get a specific wishlist by ID
 */
const getWishlistById = async (req, res) => {
  try {
    // Extract wishlistId and sanitize it
    let wishlistId = req.params.wishlistId;
    
    // Check if the ID contains extra path segments
    if (wishlistId && wishlistId.includes('/')) {
      wishlistId = wishlistId.split('/')[0];
    }
    
    // Check if the ID contains query parameters
    if (wishlistId && wishlistId.includes('?')) {
      wishlistId = wishlistId.split('?')[0];
    }
    
    // Validate wishlist ID
    if (!wishlistId || typeof wishlistId !== 'string' || wishlistId.trim() === '') {
      console.error('Invalid wishlist ID:', wishlistId);
      return res.status(400).json({ error: 'Invalid wishlist ID provided' });
    }

    const sanitizedWishlistId = wishlistId.trim();
    
    // Fetch the wishlist document
    const wishlistDoc = await db.collection('wishlists').doc(sanitizedWishlistId).get();
    
    if (!wishlistDoc.exists) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }
    
    // Get the wishlist data
    const wishlistData = {
      id: wishlistDoc.id,
      ...wishlistDoc.data()
    };
    
    return res.status(200).json(wishlistData);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
};

/**
 * Generate mock agents for development
 */
const generateMockAgents = (count) => {
  // Categories that might match the ones in the filter
  const categories = ['All', 'Design', 'Drawing & Painting', '3D', 'Self Improvement', 
    'Music & Sound Design', 'Software Development', 'Business'];
  
  // Features for filtering
  const allFeatures = [
    'API Access', 'Customizable', 'Mobile Compatible', 
    'Desktop App', 'Web Interface', 'Voice Enabled', 
    'AI Powered', 'Cloud Storage', 'Offline Mode'
  ];
  
  // Tags for better categorization
  const allTags = [
    'AI', 'Productivity', 'Assistant', 'Creative', 'Education', 
    'Entertainment', 'Professional', 'Communication', 'Automation'
  ];
  
  // Create comprehensive descriptions
  const descriptions = [
    "A powerful AI assistant that helps with %CATEGORY% tasks, providing instant solutions and creative ideas.",
    "Transform your %CATEGORY% workflow with this intelligent agent that learns from your preferences.",
    "The ultimate %CATEGORY% companion that streamlines complex tasks and boosts your productivity.",
    "An innovative AI tool for %CATEGORY% enthusiasts, combining cutting-edge technology with intuitive design.",
    "Elevate your %CATEGORY% projects with this smart agent, featuring advanced capabilities and seamless integration."
  ];
  
  // Generate random reviews
  const generateReviews = (agentId, count = 5) => {
    const reviewTexts = [
      "This agent has completely transformed how I work. Highly recommended!",
      "Great tool with an intuitive interface. Saves me hours every day.",
      "Does exactly what it promises. Very satisfied with the performance.",
      "Impressive capabilities but has a bit of a learning curve.",
      "Exceptional value for the price. Can't imagine working without it now.",
      "The support team is fantastic. They helped me customize it for my needs.",
      "Solid performance and reliability. Minor bugs but nothing serious.",
      "Best in its category. I've tried many similar tools and this one stands out.",
      "Regular updates keep improving the functionality. Gets better every month.",
      "Would be perfect with a few more features, but still very good."
    ];
    
    const reviews = [];
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const randomRating = Math.floor(Math.random() * 3) + 3; // 3-5 stars
      const reviewText = reviewTexts[Math.floor(Math.random() * reviewTexts.length)];
      
      reviews.push({
        id: `review-${agentId}-${i + 1}`,
        agentId,
        userId: `user-${Math.floor(Math.random() * 100) + 1}`,
        userName: `User ${Math.floor(Math.random() * 100) + 1}`,
        rating: randomRating,
        text: reviewText,
        createdAt: new Date(
          Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)
        ).toISOString(),
        isVerified: Math.random() > 0.3, // 70% verified
        helpful: Math.floor(Math.random() * 50),
        unhelpful: Math.floor(Math.random() * 10)
      });
    }
    
    return reviews;
  };
  
  return Array.from({ length: count }, (_, index) => {
    const id = `agent-${index + 1}`;
    const category = categories[Math.floor(Math.random() * categories.length)];
    const isFree = index % 5 === 0; // 20% of agents are free
    const isBestseller = index < Math.ceil(count * 0.2); // Top 20% are bestsellers
    const isNew = index >= Math.floor(count * 0.8); // Bottom 20% are new
    const isTrending = index % 10 === 0; // 10% are trending
    const isFeatured = index % 5 === 0; // 20% are featured
    const isSubscription = !isFree && (index % 10 === 3 || index % 10 === 8); // 15% are subscription-based
    const reviews = generateReviews(id, Math.floor(Math.random() * 8) + 3); // 3-10 reviews
    
    // Calculate average rating
    const averageRating = reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : "0.0";
    
    // Random agent icon/image (could be improved with more realistic URLs)
    const iconType = Math.random() > 0.5 ? 'robot' : 'abstract';
    const iconColor = ['blue', 'green', 'purple', 'orange', 'teal'][Math.floor(Math.random() * 5)];
    const iconUrl = `https://example.com/agent-icons/${iconType}-${iconColor}-${index + 1}.jpg`;

    // Format the description with category
    const descriptionTemplate = descriptions[Math.floor(Math.random() * descriptions.length)];
    const description = descriptionTemplate.replace('%CATEGORY%', category);
    
    // Calculate popularity metrics
    const popularity = Math.floor(Math.random() * 1000);
    const viewCount = popularity * (5 + Math.floor(Math.random() * 20));
    const wishlistCount = Math.floor(popularity * 0.3);
    
    // Select random features and tags
    const features = [...allFeatures].sort(() => 0.5 - Math.random()).slice(0, 2 + Math.floor(Math.random() * 3));
    const tags = [...allTags].sort(() => 0.5 - Math.random()).slice(0, 2 + Math.floor(Math.random() * 3));
    
    // Create a createdAt date (within last 30 days)
    const createdDate = new Date(
      Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
    );
    
    // Base price calculation
    const basePrice = isFree ? 0 : (5 + Math.floor(Math.random() * 95));
    
    return {
      id,
      name: `${category} Agent ${index + 1}`,
      title: `${category} Assistant Pro${isBestseller ? ' Plus' : ''}`,
      description,
      category,
      creator: {
        id: `creator-${Math.floor(Math.random() * 10) + 1}`,
        name: `AI Labs ${Math.floor(Math.random() * 100) + 1}`,
        verified: Math.random() > 0.7 // 30% verified
      },
      iconUrl,
      features,
      tags,
      isBestseller,
      isFeatured,
      isFree,
      isSubscription,
      subscriptionTiers: isSubscription ? [
        {
          name: "Basic",
          price: basePrice / 2,
          features: features.slice(0, Math.ceil(features.length / 2))
        },
        {
          name: "Pro",
          price: basePrice,
          features: features
        }
      ] : null,
      isNew,
      isTrending,
      popularity,
      viewCount,
      wishlistCount,
      createdAt: createdDate.toISOString(),
      dateCreated: new Date(createdDate.getTime() - 3600000).toISOString(), // 1 hour earlier
      version: `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      
      priceDetails: {
        basePrice: isFree ? 0 : basePrice,
        discountedPrice: isFree ? 0 : (Math.random() > 0.7 ? Math.floor(basePrice * 0.7) : basePrice),
        currency: "USD",
        validUntil: Math.random() > 0.8 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null
      },
      
      priceHistory: isFree ? [] : [
        {
          price: basePrice + 5,
          discountedPrice: basePrice,
          dateApplied: new Date(createdDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      
      purchase: {
        isAvailable: true,
        maxPurchasesPerUser: Math.random() > 0.9 ? 1 : null,
        refundPolicy: ["No refunds allowed", "7-day refund policy", "30-day money-back guarantee"][Math.floor(Math.random() * 3)]
      },
      
      rating: {
        average: parseFloat(averageRating),
        count: reviews.length,
        distribution: {
          1: reviews.filter(r => r.rating === 1).length,
          2: reviews.filter(r => r.rating === 2).length,
          3: reviews.filter(r => r.rating === 3).length,
          4: reviews.filter(r => r.rating === 4).length,
          5: reviews.filter(r => r.rating === 5).length
        }
      }
    };
  });
};

/**
 * Development endpoint to seed agents data into Firestore with comprehensive data
 */
const seedAgents = async (req, res) => {
  try {
    const { count = 50 } = req.query;
    const agents = generateMockAgents(parseInt(count));
    
    console.log(`Generating ${agents.length} mock agents...`);
    
    // Create batch for efficient writes
    let successCount = 0;
    let batchCount = 0;
    let batch = db.batch();
    
    // Add each agent to the batch
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const agentRef = db.collection('agents').doc(agent.id);
      
      // Extract reviews to store in a subcollection
      const reviews = agent.reviews || [];
      delete agent.reviews; // Remove from main document
      
      // Add agent document
      batch.set(agentRef, agent);
      
      // Add each review to the agent's reviews subcollection
      if (reviews.length > 0) {
        for (const review of reviews) {
          const reviewRef = agentRef.collection('reviews').doc(review.id);
          batch.set(reviewRef, review);
        }
      }
      
      // Firestore has a limit of 500 operations per batch
      // So we commit the batch every 20 documents (considering reviews)
      if ((i + 1) % 20 === 0 || i === agents.length - 1) {
        await batch.commit();
        successCount += Math.min(20, agents.length - i + (i % 20));
        batchCount++;
        console.log(`Batch ${batchCount} committed. ${successCount}/${agents.length} agents processed.`);
        
        // Create a new batch for the next set of operations
        if (i < agents.length - 1) {
          batch = db.batch();
        }
      }
    }
    
    return res.status(200).json({ 
      message: `${agents.length} agents seeded successfully with detailed information and reviews.`,
      details: {
        totalAgents: agents.length,
        totalBatches: batchCount
      }
    });
  } catch (error) {
    console.error('Error seeding agents:', error);
    return res.status(500).json({ error: 'Failed to seed agents', details: error.message });
  }
};

/**
 * Create a new agent
 */
const createAgent = async (req, res) => {
  try {
    // Check if user is an admin
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only administrators can create agents' });
    }

    const agentData = req.body;
    
    // Validate required fields
    if (!agentData.name || !agentData.category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }
    
    // Add timestamps
    const now = new Date().toISOString();
    agentData.createdAt = now;
    agentData.updatedAt = now;
    
    // Set creator information from the authenticated user if not provided
    if (!agentData.creator || !agentData.creator.name) {
      agentData.creator = {
        name: req.user.displayName || 'Admin',
        email: req.user.email || '',
        id: req.user.uid
      };
    }
    
    // Create the agent in Firestore
    const agentRef = await db.collection('agents').add(agentData);
    
    // Return the created agent with its ID
    const newAgent = {
      id: agentRef.id,
      ...agentData
    };
    
    return res.status(201).json(newAgent);
  } catch (error) {
    console.error('Error creating agent:', error);
    return res.status(500).json({ error: 'Failed to create agent' });
  }
};

/**
 * Update an existing agent
 */
const updateAgent = async (req, res) => {
  try {
    // Check if user is an admin
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only administrators can update agents' });
    }

    // Extract agentId from either params.agentId or params.id
    let agentId = req.params.agentId || req.params.id;
    
    // Check if the ID contains extra path segments
    if (agentId && agentId.includes('/')) {
      // Extract just the agent ID part
      agentId = agentId.split('/')[0];
    }
    

    // Validate agent ID to prevent Firestore errors
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      console.error('Invalid agent ID for update:', agentId);
      return res.status(400).json({ error: 'Invalid agent ID provided' });
    }

    const sanitizedAgentId = agentId.trim();
    console.log('Processing agent update for ID:', sanitizedAgentId);
    const updateData = req.body;
    
    // Check if agent exists
    const agentDoc = await db.collection('agents').doc(sanitizedAgentId).get();
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Add update timestamp
    updateData.updatedAt = new Date().toISOString();
    
    // Update the agent
    await db.collection('agents').doc(sanitizedAgentId).update(updateData);
    
    // Get the updated agent data
    const updatedAgentDoc = await db.collection('agents').doc(sanitizedAgentId).get();
    const updatedAgent = {
      id: updatedAgentDoc.id,
      ...updatedAgentDoc.data()
    };
    
    return res.status(200).json(updatedAgent);
  } catch (error) {
    console.error('Error updating agent:', error);
    return res.status(500).json({ error: 'Failed to update agent' });
  }
};

/**
 * Delete an agent
 */
const deleteAgent = async (req, res) => {
  try {
    // Check if user is an admin
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only administrators can delete agents' });
    }

    // Extract agentId from either req.params.agentId or req.params.id
    let agentId = req.params.agentId || req.params.id;
    
    // Check if the ID contains extra path segments
    if (agentId && agentId.includes('/')) {
      // Extract just the agent ID part
      agentId = agentId.split('/')[0];
    }
    
    // Validate agent ID to prevent Firestore errors
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      console.error('Invalid agent ID for deletion:', agentId);
      return res.status(400).json({ error: 'Invalid agent ID provided' });
    }

    const sanitizedAgentId = agentId.trim();
    console.log('Processing agent deletion for ID:', sanitizedAgentId);
    
    // Check if agent exists
    const agentDoc = await db.collection('agents').doc(sanitizedAgentId).get();
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Delete the agent
    await db.collection('agents').doc(sanitizedAgentId).delete();
    
    // Delete associated prices
    const priceQuery = await db.collection('prices').where('agentId', '==', sanitizedAgentId).get();
    const batch = db.batch();
    priceQuery.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Agent deleted successfully',
      id: sanitizedAgentId
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return res.status(500).json({ error: 'Failed to delete agent' });
  }
};

/**
 * Combined update for agent and price data
 */
const combinedUpdate = async (req, res) => {
  try {
    // Extract and sanitize agentId
    let agentId = req.params.agentId || req.params.id;
    console.log('Combined update requested for raw ID:', agentId);
    
    // Check if the ID contains extra path segments
    if (agentId && agentId.includes('/')) {
      agentId = agentId.split('/')[0];
    }
    
    // Check if the ID contains query parameters
    if (agentId && agentId.includes('?')) {
      agentId = agentId.split('?')[0];
    }
    
    // Add "agent-" prefix if it's missing and it's numeric
    if (agentId && !isNaN(agentId) && !agentId.startsWith('agent-')) {
      agentId = `agent-${agentId}`;
      console.log('Added agent- prefix to numeric ID:', agentId);
    }
    
    // Validate agent ID
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      console.error('Invalid agent ID for combined update:', agentId);
      return res.status(400).json({ error: 'Invalid agent ID provided' });
    }
    
    const sanitizedAgentId = agentId.trim();
    console.log('Processing combined update for agent ID:', sanitizedAgentId);
    
    // Extract price data from the request body
    const { priceData, _method, ...agentData } = req.body;
    
    // Get agent document reference
    const agentRef = db.collection('agents').doc(sanitizedAgentId);
    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Update agent data
    console.log(`Updating agent ${sanitizedAgentId} with data:`, agentData);
    await agentRef.update({
      ...agentData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // If price data is provided, update price
    let priceUpdateResult = null;
    if (priceData) {
      console.log(`Updating price data for agent ${sanitizedAgentId}:`, priceData);
      
      // Use the agentId as the price document ID for consistency with priceController
      const priceRef = db.collection('prices').doc(sanitizedAgentId);
      const priceDoc = await priceRef.get();
      
      if (priceDoc.exists) {
        // Update existing price document
        await priceRef.update({
          ...priceData,
          agentId: sanitizedAgentId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Create new price document
        await priceRef.set({
          ...priceData,
          agentId: sanitizedAgentId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Get the updated price document
      const updatedPriceDoc = await priceRef.get();
      priceUpdateResult = {
        id: updatedPriceDoc.id,
        ...updatedPriceDoc.data()
      };
    }
    
    // Get the updated agent document
    const updatedAgentDoc = await agentRef.get();
    const updatedAgent = {
      id: updatedAgentDoc.id,
      ...updatedAgentDoc.data()
    };
    
    // Add price data to the response if it was updated
    if (priceUpdateResult) {
      updatedAgent.priceDetails = {
        basePrice: priceUpdateResult.basePrice || 0,
        discountedPrice: priceUpdateResult.discountedPrice || priceUpdateResult.finalPrice || 0,
        currency: priceUpdateResult.currency || 'USD'
      };
      updatedAgent.isFree = priceUpdateResult.isFree || false;
      updatedAgent.isSubscription = priceUpdateResult.isSubscription || false;
      
      // Include the full price data in the response
      updatedAgent.priceData = priceUpdateResult;
    }
    
    // Clear any Redis cache for this agent
    try {
      const redisClient = req.app.get('redisClient');
      if (redisClient) {
        await redisClient.del(`agent:${sanitizedAgentId}`);
        await redisClient.del(`price:${sanitizedAgentId}`);
        console.log(`Cleared Redis cache for agent:${sanitizedAgentId} and price:${sanitizedAgentId}`);
      }
    } catch (redisError) {
      console.warn('Redis cache clear error:', redisError);
      // Continue processing even if Redis fails
    }
    
    // Make sure we always send a proper response with status 200
    console.log('Combined update successful, returning updated agent data with status 200');
    
    // Create a properly structured response
    const responseBody = {
      success: true,
      data: updatedAgent,
      message: 'Agent and price data updated successfully'
    };
    
    // Set the Content-Type header to ensure the response is treated as JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Send a 200 response with the JSON body
    return res.status(200).json(responseBody);
  } catch (error) {
    console.error('Error in combined update:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to update agent and price data',
      message: error.message
    });
  }
};

/**
 * Creates an agent with price data in a single request
 * This helps avoid making multiple API calls from the frontend
 */
const createAgentWithPrice = (req, res) => {
  // Very simple implementation to test if routing works
  console.log('Simple createAgentWithPrice called', req.body);
  return res.status(200).json({
    success: true,
    message: 'Create agent with price handler reached successfully',
    receivedData: req.body
  });
};

/**
 * Get the download count for an agent
 * @route GET /api/agents/:agentId/downloads
 */
const getDownloadCount = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    // Get the agent document
    const agentRef = db.collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const agentData = agentDoc.data();
    
    // Return the download count (default to 0 if not set)
    return res.status(200).json({ 
      downloads: agentData.downloadCount || 0,
      agentId
    });
  } catch (error) {
    console.error('Error getting download count:', error);
    return res.status(500).json({ error: 'Failed to get download count' });
  }
};

/**
 * Increment the download count for an agent
 * @route POST /api/agents/:agentId/downloads
 */
const incrementDownloadCount = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    // Get the agent document
    const agentRef = db.collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Increment the download count using an atomic operation
    await agentRef.update({
      downloadCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Get the updated agent document
    const updatedAgentDoc = await agentRef.get();
    const updatedAgentData = updatedAgentDoc.data();
    
    return res.status(200).json({ 
      downloads: updatedAgentData.downloadCount || 1,
      agentId,
      message: 'Download count incremented successfully'
    });
  } catch (error) {
    console.error('Error incrementing download count:', error);
    return res.status(500).json({ error: 'Failed to increment download count' });
  }
};

// Log the status of each function before exporting
console.log("Before export - function status:");
console.log("- getAgents:", typeof getAgents === 'function');
console.log("- combinedUpdate:", typeof combinedUpdate === 'function');
console.log("- createAgentWithPrice:", typeof createAgentWithPrice === 'function');

// Export all controller functions
module.exports = {
  getAgents,
  getFeaturedAgents,
  getAgentById,
  toggleWishlist,
  getWishlists,
  getWishlistById,
  seedAgents,
  generateMockAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  combinedUpdate,
  createAgentWithPrice,
  getDownloadCount,
  incrementDownloadCount
}; 