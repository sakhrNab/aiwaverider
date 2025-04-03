/**
 * Email Service
 * 
 * This module provides functionality for sending emails including:
 * - Templated emails for various purposes (purchase confirmation, password reset, etc.)
 * - Support for attachments
 * - Development mode with Ethereal email for testing
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

let transporter = null;
const templateCache = {};

/**
 * Create and configure a nodemailer transporter
 * @returns {Promise<Object>} - Configured nodemailer transporter
 */
const createTransporter = async () => {
  // If we already have a transporter, return it
  if (transporter) {
    return transporter;
  }
  
  // Check if we're in production or development
  if (process.env.NODE_ENV === 'production') {
    // Use real email provider in production
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    logger.info('Production email transporter created');
  } else {
    // For development, use Ethereal for testing
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    logger.info('Development email transporter created with Ethereal');
    logger.debug(`Ethereal credentials: ${testAccount.user} / ${testAccount.pass}`);
  }
  
  return transporter;
};

/**
 * Get email template content
 * @param {string} templateName - Name of the template file (without extension)
 * @returns {Promise<string>} - The template content
 */
const getEmailTemplate = async (templateName) => {
  // Check if the template is already cached
  if (templateCache[templateName]) {
    return templateCache[templateName];
  }
  
  const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
  
  try {
    // Check if the template file exists
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Email template not found: ${templateName}`);
    }
    
    // Read the template file
    const template = fs.readFileSync(templatePath, 'utf8');
    
    // Cache the template for future use
    templateCache[templateName] = template;
    
    return template;
  } catch (error) {
    logger.error(`Error reading email template ${templateName}: ${error.message}`);
    
    // Return a basic fallback template
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 10px; text-align: center; }
          .content { padding: 20px; }
          .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>{{subject}}</h2>
          </div>
          <div class="content">
            <p>Hello {{name}},</p>
            <p>{{message}}</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AI Wave Rider. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
};

/**
 * Replace template variables with actual values
 * @param {string} template - Email template
 * @param {Object} variables - Object containing variables to replace
 * @returns {string} - Processed template
 */
const replaceTemplateVariables = (template, variables) => {
  let result = template;
  
  // Replace each variable in the template
  Object.keys(variables).forEach(key => {
    const value = variables[key] || '';
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  });
  
  // Replace any remaining template variables with empty string
  result = result.replace(/{{[^{}]+}}/g, '');
  
  return result;
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} [options.text] - Plain text version of the email
 * @param {Array} [options.attachments] - Email attachments
 * @returns {Promise<Object>} - Send result
 */
const sendEmail = async (options) => {
  try {
    // Create transporter if needed
    const transport = await createTransporter();
    
    // Set sender email from environment or use default
    const from = process.env.EMAIL_FROM || 'AI Wave Rider <noreply@aiwavesrider.com>';
    
    // Send the email
    const info = await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html,
      attachments: options.attachments || [],
    });
    
    // Log the result
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`Email sent to ${options.to}: ${info.messageId}`);
      logger.debug(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      logger.info(`Email sent to ${options.to}: ${info.messageId}`);
    }
    
    return info;
  } catch (error) {
    logger.error(`Error sending email to ${options.to}: ${error.message}`);
    throw error;
  }
};

/**
 * Send an agent purchase email with the template attached
 * @param {Object} options - Options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @param {Object} options.agent - Agent data
 * @param {string} options.templateContent - Agent template content
 * @param {string} options.orderId - Order ID
 * @returns {Promise<Object>} - Send result
 */
const sendAgentPurchaseEmail = async (options) => {
  try {
    // Get email template
    const emailTemplate = await getEmailTemplate('agent_purchase');
    
    // Agent details
    const agent = options.agent || {};
    const agentName = agent.title || 'AI Agent';
    const agentDescription = agent.description || 'An AI agent to assist with your tasks';
    
    // Order details
    const orderDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    // Prepare variables for the template
    const variables = {
      name: options.name || 'Valued Customer',
      agentName,
      agentDescription,
      orderDate,
      orderId: options.orderId || 'Unknown',
      supportEmail: process.env.SUPPORT_EMAIL || 'aiwaverider8@gmail.com',
      websiteUrl: process.env.WEBSITE_URL || 'https://aiwaverider.com',
    };
    
    // Replace template variables
    const html = replaceTemplateVariables(emailTemplate, variables);
    
    // Create a plain text version
    const text = `
      Thank you for your purchase of ${agentName}!
      
      Your agent template is attached to this email. Simply copy and paste it into your favorite AI platform to start using it.
      
      Order Details:
      - Order ID: ${options.orderId || 'Unknown'}
      - Date: ${orderDate}
      - Agent: ${agentName}
      
      If you have any questions, please contact us at ${variables.supportEmail}.
    `;
    
    // Create attachments array
    const attachments = [];
    
    // Add the template file
    attachments.push({
      filename: `${agentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.txt`,
      content: options.templateContent,
      contentType: 'text/plain',
    });
    
    // If the agent has an image, attach it too
    if (agent.imageUrl) {
      try {
        // For external URLs, we add them as a URL attachment
        if (agent.imageUrl.startsWith('http')) {
          attachments.push({
            filename: `${agentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_image.jpg`,
            path: agent.imageUrl,
          });
        }
        // For local files, we would read them from the filesystem
        // This is left as an exercise for implementation
      } catch (imageError) {
        logger.warn(`Could not attach agent image: ${imageError.message}`);
      }
    }
    
    // Send the email
    return await sendEmail({
      to: options.to,
      subject: `Your AI Agent Template: ${agentName}`,
      html,
      text,
      attachments,
    });
  } catch (error) {
    logger.error(`Error sending agent purchase email: ${error.message}`);
    throw error;
  }
};

/**
 * Send a welcome email to a new user
 * @param {Object} options - Options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @returns {Promise<Object>} - Send result
 */
const sendWelcomeEmail = async (options) => {
  try {
    // Get welcome email template
    const emailTemplate = await getEmailTemplate('welcome');
    
    // Prepare variables for the template
    const variables = {
      name: options.name || 'New User',
      websiteUrl: process.env.WEBSITE_URL || 'https://aiwavesrider.com',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@aiwavesrider.com',
    };
    
    // Replace template variables
    const html = replaceTemplateVariables(emailTemplate, variables);
    
    // Create a plain text version
    const text = `
      Welcome to AI Wave Rider!
      
      Thank you for joining our platform. We're excited to have you on board.
      
      If you have any questions, please contact us at ${variables.supportEmail}.
    `;
    
    // Send the email
    return await sendEmail({
      to: options.to,
      subject: 'Welcome to AI Wave Rider',
      html,
      text,
    });
  } catch (error) {
    logger.error(`Error sending welcome email: ${error.message}`);
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendAgentPurchaseEmail,
  sendWelcomeEmail,
  getEmailTemplate,
}; 