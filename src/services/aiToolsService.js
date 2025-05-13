import { fetchAITools, fetchAIToolById, createAITool, updateAITool as apiUpdateAITool, deleteAITool as apiDeleteAITool } from '../api/marketplace/aiToolsApi';

import { createSvgDataUri } from '../utils/imageUtils';
import axios from 'axios';
import  { API_URL } from '../api/core/apiConfig'
// Cache configuration
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const CACHE_KEY = 'ai_tools_cache';
const CACHE_TIMESTAMP_KEY = 'ai_tools_cache_timestamp'; // 24 hours

// Get API base URL from environment variables or use default

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
    imageUrl: createSvgDataUri({
      text: 'Midjourney',
      width: 300,
      height: 200,
      bgColor: '6b21ff',
      textColor: 'ffffff',
      fontSize: 24
    }),
    image: createSvgDataUri({
      text: 'Midjourney',
      width: 300,
      height: 200,
      bgColor: '6b21ff',
      textColor: 'ffffff',
      fontSize: 24
    }),
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
    imageUrl: createSvgDataUri({
      text: 'ChatGPT',
      width: 300,
      height: 200,
      bgColor: '10a37f',
      textColor: 'ffffff',
      fontSize: 24
    }),
    image: createSvgDataUri({
      text: 'ChatGPT',
      width: 300,
      height: 200,
      bgColor: '10a37f',
      textColor: 'ffffff',
      fontSize: 24
    }),
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
    imageUrl: createSvgDataUri({
      text: 'Runway',
      width: 300,
      height: 200,
      bgColor: 'd14836',
      textColor: 'ffffff',
      fontSize: 24
    }),
    image: createSvgDataUri({
      text: 'Runway',
      width: 300,
      height: 200,
      bgColor: 'd14836',
      textColor: 'ffffff',
      fontSize: 24
    }),
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
    imageUrl: createSvgDataUri({
      text: 'GitHub Copilot',
      width: 300,
      height: 200,
      bgColor: '333333',
      textColor: 'ffffff',
      fontSize: 24
    }),
    image: createSvgDataUri({
      text: 'GitHub Copilot',
      width: 300,
      height: 200,
      bgColor: '333333',
      textColor: 'ffffff',
      fontSize: 24
    }),
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
    imageUrl: createSvgDataUri({
      text: 'Canva AI',
      width: 300,
      height: 200,
      bgColor: '00c4cc',
      textColor: 'ffffff',
      fontSize: 24
    }),
    image: createSvgDataUri({
      text: 'Canva AI',
      width: 300,
      height: 200,
      bgColor: '00c4cc',
      textColor: 'ffffff',
      fontSize: 24
    }),
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
    imageUrl: createSvgDataUri({
      text: 'Notion AI',
      width: 300,
      height: 200,
      bgColor: '000000',
      textColor: 'ffffff',
      fontSize: 24
    }),
    image: createSvgDataUri({
      text: 'Notion AI',
      width: 300,
      height: 200,
      bgColor: '000000',
      textColor: 'ffffff',
      fontSize: 24
    }),
    isFree: false,
    price: '$10/month (with Notion)',
    rating: 4.4,
    createdAt: '2023-04-05'
  }
];

/**
 * Get all AI tools with caching
 * @param {boolean} forceRefresh - Whether to bypass cache and force a fresh fetch
 * @returns {Promise<Array>} - Array of AI tools
 */
export const getAllAITools = async (forceRefresh = false) => {
  try {
    // Check if we have cached data and it's still valid
    const cachedData = localStorage.getItem('ai_tools_cache');
    const cachedTimestamp = localStorage.getItem('ai_tools_cache_timestamp');
    
    if (!forceRefresh && cachedData && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();
      
      // If cache is still valid, use it
      if (now - timestamp < CACHE_DURATION) {
        console.log('Using cached AI tools data');
        return JSON.parse(cachedData);
      }
    }
    
    // Fetch fresh data
    console.log('Fetching fresh AI tools data');
    const response = await axios.get(`${API_URL}/api/ai-tools`);
    
    if (response.data && response.data.data) {
      // Process and normalize the data
      const tools = response.data.data.map(tool => {
        // Validate the image URL
        const validatedImage = tool.image && 
          !tool.image.includes('/undefined') && 
          tool.image !== '/uploads/undefined' ? 
          formatImageUrl(tool.image) : '';
        
        return {
          ...tool,
          // Use validated image URL
          image: validatedImage,
          // Ensure tags is always an array
          tags: Array.isArray(tool.tags) ? tool.tags : (tool.tags ? [tool.tags] : [])
        };
      });
      
      // Cache the data
      localStorage.setItem('ai_tools_cache', JSON.stringify(tools));
      localStorage.setItem('ai_tools_cache_timestamp', Date.now().toString());
      
      return tools;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching AI tools:', error);
    
    // If there's an error but we have cached data, use it as fallback
    const cachedData = localStorage.getItem('ai_tools_cache');
    if (cachedData) {
      console.log('Using cached AI tools data as fallback due to error');
      return JSON.parse(cachedData);
    }
    
    throw error;
  }
};

/**
 * Format image URL to ensure it's properly accessible
 * @param {string} imageUrl - The image URL from the API
 * @returns {string} - Properly formatted image URL
 */
const formatImageUrl = (imageUrl) => {
  // Better handling of invalid image URLs
  if (!imageUrl || 
      imageUrl === '/uploads/undefined' || 
      imageUrl.includes('/undefined') || 
      imageUrl === '') {
    return '';
  }
  
  // If it's already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it's a relative path, prepend the API base URL
  if (imageUrl.startsWith('/')) {
    return `${API_URL}${imageUrl}`;
  }
  
  return imageUrl;
};

/**
 * Get a single AI tool by ID
 * @param {string} id - The tool ID
 * @returns {Promise<Object>} - The AI tool object
 */
export const getAIToolById = async (id) => {
  try {
    // Check if we have it in cache first
    const cachedData = localStorage.getItem('ai_tools_cache');
    if (cachedData) {
      const tools = JSON.parse(cachedData);
      const tool = tools.find(t => t.id === id);
      if (tool) {
        console.log('Found tool in cache');
        return tool;
      }
    }
    
    // Fetch from API if not in cache
    const response = await axios.get(`${API_URL}/api/ai-tools/${id}`);
    
    if (response.data && response.data.data) {
      const tool = {
        ...response.data.data,
        image: formatImageUrl(response.data.data.image)
      };
      return tool;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching AI tool with ID ${id}:`, error);
    throw error;
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
 * Invalidate the cache
 */
const invalidateCache = () => {
  try {
    localStorage.removeItem('ai_tools_cache');
    localStorage.removeItem('ai_tools_cache_timestamp');
    console.log('AI tools cache cleared');
  } catch (error) {
    console.error('[AIToolsService] Error invalidating cache:', error);
  }
};

/**
 * Generate mock AI tools data with SVG images instead of via.placeholder.com URLs
 * @returns {Array} - Array of mock AI tools
 */
const generateMockTools = () => {
  // Original tools array (using SVG data URIs instead of placeholder URLs)
  const tools = [
    {
      id: 'chatgpt',
      title: 'ChatGPT',
      description: 'Powerful AI assistant for text generation, answering questions, and more',
      url: 'https://chat.openai.com',
      category: 'AI Assistant',
      tags: ['Text Generation', 'AI Assistant', 'Productivity'],
      imageUrl: createSvgDataUri({
        text: 'ChatGPT',
        width: 300,
        height: 200,
        bgColor: '10a37f',
        textColor: 'ffffff',
        fontSize: 24
      }),
      image: createSvgDataUri({
        text: 'ChatGPT',
        width: 300,
        height: 200,
        bgColor: '10a37f',
        textColor: 'ffffff',
        fontSize: 24
      }),
      isFree: true,
      price: 'Free',
      rating: 4.9,
      createdAt: '2022-11-30'
    },
    {
      id: 'midjourney',
      title: 'Midjourney',
      description: 'Create stunning AI-generated images from text descriptions',
      url: 'https://www.midjourney.com',
      category: 'Image Generation',
      tags: ['Image Generation', 'Creative', 'Art'],
      imageUrl: createSvgDataUri({
        text: 'Midjourney',
        width: 300,
        height: 200,
        bgColor: '6b21ff',
        textColor: 'ffffff',
        fontSize: 24
      }),
      image: createSvgDataUri({
        text: 'Midjourney',
        width: 300,
        height: 200,
        bgColor: '6b21ff',
        textColor: 'ffffff',
        fontSize: 24
      }),
      isFree: false,
      price: '$10/month',
      rating: 4.8,
      createdAt: '2023-01-15'
    },
    {
      id: 'notion-ai',
      title: 'Notion AI',
      description: 'AI writing assistant integrated with Notion for better notes and documents',
      url: 'https://www.notion.so/product/ai',
      category: 'Productivity',
      tags: ['Writing', 'Productivity', 'Notes'],
      imageUrl: createSvgDataUri({
        text: 'Notion AI',
        width: 300,
        height: 200,
        bgColor: '000000',
        textColor: 'ffffff',
        fontSize: 24
      }),
      image: createSvgDataUri({
        text: 'Notion AI',
        width: 300,
        height: 200,
        bgColor: '000000',
        textColor: 'ffffff',
        fontSize: 24
      }),
      isFree: false,
      price: '$10/month (with Notion)',
      rating: 4.4,
      createdAt: '2023-04-05'
    },
    {
      id: 'github-copilot',
      title: 'GitHub Copilot',
      description: 'AI pair programmer that helps you write code faster',
      url: 'https://github.com/features/copilot',
      category: 'Coding',
      tags: ['Coding', 'Programming', 'AI Coding'],
      imageUrl: createSvgDataUri({
        text: 'GitHub Copilot',
        width: 300,
        height: 200,
        bgColor: '333333',
        textColor: 'ffffff',
        fontSize: 24
      }),
      image: createSvgDataUri({
        text: 'GitHub Copilot',
        width: 300,
        height: 200,
        bgColor: '333333',
        textColor: 'ffffff',
        fontSize: 24
      }),
      isFree: false,
      price: '$10/month',
      rating: 4.6,
      createdAt: '2022-10-15'
    },
    {
      id: 'canva-ai',
      title: 'Canva AI',
      description: 'AI-powered design tools for creating stunning visuals',
      url: 'https://www.canva.com',
      category: 'Design',
      tags: ['Design', 'Creative', 'Marketing'],
      imageUrl: createSvgDataUri({
        text: 'Canva AI',
        width: 300,
        height: 200,
        bgColor: '00c4cc',
        textColor: 'ffffff',
        fontSize: 24
      }),
      image: createSvgDataUri({
        text: 'Canva AI',
        width: 300,
        height: 200,
        bgColor: '00c4cc',
        textColor: 'ffffff',
        fontSize: 24
      }),
      isFree: true,
      price: 'Free (Pro: $12.99/month)',
      rating: 4.5,
      createdAt: '2023-02-20'
    },
    {
      id: 'runway',
      title: 'Runway',
      description: 'AI video editing and generation platform',
      url: 'https://runwayml.com',
      category: 'Video',
      tags: ['Video', 'Creative', 'Video Editing'],
      imageUrl: createSvgDataUri({
        text: 'Runway',
        width: 300,
        height: 200,
        bgColor: 'd14836',
        textColor: 'ffffff',
        fontSize: 24
      }),
      image: createSvgDataUri({
        text: 'Runway',
        width: 300,
        height: 200,
        bgColor: 'd14836',
        textColor: 'ffffff',
        fontSize: 24
      }),
      isFree: false,
      price: '$15/month',
      rating: 4.7,
      createdAt: '2023-03-10'
    }
  ];

  // Add more tools to the array
  const extendedTools = [
    ...tools,
    {
      id: 'dall-e',
      title: 'DALL-E',
      description: 'Create realistic images and art from text descriptions',
      url: 'https://openai.com/dall-e-2',
      category: 'Image Generation',
      tags: ['Image Generation', 'Creative', 'Art'],
      imageUrl: createSvgDataUri({
        text: 'DALL-E',
        width: 300,
        height: 200,
        bgColor: '5436da',
        textColor: 'ffffff',
        fontSize: 24
      }),
      image: createSvgDataUri({
        text: 'DALL-E',
        width: 300,
        height: 200,
        bgColor: '5436da',
        textColor: 'ffffff',
        fontSize: 24
      }),
      isFree: false,
      price: 'Pay-per-use',
      rating: 4.7,
      createdAt: '2023-01-20'
    },
    {
      id: 'jasper',
      title: 'Jasper',
      description: 'AI content platform for marketing teams',
      url: 'https://www.jasper.ai',
      category: 'Writing',
      tags: ['Writing', 'Marketing', 'Content'],
      imageUrl: createSvgDataUri({
        text: 'Jasper',
        width: 300,
        height: 200,
        bgColor: 'ff7a59',
        textColor: 'ffffff',
        fontSize: 24
      }),
      image: createSvgDataUri({
        text: 'Jasper',
        width: 300,
        height: 200,
        bgColor: 'ff7a59',
        textColor: 'ffffff',
        fontSize: 24
      }),
      isFree: false,
      price: '$49/month',
      rating: 4.5,
      createdAt: '2022-12-05'
    },
    {
      id: 'copy-ai',
      title: 'Copy.ai',
      description: 'AI-powered copywriting tool for marketing content',
      url: 'https://www.copy.ai',
      category: 'Writing',
      tags: ['Writing', 'Marketing', 'Content'],
      imageUrl: createSvgDataUri({
        text: 'Copy.ai',
        width: 300,
        height: 200,
        bgColor: '3a86ff',
        textColor: 'ffffff',
        fontSize: 24
      }),
      image: createSvgDataUri({
        text: 'Copy.ai',
        width: 300,
        height: 200,
        bgColor: '3a86ff',
        textColor: 'ffffff',
        fontSize: 24
      }),
      isFree: true,
      price: 'Free (Pro: $36/month)',
      rating: 4.3,
      createdAt: '2023-02-15'
    },
    {
      id: 'synthesia',
      title: 'Synthesia',
      description: 'Create AI-generated videos with virtual presenters',
      url: 'https://www.synthesia.io',
      category: 'Video',
      tags: ['Video', 'Marketing', 'AI Video'],
      imageUrl: createSvgDataUri({
        text: 'Synthesia',
        width: 300,
        height: 200,
        bgColor: '7209b7',
        textColor: 'ffffff',
        fontSize: 24
      }),
      image: createSvgDataUri({
        text: 'Synthesia',
        width: 300,
        height: 200,
        bgColor: '7209b7',
        textColor: 'ffffff',
        fontSize: 24
      }),
      isFree: false,
      price: '$30/month',
      rating: 4.6,
      createdAt: '2023-03-25'
    },
    {
      id: 'descript',
      title: 'Descript',
      description: 'All-in-one audio & video editing with AI tools',
      url: 'https://www.descript.com',
      category: 'Video',
      tags: ['Video Editing', 'Audio Editing', 'Podcasting'],
      imageUrl: createSvgDataUri({
        text: 'Descript',
        width: 300,
        height: 200,
        bgColor: '4361ee',
        textColor: 'ffffff',
        fontSize: 24
      }),
      image: createSvgDataUri({
        text: 'Descript',
        width: 300,
        height: 200,
        bgColor: '4361ee',
        textColor: 'ffffff',
        fontSize: 24
      }),
      isFree: true,
      price: 'Free (Pro: $12/month)',
      rating: 4.8,
      createdAt: '2022-11-10'
    },
    {
      id: 'grammarly',
      title: 'Grammarly',
      description: 'AI writing assistant for grammar and style',
      url: 'https://www.grammarly.com',
      category: 'Writing',
      tags: ['Writing', 'Grammar', 'Productivity'],
      imageUrl: createSvgDataUri({
        text: 'Grammarly',
        width: 300,
        height: 200,
        bgColor: '15c39a',
        textColor: 'ffffff',
        fontSize: 24
      }),
      image: createSvgDataUri({
        text: 'Grammarly',
        width: 300,
        height: 200,
        bgColor: '15c39a',
        textColor: 'ffffff',
        fontSize: 24
      }),
      isFree: true,
      price: 'Free (Premium: $12/month)',
      rating: 4.7,
      createdAt: '2022-09-20'
    },
    {
      id: 'stable-diffusion',
      title: 'Stable Diffusion',
      description: 'Open-source AI image generation model',
      url: 'https://stability.ai',
      category: 'Image Generation',
      tags: ['Image Generation', 'Open Source', 'Art'],
      imageUrl: createSvgDataUri({
        text: 'Stable Diffusion',
        width: 300,
        height: 200,
        bgColor: '0b7285',
        textColor: 'ffffff',
        fontSize: 24
      }),
      image: createSvgDataUri({
        text: 'Stable Diffusion',
        width: 300,
        height: 200,
        bgColor: '0b7285',
        textColor: 'ffffff',
        fontSize: 24
      }),
      isFree: true,
      price: 'Free (Self-hosted)',
      rating: 4.7,
      createdAt: '2022-08-22'
    }
  ];

  return extendedTools;
}; 