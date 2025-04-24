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
const Handlebars = require('handlebars');

// Register Handlebars helpers
Handlebars.registerHelper('times', function(n, block) {
  var accum = '';
  for(var i = 0; i < n; ++i)
    accum += block.fn(i);
  return accum;
});

Handlebars.registerHelper('formatPrice', function(price) {
  if (!price && price !== 0) return 'Free';
  if (price === 0) return 'Free';
  return `$${parseFloat(price).toFixed(2)}`;
});

Handlebars.registerHelper('formatDate', function(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

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
    // Define template path
    let templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
    logger.info(`Loading email template from: ${templatePath}`);
    
    // Check if file exists
    try {
      await fs.access(templatePath);
    } catch (error) {
      // Try fallback template names if the original doesn't exist
      const fallbacks = {
        'custom': ['custom_email', 'custom-email'],
        'custom_email': ['custom', 'custom-email'],
        'custom-email': ['custom', 'custom_email'],
        'update': ['weekly_update', 'weekly-update'],
        'weekly_update': ['update', 'weekly-update'],
        'weekly-update': ['update', 'weekly_update']
      };
      
      if (fallbacks[templateName]) {
        // Try each fallback in order
        for (const fallback of fallbacks[templateName]) {
          const fallbackPath = path.join(__dirname, '..', 'templates', 'emails', `${fallback}.html`);
          try {
            await fs.access(fallbackPath);
            logger.info(`Template '${templateName}' not found, using fallback: ${fallback}`);
            templatePath = fallbackPath;
            break;
          } catch (fbError) {
            // Continue to next fallback
          }
        }
      }
      
      // If we still can't find a template, throw the original error
      try {
        await fs.access(templatePath);
      } catch (finalError) {
        logger.error(`Template file does not exist: ${templatePath}`);
        throw new Error(`Email template '${templateName}' does not exist`);
      }
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
    // Log all incoming data for debugging purposes
    logger.info(`Sending custom email to: ${emailData.email}`);
    logger.info(`Email type: ${emailData.emailType || 'custom'}`);
    logger.debug(`Email data: ${JSON.stringify({
      subject: emailData.subject,
      title: emailData.title,
      headerTitle: emailData.headerTitle,
      content: emailData.content ? '[CONTENT LENGTH: ' + emailData.content.length + ' chars]' : 'No content'
    })}`);

    // Determine which template to use
    let templateName = 'custom';
    let subject = emailData.subject || emailData.title || 'Message from AI Waverider';
    
    // Check for specific email types and adjust template accordingly
    if (emailData.emailType === 'agent' || emailData.updateType === 'new_agents') {
      templateName = 'new_agents';
      subject = emailData.title || 'New AI Agents Available!';
    } else if (emailData.emailType === 'tool' || emailData.updateType === 'new_tools') {
      templateName = 'new_tools';
      subject = emailData.title || 'New AI Tools Released!';
    }
    
    logger.info(`Using template: ${templateName} for email to ${emailData.email}`);
    
    // Ensure we have all the required data
    if (!emailData.content) {
      throw new Error('Email content is required');
    }
    
    // Try to use the selected template if it exists
    let html;
    try {
      // Try to get the appropriate template
      const template = await getCompiledTemplate(templateName);
      
      // Prepare the data for the template
      const data = {
        name: emailData.firstName ? `${emailData.firstName}` : 'there',
        title: emailData.title || subject,
        headerTitle: emailData.headerTitle || emailData.title || subject, // Use headerTitle if provided, otherwise fall back to title or subject
        subject: subject,
        content: emailData.content,
        websiteUrl: config.websiteUrl,
        supportEmail: config.supportEmail,
        currentYear: new Date().getFullYear(),
        actionUrl: emailData.actionUrl || config.websiteUrl,
        actionText: emailData.actionText || 'Visit Website',
        imageUrl: emailData.imageUrl || null
      };
      
      // Log the data being passed to the template
      logger.debug(`Template data for ${templateName}: ${JSON.stringify({
        headerTitle: data.headerTitle,
        subject: data.subject,
        title: data.title
      })}`);
      
      // Render the HTML content with the template
      html = template(data);
      logger.info(`Successfully rendered email using ${templateName} template`);
    } catch (templateError) {
      // If template doesn't exist or fails, use fallback inline template
      logger.warning(`Template ${templateName} not found or error rendering, using fallback HTML: ${templateError.message}`);
      html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h1 style="color: #4a86e8;">${emailData.headerTitle || subject}</h1>
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
    
    // Add extra headers to improve deliverability
    const headers = {
      'X-Priority': '3',
      'List-Unsubscribe': `<mailto:unsubscribe@${config.fromEmail.split('@')[1]}?subject=unsubscribe>`,
      'X-Report-Abuse': `Please report abuse to ${config.supportEmail}`
    };
    
    // Send the email
    const result = await sendEmail({
      to: emailData.email,
      subject: subject,
      html: html,
      headers: headers
    });
    
    logger.info(`Custom email sent successfully to ${emailData.email} with message ID: ${result.messageId}`);
    return result;
  } catch (error) {
    logger.error(`Failed to send custom email: ${error.message}`);
    throw error;
  }
};

/**
 * Send an agent update email to user
 * @param {Object} options - Email sending options
 * @returns {Promise} - Email send result
 */
exports.sendAgentUpdateEmail = async (options) => {
  const {
    email,
    name,
    title = 'New AI Agents Available',
    content,
    latestAgents = []
  } = options;
  
  try {
    // Ensure we have agents to display
    let agentsToDisplay = latestAgents;
    
    // If no agents provided, fetch latest 5 as fallback
    if (!agentsToDisplay || agentsToDisplay.length === 0) {
      console.log('No agents provided to email service. Fetching latest agents as fallback.');
      
      const agentsController = require('../controllers/agentsController');
      agentsToDisplay = await agentsController.getLatestAgents(5);
      
      console.log(`Fetched ${agentsToDisplay.length} agents as fallback`);
      
      // If we still have no agents, create sample ones 
      if (!agentsToDisplay || agentsToDisplay.length === 0) {
        console.log('Falling back to sample agents as no agents found in database');
        agentsToDisplay = getSampleAgentsForEmail();
      }
    }
    
    // Log agents for debugging
    if (agentsToDisplay.length > 0) {
      console.log(`Sending email with ${agentsToDisplay.length} agents`);
      console.log('First agent data:', JSON.stringify(agentsToDisplay[0], null, 2).substring(0, 500) + '...');
    } else {
      console.log('Warning: No agents available for email notification');
    }
    
    // Get the compiled template
    const template = await getCompiledTemplate('new_agents');
    
    // Prepare template data
    const templateData = {
      title,
      name,
      content,
      latestAgents: agentsToDisplay,
      supportEmail: config.supportEmail,
      websiteUrl: config.websiteUrl,
      currentYear: new Date().getFullYear()
    };
    
    // Render the template with data
    const html = template(templateData);
    
    // Send the email
    return await sendEmail({
      to: email,
      subject: title,
      html
    });
  } catch (error) {
    logger.error(`Error sending agent update email: ${error.message}`);
    throw error;
  }
};

/**
 * Get sample agents for email template when real ones are not available
 * @returns {Array} - Array of sample agent objects
 */
function getSampleAgentsForEmail() {
  // Create sample agent data for fallback
  return [
    {
      id: 'sample-001',
      name: 'AI Personal Tutor',
      url: `${config.websiteUrl}/agents/ai-personal-tutor`,
      imageUrl: `${config.websiteUrl}/images/agents/tutor.png`,
      creator: { name: 'AI Waverider' },
      rating: { average: 4, count: 128 },
      price: 49.99,
      priceDetails: {
        originalPrice: 69.99,
        discountPercentage: 28
      }
    },
    {
      id: 'sample-002',
      name: 'Social Media Manager',
      url: `${config.websiteUrl}/agents/social-media-manager`,
      imageUrl: `${config.websiteUrl}/images/agents/social.png`,
      creator: { name: 'AI Waverider' },
      rating: { average: 5, count: 87 },
      price: 39.99
    },
    {
      id: 'sample-003',
      name: 'AI Writing Assistant',
      url: `${config.websiteUrl}/agents/writing-assistant`,
      imageUrl: `${config.websiteUrl}/images/agents/writing.png`,
      creator: { name: 'AI Waverider' },
      rating: { average: 4, count: 215 },
      price: 29.99,
      priceDetails: {
        originalPrice: 49.99,
        discountPercentage: 40
      }
    },
    {
      id: 'sample-004',
      name: 'Financial Advisor',
      url: `${config.websiteUrl}/agents/financial-advisor`,
      imageUrl: `${config.websiteUrl}/images/agents/finance.png`,
      creator: { name: 'AI Waverider' },
      rating: { average: 4, count: 76 },
      price: 59.99
    },
    {
      id: 'sample-005',
      name: 'Fitness Coach',
      url: `${config.websiteUrl}/agents/fitness-coach`,
      imageUrl: `${config.websiteUrl}/images/agents/fitness.png`,
      creator: { name: 'AI Waverider' },
      rating: { average: 5, count: 93 },
      price: 34.99
    }
  ];
} 