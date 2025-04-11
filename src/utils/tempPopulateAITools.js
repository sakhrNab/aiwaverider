// Temporary script to populate AI tools data into Firestore
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { db } from './firebase';

// Sample AI tools data - same as what was in the seedAITools script
const sampleTools = [
  {
    title: 'ChatGPT',
    description: 'An AI chatbot developed by OpenAI based on the GPT language model that can generate human-like text responses.',
    link: 'https://chat.openai.com',
    image: 'https://www.edigitalagency.com.au/wp-content/uploads/chatgpt-logo-white-green-background-png.png',
    keyword: 'Chatbot',
    tags: ['AI Chat', 'Text Generation', 'Language Model']
  },
  {
    title: 'DALL-E',
    description: 'An AI system by OpenAI that can create realistic images and art from natural language descriptions.',
    link: 'https://openai.com/dall-e-2',
    image: 'https://static.vecteezy.com/system/resources/previews/022/227/339/original/openai-dall-e-logo-icon-free-png.png',
    keyword: 'Image Generation',
    tags: ['AI Art', 'Image Generation', 'Text-to-Image']
  },
  {
    title: 'Midjourney',
    description: 'An AI program that generates images from textual descriptions, similar to DALL-E and Stable Diffusion.',
    link: 'https://www.midjourney.com',
    image: 'https://seeklogo.com/images/M/midjourney-logo-819E9E8B5F-seeklogo.com.png',
    keyword: 'AI Art',
    tags: ['AI Art', 'Image Generation', 'Text-to-Image']
  },
  {
    title: 'Jasper',
    description: 'AI content writer that helps you and your team create high-quality content for blogs, social media and marketing.',
    link: 'https://www.jasper.ai',
    image: 'https://neilpatel.com/wp-content/uploads/2022/06/jasper-formerly-jarvis-logo-410x80.png',
    keyword: 'Content Writing',
    tags: ['AI Writing', 'Marketing', 'Content Creation']
  },
  {
    title: 'GitHub Copilot',
    description: 'AI pair programmer that helps you write better code, offering suggestions based on comments and context.',
    link: 'https://github.com/features/copilot',
    image: 'https://github.gallerycdn.vsassets.io/extensions/github/copilot/1.47.412/1674233868016/Microsoft.VisualStudio.Services.Icons.Default',
    keyword: 'Code Assistant',
    tags: ['Programming', 'Developer Tools', 'Code Generation']
  },
  {
    title: 'Stable Diffusion',
    description: 'Open-source text-to-image AI model capable of generating detailed images from text descriptions.',
    link: 'https://stability.ai/stable-diffusion',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Stable_Diffusion_logo.png',
    keyword: 'Image Generation',
    tags: ['AI Art', 'Image Generation', 'Open Source']
  },
  {
    title: 'Perplexity AI',
    description: 'AI-powered search engine that provides accurate and cited answers to complex questions.',
    link: 'https://www.perplexity.ai',
    image: 'https://substackcdn.com/image/fetch/w_1456,c_limit,f_webp,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F07a1e4fb-c04e-44f5-b8bd-5b1d4c103f96_512x512.png',
    keyword: 'AI Search',
    tags: ['Research', 'Information', 'Question Answering']
  },
  {
    title: 'RunwayML',
    description: 'Creative toolkit with AI magic tools for content creators to edit videos and images.',
    link: 'https://runwayml.com',
    image: 'https://assets-global.website-files.com/641a8c4cbc2ab91d7166e4dc/645b85b6a20a2a3cec0b747c_Runway_Logo.svg',
    keyword: 'Video Editing',
    tags: ['Video Generation', 'Content Creation', 'Creative Tools', 'Video Generator']
  }
];

// Collection name
const COLLECTION_NAME = 'ai_tools';

// Function to add timestamps to a document
const addTimestamps = (doc) => {
  const now = firebase.firestore.Timestamp.now();
  return {
    ...doc,
    createdAt: now,
    updatedAt: now
  };
};

// Function to populate the AI tools
export const populateAITools = async () => {
  try {
    console.log('Starting to populate AI tools...');
    
    // Check if collection already has data
    const snapshot = await db.collection(COLLECTION_NAME).limit(1).get();
    
    if (!snapshot.empty) {
      console.log('AI tools already exist in the database. Clearing existing data first...');
      // Delete existing documents
      const batch = db.batch();
      const existingDocs = await db.collection(COLLECTION_NAME).get();
      existingDocs.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('Cleared existing AI tools data.');
    }
    
    // Add the new tools
    const batch = db.batch();
    const toolsAdded = [];

    for (const tool of sampleTools) {
      const docRef = db.collection(COLLECTION_NAME).doc();
      const toolWithTimestamps = addTimestamps(tool);
      batch.set(docRef, toolWithTimestamps);
      toolsAdded.push({ id: docRef.id, ...toolWithTimestamps });
    }

    await batch.commit();
    
    console.log(`Successfully added ${toolsAdded.length} AI tools to the database:`);
    toolsAdded.forEach(tool => {
      console.log(`- ${tool.title}`);
    });
    
    return {
      success: true,
      count: toolsAdded.length,
      message: `Successfully added ${toolsAdded.length} AI tools to the database`
    };
  } catch (error) {
    console.error('Error populating AI tools:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Initialize function in the window object for console access
export const initTempPopulateTools = () => {
  window.populateAITools = populateAITools;
  console.log('========================================');
  console.log('🔥 AI Tools Populate Function Available 🔥');
  console.log('========================================');
  console.log('Run this in the console to populate AI tools:');
  console.log('window.populateAITools()');
  console.log('========================================');
};

// Auto-initialize when imported
initTempPopulateTools();

export default populateAITools; 