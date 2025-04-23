/**
 * Email Controller
 * 
 * Handles all email-related operations including campaigns, individual emails,
 * and administrative functions
 */

const emailService = require('../services/emailService');
const emailNotificationModel = require('../models/emailNotification');
const logger = require('../utils/logger');
const { validateEmail } = require('../utils/validators');
const { db } = require('../config/firebase');
const config = require('../config/email');

/**
 * Send a test email to verify configuration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendTestEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid email address is required' 
      });
    }
    
    // Send test email
    const result = await emailService.sendTestEmail(email);
    
    // Log the send
    await emailNotificationModel.logEmailSend({
      type: 'test',
      email,
      userId: req.user?.uid || null,
      success: true,
      messageId: result.messageId
    });
    
    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      data: { messageId: result.messageId }
    });
  } catch (error) {
    logger.error(`Error sending test email: ${error.message}`);
    
    // Log the failure
    if (req.body.email) {
      await emailNotificationModel.logEmailSend({
        type: 'test',
        email: req.body.email,
        userId: req.user?.uid || null,
        success: false,
        error: error.message
      }).catch(e => {
        logger.error(`Failed to log email failure: ${e.message}`);
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
};

/**
 * Send a welcome email to a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendWelcomeEmail = async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    // Validate inputs
    if (!userId || !email || !validateEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and valid email address are required' 
      });
    }
    
    // Send welcome email
    const result = await emailService.sendWelcomeEmail({
      userId,
      email,
      firstName: req.body.firstName || '',
      lastName: req.body.lastName || ''
    });
    
    // Log the send
    await emailNotificationModel.logEmailSend({
      type: 'welcome',
      email,
      userId,
      success: true,
      messageId: result.messageId
    });
    
    res.status(200).json({
      success: true,
      message: 'Welcome email sent successfully',
      data: { messageId: result.messageId }
    });
  } catch (error) {
    logger.error(`Error sending welcome email: ${error.message}`);
    
    // Log the failure
    if (req.body.email && req.body.userId) {
      await emailNotificationModel.logEmailSend({
        type: 'welcome',
        email: req.body.email,
        userId: req.body.userId,
        success: false,
        error: error.message
      }).catch(e => {
        logger.error(`Failed to log email failure: ${e.message}`);
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to send welcome email',
      error: error.message
    });
  }
};

/**
 * Send an update notification email to users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendUpdateEmail = async (req, res) => {
  try {
    const { title, content, updateType } = req.body;
    
    // Validate inputs
    if (!title || !content || !updateType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, content, and update type are required' 
      });
    }
    
    // Get users based on email preferences
    let emailType;
    switch (updateType) {
      case 'weekly':
        emailType = 'weeklyUpdates';
        break;
      case 'announcements':
        emailType = 'announcements';
        break;
      case 'new_agents':
        emailType = 'newAgents';
        break;
      case 'new_tools':
        emailType = 'newTools';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid update type'
        });
    }
    
    // Create campaign record
    const campaignId = await emailNotificationModel.createCampaign({
      title,
      content,
      type: updateType,
      createdBy: req.user.uid
    });
    
    // Mark as sending
    await emailNotificationModel.markCampaignAsSending(campaignId);
    
    // Dispatch the email sending task (this would typically be a background job)
    // For simplicity, we're doing it synchronously here
    const users = await emailNotificationModel.getUsersByPreferences({ 
      emailTypes: [emailType] 
    });
    
    if (users.length === 0) {
      await emailNotificationModel.markCampaignAsCompleted(campaignId, 0, 0);
      
      return res.status(200).json({
        success: true,
        message: 'No recipients found with matching preferences',
        data: { campaignId, recipientCount: 0 }
      });
    }
    
    // Prepare to track success/failure
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];
    
    // Send emails to each user
    for (const user of users) {
      try {
        const result = await emailService.sendUpdateEmail({
          userId: user.id,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          title,
          content,
          updateType
        });
        
        // Log success
        await emailNotificationModel.logEmailSend({
          campaignId,
          type: updateType,
          userId: user.id,
          email: user.email,
          success: true,
          messageId: result.messageId
        });
        
        sentCount++;
      } catch (error) {
        // Log failure
        await emailNotificationModel.logEmailSend({
          campaignId,
          type: updateType,
          userId: user.id,
          email: user.email,
          success: false,
          error: error.message
        });
        
        failedCount++;
        errors.push({
          userId: user.id,
          email: user.email,
          error: error.message
        });
        
        logger.error(`Failed to send update email to ${user.email}: ${error.message}`);
      }
    }
    
    // Mark campaign as completed
    await emailNotificationModel.markCampaignAsCompleted(
      campaignId, 
      sentCount, 
      failedCount,
      errors
    );
    
    res.status(200).json({
      success: true,
      message: 'Update email campaign completed',
      data: {
        campaignId,
        recipientCount: users.length,
        sentCount,
        failedCount
      }
    });
  } catch (error) {
    logger.error(`Error sending update emails: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to complete update email campaign',
      error: error.message
    });
  }
};

/**
 * Send a global announcement to all users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendGlobalAnnouncement = async (req, res) => {
  try {
    const { title, content, sendToAll } = req.body;
    
    // Validate inputs
    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and content are required' 
      });
    }
    
    // Create campaign record
    const campaignId = await emailNotificationModel.createCampaign({
      title,
      content,
      type: 'global_announcement',
      sendToAll: !!sendToAll,
      createdBy: req.user.uid
    });
    
    // Mark as sending
    await emailNotificationModel.markCampaignAsSending(campaignId);
    
    // Get users based on preferences (or all if sendToAll is true)
    const users = sendToAll 
      ? await emailNotificationModel.getUsersByPreferences({})
      : await emailNotificationModel.getUsersByPreferences({ 
          emailTypes: ['announcements'] 
        });
    
    if (users.length === 0) {
      await emailNotificationModel.markCampaignAsCompleted(campaignId, 0, 0);
      
      return res.status(200).json({
        success: true,
        message: 'No recipients found',
        data: { campaignId, recipientCount: 0 }
      });
    }
    
    // Prepare to track success/failure
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];
    
    // Send emails to each user
    for (const user of users) {
      try {
        const result = await emailService.sendGlobalEmail({
          userId: user.id,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          title,
          content
        });
        
        // Log success
        await emailNotificationModel.logEmailSend({
          campaignId,
          type: 'global_announcement',
          userId: user.id,
          email: user.email,
          success: true,
          messageId: result.messageId
        });
        
        sentCount++;
      } catch (error) {
        // Log failure
        await emailNotificationModel.logEmailSend({
          campaignId,
          type: 'global_announcement',
          userId: user.id,
          email: user.email,
          success: false,
          error: error.message
        });
        
        failedCount++;
        errors.push({
          userId: user.id,
          email: user.email,
          error: error.message
        });
        
        logger.error(`Failed to send global announcement to ${user.email}: ${error.message}`);
      }
    }
    
    // Mark campaign as completed
    await emailNotificationModel.markCampaignAsCompleted(
      campaignId, 
      sentCount, 
      failedCount,
      errors
    );
    
    res.status(200).json({
      success: true,
      message: 'Global announcement campaign completed',
      data: {
        campaignId,
        recipientCount: users.length,
        sentCount,
        failedCount
      }
    });
  } catch (error) {
    logger.error(`Error sending global announcement: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to complete global announcement campaign',
      error: error.message
    });
  }
};

/**
 * Get email campaign statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getEmailStats = async (req, res) => {
  try {
    const stats = await emailNotificationModel.getEmailPreferenceStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`Error getting email statistics: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve email statistics',
      error: error.message
    });
  }
};

/**
 * Update a user's email preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateEmailPreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;
    
    // Validate user ID
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }
    
    // Check if the user is updating their own preferences or if admin
    if (userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update preferences for this user'
      });
    }
    
    // Validate preferences
    const validPreferences = [
      'weeklyUpdates',
      'announcements',
      'newAgents',
      'newTools',
      'marketingEmails'
    ];
    
    const sanitizedPreferences = {};
    
    validPreferences.forEach(pref => {
      sanitizedPreferences[pref] = preferences[pref] === true;
    });
    
    // Update preferences
    await emailNotificationModel.updateUserEmailPreferences(
      userId, 
      sanitizedPreferences
    );
    
    res.status(200).json({
      success: true,
      message: 'Email preferences updated successfully',
      data: sanitizedPreferences
    });
  } catch (error) {
    logger.error(`Error updating email preferences: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to update email preferences',
      error: error.message
    });
  }
};

/**
 * Send an update notification email to specific users by userIds
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendUpdateToUsers = async (req, res) => {
  try {
    const { title, content, updateType, userIds } = req.body;
    
    // Validate inputs
    if (!title || !content || !updateType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, content, and update type are required' 
      });
    }
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one user ID must be provided'
      });
    }
    
    // Create campaign record
    const campaignId = await emailNotificationModel.createCampaign({
      title,
      content,
      type: updateType,
      createdBy: req.user.uid,
      targetUserIds: userIds
    });
    
    // Mark as sending
    await emailNotificationModel.markCampaignAsSending(campaignId);
    
    // Get user data for the specified userIds
    const usersSnapshot = await Promise.all(
      userIds.map(userId => db.collection('users').doc(userId).get())
    );
    
    // Filter out non-existent users and prepare user data
    const users = usersSnapshot
      .filter(doc => doc.exists)
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    
    if (users.length === 0) {
      await emailNotificationModel.markCampaignAsCompleted(campaignId, 0, 0);
      
      return res.status(200).json({
        success: true,
        message: 'No valid recipients found',
        data: { campaignId, recipientCount: 0 }
      });
    }
    
    // Prepare to track success/failure
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];
    
    // Check user preferences based on update type
    const prefField = 
      updateType === 'weeklyUpdates' ? 'weeklyUpdates' :
      updateType === 'new_agents' ? 'newAgents' :
      updateType === 'new_tools' ? 'newTools' : null;
    
    // Send emails to each user who has the preference enabled
    for (const user of users) {
      // Skip if user has opt-out of this notification type
      if (prefField && 
          user.emailPreferences && 
          user.emailPreferences[prefField] === false) {
        logger.info(`Skipped sending to ${user.email} - user has disabled ${prefField} notifications`);
        continue;
      }
      
      try {
        let result;
        
        // For custom emails, send without template wrapping
        if (updateType === 'custom') {
          // Send custom email without template
          result = await emailService.sendEmail({
            to: user.email,
            subject: title,
            html: `<div style="font-family: Arial, sans-serif; color: #333;">
                    ${content}
                    <hr>
                    <p style="font-size: 12px; color: #777;">
                      This email was sent from AI Waverider. 
                      If you no longer wish to receive these emails, you can 
                      <a href="${config.websiteUrl}/profile">unsubscribe</a> from your profile settings.
                    </p>
                  </div>`
          });
        } else {
          // Use the regular template for non-custom emails
          result = await emailService.sendUpdateEmail({
            userId: user.id,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            title,
            content,
            updateType
          });
        }
        
        // Log success
        await emailNotificationModel.logEmailSend({
          campaignId,
          type: updateType,
          userId: user.id,
          email: user.email,
          success: true,
          messageId: result.messageId
        });
        
        sentCount++;
      } catch (error) {
        // Log failure
        await emailNotificationModel.logEmailSend({
          campaignId,
          type: updateType,
          userId: user.id,
          email: user.email,
          success: false,
          error: error.message
        });
        
        failedCount++;
        errors.push({
          userId: user.id,
          email: user.email,
          error: error.message
        });
        
        logger.error(`Failed to send update email to ${user.email}: ${error.message}`);
      }
    }
    
    // Mark campaign as completed
    await emailNotificationModel.markCampaignAsCompleted(
      campaignId, 
      sentCount, 
      failedCount,
      errors
    );
    
    res.status(200).json({
      success: true,
      message: 'Update email campaign completed',
      data: {
        campaignId,
        recipientCount: users.length,
        sentCount,
        failedCount
      }
    });
  } catch (error) {
    logger.error(`Error sending targeted update emails: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to complete update email campaign',
      error: error.message
    });
  }
};

/**
 * Send a custom email to specific recipients
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendCustomEmail = async (req, res) => {
  try {
    const { subject, content, recipientType, recipients } = req.body;
    
    // Validate inputs
    if (!subject || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject and content are required' 
      });
    }
    
    // Create campaign record
    const campaignId = await emailNotificationModel.createCampaign({
      title: subject,
      content,
      type: 'custom',
      recipientType,
      createdBy: req.user.uid,
      specificEmails: recipientType === 'specific' ? recipients.split(',').map(e => e.trim()) : null
    });
    
    // Mark as sending
    await emailNotificationModel.markCampaignAsSending(campaignId);
    
    // Get user data based on recipient type
    let users = [];
    
    if (recipientType === 'specific' && recipients) {
      // For specific emails
      const emails = recipients.split(',').map(email => email.trim()).filter(email => email);
      
      if (emails.length === 0) {
        await emailNotificationModel.markCampaignAsCompleted(campaignId, 0, 0);
        
        return res.status(200).json({
          success: true,
          message: 'No valid recipients specified',
          data: { campaignId, recipientCount: 0 }
        });
      }
      
      // Get user data for these emails if they exist in our system
      const usersSnapshot = await db.collection('users')
        .where('email', 'in', emails.slice(0, 10)) // Firestore limit for 'in' queries
        .get();
      
      users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Add any emails not found as users
      const foundEmails = users.map(u => u.email);
      const notFoundEmails = emails.filter(email => !foundEmails.includes(email));
      
      // Add placeholder users for these emails
      notFoundEmails.forEach(email => {
        users.push({
          id: null,
          email,
          firstName: '',
          lastName: ''
        });
      });
    } else {
      // For user groups (all, premium, free)
      let query = db.collection('users');
      
      if (recipientType === 'premium') {
        query = query.where('accountType', '==', 'premium');
      } else if (recipientType === 'free') {
        query = query.where('accountType', '==', 'free');
      }
      
      const usersSnapshot = await query.get();
      
      users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    if (users.length === 0) {
      await emailNotificationModel.markCampaignAsCompleted(campaignId, 0, 0);
      
      return res.status(200).json({
        success: true,
        message: 'No recipients found',
        data: { campaignId, recipientCount: 0 }
      });
    }
    
    // Prepare to track success/failure
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];
    
    // Send emails to each recipient
    for (const user of users) {
      try {
        // Use the dedicated custom email function that uses a template
        const result = await emailService.sendCustomEmail({
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          subject: subject,
          content: content
        });
        
        // Log success
        await emailNotificationModel.logEmailSend({
          campaignId,
          type: 'custom',
          userId: user.id,
          email: user.email,
          success: true,
          messageId: result.messageId
        });
        
        sentCount++;
      } catch (error) {
        // Log failure
        await emailNotificationModel.logEmailSend({
          campaignId,
          type: 'custom',
          userId: user.id,
          email: user.email,
          success: false,
          error: error.message
        });
        
        failedCount++;
        errors.push({
          userId: user.id,
          email: user.email,
          error: error.message
        });
        
        logger.error(`Failed to send custom email to ${user.email}: ${error.message}`);
      }
    }
    
    // Mark campaign as completed
    await emailNotificationModel.markCampaignAsCompleted(
      campaignId, 
      sentCount, 
      failedCount,
      errors
    );
    
    res.status(200).json({
      success: true,
      message: 'Custom email campaign completed',
      data: {
        campaignId,
        recipientCount: users.length,
        sentCount,
        failedCount
      }
    });
  } catch (error) {
    logger.error(`Error sending custom emails: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to complete custom email campaign',
      error: error.message
    });
  }
};

module.exports = exports; 