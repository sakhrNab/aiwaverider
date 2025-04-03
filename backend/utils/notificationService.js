/**
 * Notification Service
 * 
 * Handles sending notifications through various channels like email, in-app notifications,
 * and potentially SMS or push notifications in the future.
 */

const admin = require('firebase-admin');
const logger = require('./logger');
const mailer = require('./mailer');

// Initialize Firestore
const db = admin.firestore();

// Notification Types
const NOTIFICATION_TYPES = {
  ORDER_SUCCESS: 'order_success',
  WELCOME: 'welcome',
  SHIPPING_UPDATE: 'shipping_update',
  PAYMENT_FAILED: 'payment_failed',
  GENERAL: 'general'
};

// Notification Channels
const CHANNELS = {
  EMAIL: 'email',
  IN_APP: 'in_app',
  BOTH: 'both'
};

/**
 * Send a notification through specified channels
 * @param {Object} options - Notification options
 * @param {string} options.type - Notification type (see NOTIFICATION_TYPES)
 * @param {string} options.channel - Notification channel (email, in_app, both)
 * @param {string} options.userId - User ID (optional for in-app notifications)
 * @param {string} options.email - User's email (required for email notifications)
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {Object} options.data - Additional data specific to notification type
 * @returns {Promise<Object>} - Notification results
 */
const sendNotification = async (options) => {
  const { 
    type = NOTIFICATION_TYPES.GENERAL,
    channel = CHANNELS.BOTH,
    userId,
    email,
    title,
    message,
    data = {}
  } = options;

  logger.info(`Sending ${type} notification via ${channel} to ${userId || email}`);
  
  const results = {
    success: false,
    emailSent: false,
    inAppSent: false,
    errors: []
  };

  // Validate required fields
  if (!title || !message) {
    const error = 'Notification title and message are required';
    logger.error(error);
    results.errors.push(error);
    return results;
  }

  // Send in-app notification if requested
  if ((channel === CHANNELS.IN_APP || channel === CHANNELS.BOTH) && userId) {
    try {
      await sendInAppNotification({
        userId,
        type,
        title,
        message,
        data
      });
      results.inAppSent = true;
    } catch (error) {
      logger.error(`Failed to send in-app notification: ${error.message}`);
      results.errors.push(`In-app error: ${error.message}`);
    }
  }

  // Send email notification if requested
  if ((channel === CHANNELS.EMAIL || channel === CHANNELS.BOTH) && email) {
    try {
      await sendEmailNotification({
        email,
        type,
        title,
        message,
        data
      });
      results.emailSent = true;
    } catch (error) {
      logger.error(`Failed to send email notification: ${error.message}`);
      results.errors.push(`Email error: ${error.message}`);
    }
  }

  // Set overall success based on channel requirements
  if (channel === CHANNELS.BOTH) {
    results.success = results.emailSent && results.inAppSent;
  } else if (channel === CHANNELS.EMAIL) {
    results.success = results.emailSent;
  } else {
    results.success = results.inAppSent;
  }

  return results;
};

/**
 * Send in-app notification to a user
 * @param {Object} options - Notification options
 * @returns {Promise<void>}
 */
const sendInAppNotification = async (options) => {
  const { userId, type, title, message, data } = options;
  
  try {
    // Create notification document
    const notificationData = {
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Add to notifications collection
    await db.collection('notifications').add(notificationData);
    
    // Increment user's unread notification count
    const userRef = db.collection('users').doc(userId);
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const currentCount = userData.unreadNotifications || 0;
        
        transaction.update(userRef, {
          unreadNotifications: currentCount + 1,
          lastNotificationAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
    
    logger.info(`In-app notification sent to user: ${userId}`);
  } catch (error) {
    logger.error(`Error sending in-app notification: ${error.message}`);
    throw error;
  }
};

/**
 * Send email notification
 * @param {Object} options - Notification options
 * @returns {Promise<void>}
 */
const sendEmailNotification = async (options) => {
  const { email, type, title, message, data } = options;
  
  try {
    // Determine which email template to use based on notification type
    switch (type) {
      case NOTIFICATION_TYPES.ORDER_SUCCESS:
        await sendOrderSuccessEmail(email, data);
        break;
      case NOTIFICATION_TYPES.WELCOME:
        await sendWelcomeEmail(email, data);
        break;
      default:
        // For general notifications, use a simple email format
        await mailer.sendEmail({
          to: email,
          subject: title,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h1 style="color: #4a86e8;">${title}</h1>
            <p>${message}</p>
            ${data.additionalHtml || ''}
          </div>`,
          text: `${title}\n\n${message}`
        });
        break;
    }
    
    logger.info(`Email notification sent to: ${email}`);
  } catch (error) {
    logger.error(`Error sending email notification: ${error.message}`);
    throw error;
  }
};

/**
 * Send order success email notification
 * @param {string} email - Recipient email
 * @param {Object} data - Order data
 * @returns {Promise<void>}
 */
const sendOrderSuccessEmail = async (email, data) => {
  const { orderId, items, agent, orderTotal, userName } = data;
  
  try {
    // If there's an agent in the data, use the agent purchase email template
    if (agent) {
      await mailer.sendAgentPurchaseEmail({
        to: email,
        name: userName || 'Valued Customer',
        agent: agent,
        templateContent: data.templateContent || 'Your agent template will be available in your account.',
        orderId: orderId
      });
      return;
    }
    
    // Otherwise, use a general order confirmation email
    const orderDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Format items for display in email
    const itemsList = items && items.length > 0
      ? items.map(item => `<li>${item.name || item.title} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>`).join('')
      : '<li>Your purchased items</li>';
    
    await mailer.sendEmail({
      to: email,
      subject: `Order Confirmation #${orderId}`,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h1 style="color: #4a86e8;">Order Confirmation</h1>
        <p>Thank you for your order! Your order has been received and is being processed.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #4a86e8; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Order Date:</strong> ${orderDate}</p>
          <p><strong>Total:</strong> $${orderTotal?.toFixed(2) || '0.00'}</p>
        </div>
        
        <h2>Order Items:</h2>
        <ul>
          ${itemsList}
        </ul>
        
        <p>You can view your order details in your account dashboard.</p>
        <p>If you have any questions, please contact our support team.</p>
      </div>`,
      text: `Order Confirmation #${orderId}\n\nThank you for your order! Your order has been received and is being processed.\n\nOrder ID: ${orderId}\nOrder Date: ${orderDate}\nTotal: $${orderTotal?.toFixed(2) || '0.00'}\n\nOrder Items:\n${items.map(item => `- ${item.name || item.title} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}`
    });
  } catch (error) {
    logger.error(`Error sending order success email: ${error.message}`);
    throw error;
  }
};

/**
 * Send welcome email notification
 * @param {string} email - Recipient email
 * @param {Object} data - User data
 * @returns {Promise<void>}
 */
const sendWelcomeEmail = async (email, data) => {
  try {
    await mailer.sendWelcomeEmail({
      to: email,
      name: data.userName || data.displayName || 'New User',
      userId: data.userId
    });
  } catch (error) {
    logger.error(`Error sending welcome email: ${error.message}`);
    throw error;
  }
};

/**
 * Send order success notification
 * @param {Object} options - Notification options
 * @returns {Promise<Object>} - Notification results
 */
const sendOrderSuccessNotification = async (options) => {
  const { 
    orderId, 
    email, 
    userId = null, 
    items = [], 
    agent = null,
    orderTotal = 0,
    userName = null
  } = options;
  
  // Prepare title and message for the notification
  const title = 'Order Confirmation';
  const message = `Your order #${orderId} has been successfully processed.`;
  
  return sendNotification({
    type: NOTIFICATION_TYPES.ORDER_SUCCESS,
    channel: userId ? CHANNELS.BOTH : CHANNELS.EMAIL,
    userId,
    email,
    title,
    message,
    data: {
      orderId,
      items,
      agent,
      orderTotal,
      userName,
      templateContent: options.templateContent
    }
  });
};

// Export public methods and constants
module.exports = {
  NOTIFICATION_TYPES,
  CHANNELS,
  sendNotification,
  sendOrderSuccessNotification,
  sendInAppNotification,
  sendEmailNotification
}; 