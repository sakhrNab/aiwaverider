/**
 * Direct script to update agent creators in Firestore
 * This script doesn't rely on Express or controllers
 */

// Import Firebase Admin
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin with proper error handling
async function initializeFirebase() {
  try {
    if (admin.apps.length) {
      console.log('Firebase already initialized, using existing app');
      return admin.firestore();
    }

    // Try both possible service account locations
    const possiblePaths = [
      path.join(__dirname, '..', 'config', 'firebase-service-account.json'),
      path.join(__dirname, '..', 'config', 'serviceAccountKey.json'),
      path.join(__dirname, '..', 'config', 'firebase-credentials.json'),
      path.join(__dirname, '..', 'firebase-service-account.json'),
      path.join(__dirname, '..', 'serviceAccountKey.json')
    ];

    let serviceAccountPath = null;
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        serviceAccountPath = filePath;
        console.log('Found service account at:', filePath);
        break;
      }
    }

    if (!serviceAccountPath) {
      console.error('Firebase service account file not found in any expected location. Please check your config directory.');
      return null;
    }

    console.log('Loading service account from:', serviceAccountPath);
    const serviceAccount = require(serviceAccountPath);

    // Initialize the app
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log('Firebase initialized successfully');
    return admin.firestore();
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return null;
  }
}

async function updateAgentCreators() {
  try {
    console.log('Starting agent creator update process...');
    
    // Initialize Firebase
    const db = await initializeFirebase();
    if (!db) {
      console.error('Failed to initialize Firebase, cannot continue.');
      return {
        success: false,
        error: 'Firebase initialization failed'
      };
    }
    
    // Get all agents from the collection
    console.log('Fetching agents from database...');
    const agentsSnapshot = await db.collection('agents').get();
    console.log(`Found ${agentsSnapshot.size} agents to process`);
    
    let updateCount = 0;
    let skippedCount = 0;
    
    // Process each agent
    const batchSize = 500; // Firestore batch limit is 500
    let currentBatch = 0;
    let batches = [db.batch()];
    let batchIndex = 0;
    
    for (const doc of agentsSnapshot.docs) {
      const agent = doc.data();
      let needsUpdate = false;
      
      // Check if creator exists and has the correct structure
      if (!agent.creator) {
        // No creator at all, add a default one
        agent.creator = {
          name: 'AI Waverider Team',
          username: 'AIWaverider',
          role: 'Admin'
        };
        needsUpdate = true;
        console.log(`Agent ${doc.id}: Adding default creator (no creator found)`);
      } else if (typeof agent.creator === 'string') {
        // Creator is a string, convert to object
        const creatorName = agent.creator;
        agent.creator = {
          name: creatorName,
          username: creatorName.replace(/\s+/g, ''),
          role: 'Partner'
        };
        needsUpdate = true;
        console.log(`Agent ${doc.id}: Converting string creator "${creatorName}" to object`);
      } else if (typeof agent.creator === 'object') {
        // Creator is an object, check for missing fields
        let changes = [];
        
        if (!agent.creator.username) {
          // Add username based on name or default
          agent.creator.username = agent.creator.name ? 
            agent.creator.name.replace(/\s+/g, '') : 'AIWaverider';
          changes.push(`username: ${agent.creator.username}`);
          needsUpdate = true;
        }
        
        if (!agent.creator.role) {
          // Add default role
          agent.creator.role = agent.creator.name && 
            agent.creator.name.includes('Waverider') ? 'Admin' : 'Partner';
          changes.push(`role: ${agent.creator.role}`);
          needsUpdate = true;
        }
        
        if (changes.length > 0) {
          console.log(`Agent ${doc.id}: Adding missing creator fields: ${changes.join(', ')}`);
        }
      }
      
      if (needsUpdate) {
        // Add to the current batch
        if (currentBatch >= batchSize) {
          // Create a new batch if the current one is full
          batchIndex++;
          batches.push(db.batch());
          currentBatch = 0;
        }
        
        batches[batchIndex].update(doc.ref, { creator: agent.creator });
        currentBatch++;
        updateCount++;
      } else {
        skippedCount++;
      }
    }
    
    // Commit all batches
    if (updateCount > 0) {
      console.log(`Committing ${batches.length} batches with ${updateCount} updates...`);
      
      for (let i = 0; i <= batchIndex; i++) {
        if (currentBatch > 0) {
          console.log(`Committing batch ${i + 1} of ${batchIndex + 1}...`);
          await batches[i].commit();
          console.log(`Batch ${i + 1} committed successfully`);
        }
      }
    } else {
      console.log('No updates needed, skipping batch commits');
    }
    
    console.log('\n===== SUMMARY =====');
    console.log(`Total agents: ${agentsSnapshot.size}`);
    console.log(`Updated: ${updateCount} agents`);
    console.log(`Skipped: ${skippedCount} agents (already had correct structure)`);
    console.log(`Batches: ${batchIndex + 1}`);
    console.log('====================\n');
    
    return {
      success: true,
      updated: updateCount,
      skipped: skippedCount,
      total: agentsSnapshot.size,
      batches: batchIndex + 1
    };
  } catch (error) {
    console.error('Error updating agent creators:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the update function
console.log('Starting direct update of agent creators...');
updateAgentCreators()
  .then((result) => {
    console.log('Update completed with result:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Update failed:', error);
    process.exit(1);
  }); 