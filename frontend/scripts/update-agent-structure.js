const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Script to update agent documents to remove redundancy and improve structure
 * - Converts stringified 'data' to actual object
 * - Removes duplicate fields
 * - Ensures consistent URL structure
 * - Cleans up null fields
 */
async function updateAgentStructure() {
  try {
    console.log('Starting agent structure update...');
    
    // Get all agents
    const agentsSnapshot = await db.collection('agents').get();
    
    if (agentsSnapshot.empty) {
      console.log('No agents found to update');
      return;
    }
    
    console.log(`Found ${agentsSnapshot.size} agents to process`);
    let successCount = 0;
    let errorCount = 0;
    
    // Process each agent
    for (const doc of agentsSnapshot.docs) {
      try {
        const agentId = doc.id;
        const agent = doc.data();
        console.log(`Processing agent: ${agentId} - ${agent.name || 'Unnamed'}`);
        
        // Create improved agent object
        const updatedAgent = restructureAgent(agent);
        
        // Update in Firestore
        await db.collection('agents').doc(agentId).update(updatedAgent);
        
        console.log(`✅ Successfully updated agent: ${agentId}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error updating agent ${doc.id}:`, error);
        errorCount++;
      }
    }
    
    console.log('Update completed:');
    console.log(`- Successfully updated: ${successCount} agents`);
    console.log(`- Failed updates: ${errorCount} agents`);
    
  } catch (error) {
    console.error('Error in migration script:', error);
  }
}

/**
 * Restructures an agent object to fix the issues
 */
function restructureAgent(agent) {
  // Parse the data field if it exists as a string
  let dataObject = {};
  if (agent.data && typeof agent.data === 'string') {
    try {
      dataObject = JSON.parse(agent.data);
    } catch (e) {
      console.warn('Could not parse data field as JSON, using empty object');
    }
  }
  
  // Create a clean price details object
  const priceDetails = {
    basePrice: agent.priceDetails?.basePrice || dataObject.basePrice || agent.basePrice || 0,
    discountedPrice: agent.priceDetails?.discountedPrice || dataObject.discountedPrice || agent.discountedPrice || 0,
    currency: agent.priceDetails?.currency || dataObject.currency || agent.currency || 'USD',
    isFree: agent.priceDetails?.isFree || dataObject.isFree || agent.isFree || false,
    isSubscription: agent.priceDetails?.isSubscription || dataObject.isSubscription || agent.isSubscription || false,
    discountPercentage: agent.priceDetails?.discountPercentage || dataObject.discountPercentage || 0
  };
  
  // Create proper image object
  const image = {
    url: agent.image?.url || dataObject.imageUrl || '',
    fileName: agent.image?.fileName || '',
    originalName: agent.image?.originalName || '',
    contentType: agent.image?.contentType || 'image/jpeg',
    size: agent.image?.size || 0
  };
  
  // Create proper jsonFile object
  const jsonFile = {
    url: agent.jsonFile?.url || agent.downloadUrl || agent.fileUrl || dataObject.downloadUrl || dataObject.fileUrl || '',
    fileName: agent.jsonFile?.fileName || '',
    originalName: agent.jsonFile?.originalName || '',
    contentType: agent.jsonFile?.contentType || 'application/json',
    size: agent.jsonFile?.size || 0
  };
  
  // Create clean creator object
  const creator = {
    name: agent.creator?.name || dataObject.creator?.name || '',
    id: agent.creator?.id || dataObject.creator?.id || '',
    imageUrl: agent.creator?.imageUrl || dataObject.creator?.imageUrl || '',
    email: agent.creator?.email || dataObject.creator?.email || '',
    username: agent.creator?.username || dataObject.creator?.username || '',
    role: agent.creator?.role || dataObject.creator?.role || 'user'
  };
  
  // Create the updated agent with restructured data
  const updatedAgent = {
    id: agent.id,
    name: agent.name || dataObject.name || '',
    title: dataObject.title || '',
    description: dataObject.description || '',
    category: agent.category || dataObject.category || '',
    
    // Single source of truth for pricing
    priceDetails,
    
    // Keep only "image" as the container for image data
    image,
    
    // Keep only "jsonFile" for template data
    jsonFile,
    
    // Consistent downloadUrl (for backward compatibility)
    downloadUrl: jsonFile.url,
    
    // Creator data
    creator,
    
    // Feature flags and metadata
    features: dataObject.features || agent.features || [],
    tags: dataObject.tags || agent.tags || [],
    isFeatured: dataObject.isFeatured || agent.isFeatured || false,
    isVerified: dataObject.isVerified || agent.isVerified || false, 
    isPopular: dataObject.isPopular || agent.isPopular || false,
    isTrending: dataObject.isTrending || agent.isTrending || false,
    status: dataObject.status || agent.status || 'active',
    
    // Timestamps
    createdAt: agent.createdAt || dataObject.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  return updatedAgent;
}

// Run the update
updateAgentStructure().then(() => {
  console.log('Update script completed');
  process.exit(0);
}).catch(error => {
  console.error('Update script failed:', error);
  process.exit(1);
}); 