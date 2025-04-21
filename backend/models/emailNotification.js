/**
 * Email Notification Model
 * 
 * Handles email notification data, campaigns, and logs
 */

const { db } = require('../config/firebase');
const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Collection references
const emailCampaignsCollection = db.collection('emailCampaigns');
const emailLogsCollection = db.collection('emailLogs');
const usersCollection = db.collection('users');

/**
 * Create a new email campaign
 * @param {Object} campaignData - Campaign data
 * @returns {Promise<string>} - Campaign ID
 */
exports.createCampaign = async (campaignData) => {
  try {
    const campaignRef = await emailCampaignsCollection.add({
      ...campaignData,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'draft',
      sentCount: 0,
      failedCount: 0
    });
    
    return campaignRef.id;
  } catch (error) {
    logger.error(`Error creating email campaign: ${error.message}`);
    throw error;
  }
};

/**
 * Update an email campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<void>}
 */
exports.updateCampaign = async (campaignId, updateData) => {
  try {
    // Don't allow updating certain fields directly
    const { sentCount, failedCount, startedAt, completedAt, ...safeUpdateData } = updateData;
    
    await emailCampaignsCollection.doc(campaignId).update({
      ...safeUpdateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    logger.error(`Error updating email campaign: ${error.message}`);
    throw error;
  }
};

/**
 * Mark an email campaign as sending
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<void>}
 */
exports.markCampaignAsSending = async (campaignId) => {
  try {
    await emailCampaignsCollection.doc(campaignId).update({
      status: 'sending',
      startedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    logger.error(`Error marking campaign as sending: ${error.message}`);
    throw error;
  }
};

/**
 * Mark an email campaign as completed
 * @param {string} campaignId - Campaign ID
 * @param {number} sentCount - Number of emails sent
 * @param {number} failedCount - Number of emails failed
 * @param {Array} errors - Array of errors
 * @returns {Promise<void>}
 */
exports.markCampaignAsCompleted = async (campaignId, sentCount, failedCount, errors = []) => {
  try {
    await emailCampaignsCollection.doc(campaignId).update({
      status: 'completed',
      sentCount,
      failedCount,
      errors: errors.slice(0, 20), // Store only first 20 errors
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    logger.error(`Error marking campaign as completed: ${error.message}`);
    throw error;
  }
};

/**
 * Log an email send for tracking
 * @param {Object} logData - Email log data
 * @returns {Promise<string>} - Log ID
 */
exports.logEmailSend = async (logData) => {
  try {
    const {
      campaignId,
      type,
      userId,
      email,
      success,
      messageId,
      error
    } = logData;
    
    const logRef = await emailLogsCollection.add({
      campaignId,
      type,
      userId,
      email,
      success,
      messageId,
      error,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return logRef.id;
  } catch (error) {
    logger.error(`Error logging email send: ${error.message}`);
    throw error;
  }
};

/**
 * Get users based on email preferences for targeting
 * @param {Object} options - Query options
 * @param {Array} options.emailTypes - Email preference types to filter by
 * @param {Array} options.userIds - Specific user IDs to include (optional)
 * @param {Boolean} options.activeOnly - Only include active users (default true)
 * @returns {Promise<Array>} - Array of user documents
 */
exports.getUsersByPreferences = async (options) => {
  try {
    const { emailTypes = [], userIds = [], activeOnly = true } = options;
    
    // If specific users are provided, fetch those users
    if (userIds.length > 0) {
      const userDocs = await Promise.all(
        userIds.map(id => usersCollection.doc(id).get())
      );
      
      return userDocs
        .filter(doc => doc.exists)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
    }
    
    // Otherwise, query by preferences
    let query = usersCollection;
    
    // Only include active users
    if (activeOnly) {
      query = query.where('status', '==', 'active');
    }
    
    // If email types are specified, add preference conditions
    if (emailTypes.length > 0) {
      // Get users with the first preference type
      query = query.where(`emailPreferences.${emailTypes[0]}`, '==', true);
      
      // Execute query
      const usersSnapshot = await query.get();
      
      // If multiple preferences, filter in memory
      if (emailTypes.length > 1) {
        const results = [];
        
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          
          // Check if user has all required preferences
          const hasAllPreferences = emailTypes.slice(1).every(type => 
            userData.emailPreferences && 
            userData.emailPreferences[type] === true
          );
          
          if (hasAllPreferences) {
            results.push({
              id: doc.id,
              ...userData
            });
          }
        });
        
        return results;
      } else {
        // If only one preference type, return all results
        const results = [];
        
        usersSnapshot.forEach(doc => {
          results.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        return results;
      }
    } else {
      // If no specific preferences, just return all users
      const usersSnapshot = await query.get();
      const results = [];
      
      usersSnapshot.forEach(doc => {
        results.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return results;
    }
  } catch (error) {
    logger.error(`Error getting users by preferences: ${error.message}`);
    throw error;
  }
};

/**
 * Get email subscription statistics
 * @returns {Promise<Object>} - Email preference statistics
 */
exports.getEmailPreferenceStats = async () => {
  try {
    const stats = {
      totalActiveUsers: 0,
      weeklyUpdates: 0,
      announcements: 0,
      newAgents: 0,
      newTools: 0,
      marketingEmails: 0
    };
    
    // Get total active users
    const activeUsersSnapshot = await usersCollection
      .where('status', '==', 'active')
      .count()
      .get();
    
    stats.totalActiveUsers = activeUsersSnapshot.data().count;
    
    // Get counts for each preference type
    const preferenceCounts = await Promise.all([
      usersCollection
        .where('status', '==', 'active')
        .where('emailPreferences.weeklyUpdates', '==', true)
        .count()
        .get(),
      usersCollection
        .where('status', '==', 'active')
        .where('emailPreferences.announcements', '==', true)
        .count()
        .get(),
      usersCollection
        .where('status', '==', 'active')
        .where('emailPreferences.newAgents', '==', true)
        .count()
        .get(),
      usersCollection
        .where('status', '==', 'active')
        .where('emailPreferences.newTools', '==', true)
        .count()
        .get(),
      usersCollection
        .where('status', '==', 'active')
        .where('emailPreferences.marketingEmails', '==', true)
        .count()
        .get()
    ]);
    
    stats.weeklyUpdates = preferenceCounts[0].data().count;
    stats.announcements = preferenceCounts[1].data().count;
    stats.newAgents = preferenceCounts[2].data().count;
    stats.newTools = preferenceCounts[3].data().count;
    stats.marketingEmails = preferenceCounts[4].data().count;
    
    return stats;
  } catch (error) {
    logger.error(`Error getting email preference stats: ${error.message}`);
    throw error;
  }
};

/**
 * Update a user's email preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - Email preferences object
 * @returns {Promise<void>}
 */
exports.updateUserEmailPreferences = async (userId, preferences) => {
  try {
    await usersCollection.doc(userId).update({
      'emailPreferences': preferences,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    logger.error(`Error updating user email preferences: ${error.message}`);
    throw error;
  }
}; 