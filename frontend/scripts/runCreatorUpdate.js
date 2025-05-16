/**
 * Script to update agent creators using the existing Firebase configuration
 */

// Import the Firebase configuration
const { db } = require('../config/firebase');
const logger = console;

/**
 * Update agent creators to ensure they have username and role fields
 */
async function updateAgentCreators() {
  try {
    logger.log('Starting agent creator update process...');
    
    // Get all agents from the collection
    logger.log('Fetching agents from database...');
    const agentsSnapshot = await db.collection('agents').get();
    logger.log(`Found ${agentsSnapshot.size} agents to process`);
    
    let updateCount = 0;
    let skippedCount = 0;
    let updatedAgents = [];
    
    // Process each agent with batched writes
    const batchSize = 450; // Firestore batch limit is 500, leave some margin
    let batches = [db.batch()];
    let currentBatchCount = 0;
    let batchIndex = 0;
    
    for (const doc of agentsSnapshot.docs) {
      const agent = doc.data();
      let needsUpdate = false;
      let originalCreator = agent.creator ? JSON.stringify(agent.creator) : 'null';
      
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
        // Check if we need to create a new batch
        if (currentBatchCount >= batchSize) {
          batchIndex++;
          batches.push(db.batch());
          currentBatchCount = 0;
        }
        
        // Update the document in the current batch
        batches[batchIndex].update(doc.ref, { creator: agent.creator });
        currentBatchCount++;
        updateCount++;
        
        // Track updated agents for debugging
        updatedAgents.push({
          id: doc.id,
          name: agent.name || agent.title || 'Unnamed agent',
          originalCreator,
          newCreator: JSON.stringify(agent.creator)
        });
      } else {
        skippedCount++;
      }
    }
    
    // Commit all batches
    if (updateCount > 0) {
      logger.log(`Committing ${batches.length} batches with ${updateCount} updates...`);
      
      // Track progress for large batches
      for (let i = 0; i <= batchIndex; i++) {
        if (currentBatchCount > 0) {
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
    logger.log(`Batches: ${batchIndex + 1}`);
    logger.log('====================\n');
    
    return {
      success: true,
      updated: updateCount,
      skipped: skippedCount,
      total: agentsSnapshot.size,
      batches: batchIndex + 1
    };
  } catch (error) {
    logger.error('Error updating agent creators:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the update function
logger.log('Starting update of agent creators...');
updateAgentCreators()
  .then((result) => {
    logger.log('Update completed with result:', result);
    setTimeout(() => process.exit(0), 1000); // Allow time for Firebase to close
  })
  .catch((error) => {
    logger.error('Update failed:', error);
    setTimeout(() => process.exit(1), 1000); // Allow time for Firebase to close
  }); 