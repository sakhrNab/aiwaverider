/**
 * Email Service
 * 
 * Handles email sending functionality for various types of emails.
 * Uses Nodemailer for email delivery and Handlebars for template rendering.
 */

const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const config = require('../config/email');
const logger = require('../utils/logger');

// Cache for compiled email templates
const templateCache = {};

/**
 * Load and compile an email template
 * @param {string} templateName - Name of the template file without extension
 * @returns {Promise<Function>} - Compiled Handlebars template function
 */
async function getCompiledTemplate(templateName) {
  // Check if template is already cached
  if (templateCache[templateName]) {
    return templateCache[templateName];
  }
  
  try {
    // Load template file
    const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
    logger.info(`Loading email template from: ${templatePath}`);
    
    // Check if file exists
    try {
      await fs.access(templatePath);
    } catch (error) {
      logger.error(`Template file does not exist: ${templatePath}`);
      throw new Error(`Email template '${templateName}' does not exist`);
    }
    
    const templateSource = await fs.readFile(templatePath, 'utf-8');
    
    // Compile template
    const compiledTemplate = handlebars.compile(templateSource);
    
    // Cache for future use
    templateCache[templateName] = compiledTemplate;
    
    logger.info(`Successfully loaded and compiled template: ${templateName}`);
    return compiledTemplate;
  } catch (error) {
    logger.error(`Failed to load email template '${templateName}': ${error.message}`);
    throw new Error(`Email template '${templateName}' could not be loaded: ${error.message}`);
  }
}

/**
 * Create email transport based on configuration
 * @returns {Object} - Nodemailer transporter
 */
function createTransport() {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true for 465, false for other ports
    auth: {
      user: config.user,
      pass: config.password
    }
  });
}

/**
 * Send an email using the configured transport
 * @param {Object} mailOptions - Nodemailer mail options
 * @returns {Promise<Object>} - Email send result
 */
const sendEmail = async function(mailOptions) {
  try {
    const transporter = createTransport();
    
    // Add default from address if not provided
    if (!mailOptions.from) {
      mailOptions.from = `"${config.fromName}" <${config.fromEmail}>`;
    }
    
    // Add anti-spam headers to improve deliverability
    mailOptions.headers = {
      ...mailOptions.headers,
      'List-Unsubscribe': '<https://aiwaverider.com/unsubscribe>',
      'Precedence': 'bulk',
      'X-AI-Waverider': 'notification'
    };
    
    // Add text version if HTML is provided but no text (helps deliverability)
    if (mailOptions.html && !mailOptions.text) {
      // Simple HTML to text conversion
      mailOptions.text = mailOptions.html
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ')    // Normalize spaces
        .trim();
    }
    
    // Log the email attempt with redacted content
    logger.email(`Attempting to send email to ${mailOptions.to} with subject: "${mailOptions.subject}"`);
    logger.email(`Email configuration: host=${config.host}, port=${config.port}, secure=${config.secure}, user=${config.user}`);
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    logger.email(`Email sent successfully: ${info.messageId}`);
    logger.info(`Email sent: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    logger.error(`Failed to send email: ${error.message}`);
    logger.email(`Email sending failed: ${error.message}`);
    throw error;
  }
};

// Export sendEmail
exports.sendEmail = sendEmail;

/**
 * Send a welcome email to a new user
 * @param {Object} userData - User data for the email
 * @returns {Promise<Object>} - Email send result
 */
exports.sendWelcomeEmail = async (userData) => {
  try {
    // Get the welcome email template
    const template = await getCompiledTemplate('welcome');
    
    // Prepare the data for the template
    const data = {
      name: userData.firstName ? `${userData.firstName}` : 'there',
      websiteUrl: config.websiteUrl,
      supportEmail: config.supportEmail
    };
    
    // Render the HTML content with the data
    const html = template(data);
    
    // Send the email
    return await sendEmail({
      to: userData.email,
      subject: 'Welcome to AI Waverider!',
      html
    });
  } catch (error) {
    logger.error(`Failed to send welcome email: ${error.message}`);
    throw error;
  }
};

/**
 * Send a test email to verify configuration
 * @param {string} emailAddress - Recipient email address
 * @returns {Promise<Object>} - Email send result
 */
exports.sendTestEmail = async (emailAddress) => {
  try {
    // Send a simple test email
    return await sendEmail({
      to: emailAddress,
      subject: 'AI Waverider - Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h1 style="color: #4a86e8;">Email Configuration Test</h1>
          <p>This is a test email to verify that your email configuration is working correctly.</p>
          <p>If you're receiving this email, it means your email service is properly configured!</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <hr>
          <p style="font-size: 12px; color: #777;">
            This is an automated message from AI Waverider.
            Please do not reply to this email.
          </p>
        </div>
      `
    });
  } catch (error) {
    logger.error(`Failed to send test email: ${error.message}`);
    throw error;
  }
};

/**
 * Send an update notification email to users
 * @param {Object} emailData - Email content and user data
 * @returns {Promise<Object>} - Email send result
 */
exports.sendUpdateEmail = async (emailData) => {
  try {
    // Determine the appropriate template based on update type
    let templateName = 'weekly_update';
    let subjectPrefix = 'Weekly Update:';
    
    // Use different templates for different update types
    switch(emailData.updateType) {
      case 'weekly':
      case 'update':
        templateName = 'weekly_update';
        subjectPrefix = 'Weekly Update:';
        break;
      case 'announcements':
        templateName = 'announcement';
        subjectPrefix = 'Announcement:';
        break;
      case 'new_agents':
        templateName = 'new_agents'; // Try to use dedicated template
        try {
          await fs.access(path.join(__dirname, '..', 'templates', 'emails', 'new_agents.html'));
        } catch (error) {
          // Fallback to weekly_update if new_agents template doesn't exist
          templateName = 'weekly_update';
          logger.info(`new_agents template not found, falling back to weekly_update`);
        }
        subjectPrefix = 'New AI Agents:';
        break;
      case 'new_tools':
        templateName = 'new_tools'; // Try to use dedicated template
        try {
          await fs.access(path.join(__dirname, '..', 'templates', 'emails', 'new_tools.html'));
        } catch (error) {
          // Fallback to weekly_update if new_tools template doesn't exist
          templateName = 'weekly_update';
          logger.info(`new_tools template not found, falling back to weekly_update`);
        }
        subjectPrefix = 'New AI Tools:';
        break;
      case 'notification':
        templateName = 'notification';
        subjectPrefix = 'Notification:';
        break;
      default:
        // For unrecognized types, use the notification template
        templateName = 'notification';
        subjectPrefix = 'Update:';
        logger.info(`Unknown update type: ${emailData.updateType}, using notification template`);
    }
    
    logger.info(`Sending ${emailData.updateType} email using ${templateName} template`);
    
    // Get the template
    const template = await getCompiledTemplate(templateName);
    
    // Prepare the data
    const data = {
      name: emailData.firstName ? `${emailData.firstName}` : 'there',
      title: emailData.title,
      content: emailData.content,
      websiteUrl: config.websiteUrl,
      supportEmail: config.supportEmail,
      updateType: emailData.updateType,
      currentYear: new Date().getFullYear()
    };
    
    // Render the HTML
    const html = template(data);
    
    // Send the email
    return await sendEmail({
      to: emailData.email,
      subject: `${subjectPrefix} ${emailData.title}`,
      html
    });
  } catch (error) {
    logger.error(`Failed to send update email: ${error.message}`);
    throw error;
  }
};

/**
 * Send a global announcement email to all users
 * @param {Object} emailData - Email content and user data
 * @returns {Promise<Object>} - Email send result
 */
exports.sendGlobalEmail = async (emailData) => {
  try {
    // Get the announcement template
    const template = await getCompiledTemplate('announcement');
    
    // Prepare the data
    const data = {
      name: emailData.firstName ? `${emailData.firstName}` : 'there',
      title: emailData.title,
      content: emailData.content,
      websiteUrl: config.websiteUrl,
      supportEmail: config.supportEmail,
      currentYear: new Date().getFullYear()
    };
    
    // Render the HTML
    const html = template(data);
    
    // Send the email
    return await sendEmail({
      to: emailData.email,
      subject: `Important: ${emailData.title}`,
      html
    });
  } catch (error) {
    logger.error(`Failed to send global email: ${error.message}`);
    throw error;
  }
};

/**
 * Sends an agent purchase confirmation email
 * @param {Object} purchaseData - Purchase and user data
 * @returns {Promise<Object>} - Email send result
 */
exports.sendAgentPurchaseEmail = async (purchaseData) => {
  try {
    // Get the agent purchase template
    const template = await getCompiledTemplate('agent_purchase');
    
    // Prepare the data
    const data = {
      name: purchaseData.firstName ? `${purchaseData.firstName}` : 'there',
      agentName: purchaseData.agentName,
      agentDescription: purchaseData.agentDescription,
      purchaseDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      price: purchaseData.price.toFixed(2),
      currency: purchaseData.currency || 'USD',
      receiptUrl: purchaseData.receiptUrl,
      websiteUrl: config.websiteUrl,
      supportEmail: config.supportEmail,
      currentYear: new Date().getFullYear()
    };
    
    // Render the HTML
    const html = template(data);
    
    // Send the email
    return await sendEmail({
      to: purchaseData.email,
      subject: `Your AI Agent Purchase: ${purchaseData.agentName}`,
      html
    });
  } catch (error) {
    logger.error(`Failed to send agent purchase email: ${error.message}`);
    throw error;
  }
};

/**
 * Send a custom email without a template
 * @param {Object} emailData - Email content and recipient data
 * @returns {Promise<Object>} - Email send result
 */
exports.sendCustomEmail = async (emailData) => {
  try {
    // Try to use a custom template if it exists, otherwise use inline HTML
    let html;
    
    try {
      // Try to get the custom email template
      const template = await getCompiledTemplate('custom_email');
      
      // Prepare the data for the template
      const data = {
        name: emailData.firstName ? `${emailData.firstName}` : 'there',
        title: emailData.subject,
        content: emailData.content,
        websiteUrl: config.websiteUrl,
        supportEmail: config.supportEmail,
        currentYear: new Date().getFullYear()
      };
      
      // Render the HTML content with the template
      html = template(data);
      logger.info('Using custom_email template for custom email');
    } catch (templateError) {
      // If template doesn't exist, use a simple inline template
      logger.info('Custom email template not found, using inline HTML');
      html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h1 style="color: #4a86e8;">${emailData.subject}</h1>
          <div>${emailData.content}</div>
          <hr>
          <p style="font-size: 12px; color: #777;">
            This email was sent from AI Waverider. 
            If you no longer wish to receive these emails, you can 
            <a href="${config.websiteUrl}/unsubscribe">unsubscribe</a> from your profile settings.
          </p>
        </div>
      `;
    }
    
    // Send the email
    return await sendEmail({
      to: emailData.email,
      subject: emailData.subject,
      html
    });
  } catch (error) {
    logger.error(`Failed to send custom email: ${error.message}`);
    throw error;
  }
}; 