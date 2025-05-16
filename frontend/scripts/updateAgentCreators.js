/**
 * Script to update all existing agents to ensure they have the complete creator structure
 * This adds username and role fields to any creator object that doesn't have them
 */

// Import the Firebase configuration from your project
const { db } = require('../config/firebase');
const logger = console;

async function updateAgentCreators() {
  try {
    logger.log('Starting agent creator update process...');
    
    // Get all agents from the collection
    logger.log('Fetching agents from database...');
    const agentsSnapshot = await db.collection('agents').get();
    logger.log(`Found ${agentsSnapshot.size} agents to process`);
    
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
        logger.log(`Agent ${doc.id}: Adding default creator (no creator found)`);
      } else if (typeof agent.creator === 'string') {
        // Creator is a string, convert to object
        const creatorName = agent.creator;
        agent.creator = {
          name: creatorName,
          username: creatorName.replace(/\s+/g, ''),
          role: 'Partner'
        };
        needsUpdate = true;
        logger.log(`Agent ${doc.id}: Converting string creator "${creatorName}" to object`);
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
          logger.log(`Agent ${doc.id}: Adding missing creator fields: ${changes.join(', ')}`);
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
      logger.log(`Committing ${batches.length} batches with ${updateCount} updates...`);
      
      for (let i = 0; i <= batchIndex; i++) {
        if (currentBatch > 0) {
          logger.log(`Committing batch ${i + 1} of ${batchIndex + 1}...`);
          await batches[i].commit();
          logger.log(`Batch ${i + 1} committed successfully`);
        }
      }
    } else {
      logger.log('No updates needed, skipping batch commits');
    }
    
    logger.log('\n===== SUMMARY =====');
    logger.log(`Total agents: ${agentsSnapshot.size}`);
    logger.log(`Updated: ${updateCount} agents`);
    logger.log(`Skipped: ${skippedCount} agents (already had correct structure)`);
    logger.log('====================\n');
    
    return {
      success: true,
      updated: updateCount,
      skipped: skippedCount,
      total: agentsSnapshot.size
    };
  } catch (error) {
    logger.error('Error updating agent creators:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// If this script is run directly
if (require.main === module) {
  updateAgentCreators()
    .then((result) => {
      logger.log('Update completed with result:', result);
      setTimeout(() => process.exit(0), 1000); // Allow time for Firebase to close
    })
    .catch((error) => {
      logger.error('Update failed:', error);
      setTimeout(() => process.exit(1), 1000); // Allow time for Firebase to close
    });
} else {
  // Export the function if imported as a module
  module.exports = updateAgentCreators;
} 