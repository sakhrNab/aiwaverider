import { fetchAITools, fetchAIToolById, createAITool, updateAITool as apiUpdateAITool, deleteAITool as apiDeleteAITool } from '../utils/aiToolsApi';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_KEY = 'ai_tools_cache';
const CACHE_TIMESTAMP_KEY = 'ai_tools_cache_timestamp';

// Mock data for fallback
const mockAITools = [
  {
    id: 'tool-1',
    title: 'Midjourney',
    description: 'AI art generation with stunning, detailed results. Create images from text prompts.',
    category: 'Image Generation',
    keyword: 'Image Generation',
    tags: ['Image Generation', 'Art', 'Design'],
    url: 'https://www.midjourney.com',
    link: 'https://www.midjourney.com',
    imageUrl: 'https://via.placeholder.com/300x200/6b21ff/ffffff?text=Midjourney',
    image: 'https://via.placeholder.com/300x200/6b21ff/ffffff?text=Midjourney',
    isFree: false,
    price: '$10/month',
    rating: 4.8,
    createdAt: '2023-01-15'
  },
  {
    id: 'tool-2',
    title: 'ChatGPT',
    description: 'Powerful language model that can generate text, answer questions, and assist with various tasks.',
    category: 'Text Generation',
    keyword: 'Text Generation',
    tags: ['AI Writing', 'Text Generation', 'Free tools'],
    url: 'https://chat.openai.com',
    link: 'https://chat.openai.com',
    imageUrl: 'https://via.placeholder.com/300x200/10a37f/ffffff?text=ChatGPT',
    image: 'https://via.placeholder.com/300x200/10a37f/ffffff?text=ChatGPT',
    isFree: true,
    price: 'Free',
    rating: 4.9,
    createdAt: '2022-11-30'
  },
  {
    id: 'tool-3',
    title: 'Runway',
    description: 'Create, edit and extend videos using AI. Perfect for content creators and marketers.',
    category: 'Video Generation',
    keyword: 'Video Generator',
    tags: ['Video Generator', 'Video Editing', 'Content'],
    url: 'https://runwayml.com',
    link: 'https://runwayml.com',
    imageUrl: 'https://via.placeholder.com/300x200/d14836/ffffff?text=Runway',
    image: 'https://via.placeholder.com/300x200/d14836/ffffff?text=Runway',
    isFree: false,
    price: '$15/month',
    rating: 4.7,
    createdAt: '2023-03-10'
  },
  {
    id: 'tool-4',
    title: 'GitHub Copilot',
    description: 'AI-powered code completion and suggestion tool that helps developers write code faster.',
    category: 'Development',
    keyword: 'AI Coding',
    tags: ['AI Coding', 'Development', 'Productivity'],
    url: 'https://github.com/features/copilot',
    link: 'https://github.com/features/copilot',
    imageUrl: 'https://via.placeholder.com/300x200/333333/ffffff?text=GitHub+Copilot',
    image: 'https://via.placeholder.com/300x200/333333/ffffff?text=GitHub+Copilot',
    isFree: false,
    price: '$10/month',
    rating: 4.6,
    createdAt: '2022-10-15'
  },
  {
    id: 'tool-5',
    title: 'Canva AI',
    description: 'Design platform with AI features for creating graphics, presentations, and other visual content.',
    category: 'Design',
    keyword: 'Design',
    tags: ['Design', 'Content', 'Image Generation'],
    url: 'https://www.canva.com',
    link: 'https://www.canva.com',
    imageUrl: 'https://via.placeholder.com/300x200/00c4cc/ffffff?text=Canva+AI',
    image: 'https://via.placeholder.com/300x200/00c4cc/ffffff?text=Canva+AI',
    isFree: true,
    price: 'Free (Pro: $12.99/month)',
    rating: 4.5,
    createdAt: '2023-02-20'
  },
  {
    id: 'tool-6',
    title: 'Notion AI',
    description: 'AI-powered writing assistant integrated with Notion to help draft, edit, and summarize content.',
    category: 'Productivity',
    keyword: 'Productivity',
    tags: ['AI Writing', 'Productivity', 'Organization'],
    url: 'https://www.notion.so/product/ai',
    link: 'https://www.notion.so/product/ai',
    imageUrl: 'https://via.placeholder.com/300x200/000000/ffffff?text=Notion+AI',
    image: 'https://via.placeholder.com/300x200/000000/ffffff?text=Notion+AI',
    isFree: false,
    price: '$10/month (with Notion)',
    rating: 4.4,
    createdAt: '2023-04-05'
  }
];

/**
 * Get all AI tools with caching
 */
export const getAllAITools = async (forceRefresh = false) => {
  try {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedData = getCachedTools();
      if (cachedData) {
        console.log('[AIToolsService] Using cached AI tools data');
        return cachedData;
      }
    }

    // If no cache or refresh forced, fetch from API
    console.log('[AIToolsService] Fetching fresh AI tools data');
    const tools = await fetchAITools();

    // If we got empty array from API, use mock data
    if (!tools || tools.length === 0) {
      console.log('[AIToolsService] No tools from API, using mock data');
      cacheTools(mockAITools);
      return mockAITools;
    }

    // Cache the results
    cacheTools(tools);
    
    return tools;
  } catch (error) {
    console.error('[AIToolsService] Error fetching AI tools:', error);
    
    // For errors, try getting from cache
    const cachedData = getCachedTools();
    if (cachedData) {
      console.log('[AIToolsService] Error occurred, using cached data');
      return cachedData;
    }
    
    // If no cache, return mock data
    console.log('[AIToolsService] No cache available, using mock data');
    cacheTools(mockAITools); // Cache the mock data
    return mockAITools;
  }
};

/**
 * Get a single AI tool by ID
 */
export const getAIToolById = async (id) => {
  try {
    // Check cache first
    const cachedTools = getCachedTools();
    if (cachedTools) {
      const cachedTool = cachedTools.find(tool => tool.id === id);
      if (cachedTool) {
        console.log(`[AIToolsService] Using cached data for tool ${id}`);
        return cachedTool;
      }
    }

    // If not in cache, fetch from API
    console.log(`[AIToolsService] Fetching fresh data for tool ${id}`);
    const tool = await fetchAIToolById(id);
    
    return tool;
  } catch (error) {
    console.error(`[AIToolsService] Error fetching AI tool ${id}:`, error);
    throw error; // Let the component handle the error
  }
};

/**
 * Add a new AI tool
 */
export const addAITool = async (toolData, imageFile) => {
  try {
    const createdTool = await createAITool(toolData, imageFile);

    // Invalidate cache
    invalidateCache();

    return createdTool;
  } catch (error) {
    console.error('[AIToolsService] Error adding AI tool:', error);
    throw error;
  }
};

/**
 * Update an existing AI tool
 */
export const updateAITool = async (id, toolData, imageFile) => {
  try {
    const updatedTool = await apiUpdateAITool(id, toolData, imageFile);

    // Invalidate cache
    invalidateCache();

    return updatedTool;
  } catch (error) {
    console.error(`[AIToolsService] Error updating AI tool ${id}:`, error);
    throw error;
  }
};

/**
 * Delete an AI tool
 */
export const deleteAITool = async (id) => {
  try {
    await apiDeleteAITool(id);
    
    // Invalidate cache
    invalidateCache();
    
    return true;
  } catch (error) {
    console.error(`[AIToolsService] Error deleting AI tool ${id}:`, error);
    throw error;
  }
};

/**
 * Cache tools data in localStorage
 */
const cacheTools = (tools) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(tools));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    console.log('[AIToolsService] Tools data cached successfully');
  } catch (error) {
    console.error('[AIToolsService] Error caching tools data:', error);
    // Clear any partial cache to prevent inconsistency
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  }
};

/**
 * Get cached tools if available and not expired
 */
const getCachedTools = () => {
  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const cachedData = localStorage.getItem(CACHE_KEY);
    
    if (!timestamp || !cachedData) {
      return null;
    }
    
    // Check if cache is still valid
    const now = Date.now();
    const cacheTime = parseInt(timestamp, 10);
    
    if (now - cacheTime > CACHE_DURATION) {
      console.log('[AIToolsService] Cache expired');
      return null;
    }
    
    return JSON.parse(cachedData);
  } catch (error) {
    console.error('[AIToolsService] Error reading cache:', error);
    return null;
  }
};

/**
 * Invalidate the cache
 */
const invalidateCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log('[AIToolsService] Cache invalidated');
  } catch (error) {
    console.error('[AIToolsService] Error invalidating cache:', error);
  }
}; 