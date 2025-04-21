/**
 * Email Configuration
 * 
 * Configuration for email delivery service
 */

require('dotenv').config();

module.exports = {
  // SMTP Server Configuration
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  user: process.env.EMAIL_USER || 'user@example.com',
  password: process.env.EMAIL_PASSWORD || 'password',
  
  // Sender Information
  fromEmail: process.env.EMAIL_FROM || 'noreply@aiwaverider.com',
  fromName: process.env.EMAIL_FROM_NAME || 'AI Wave Rider',
  
  // Website Information (for links in emails)
  websiteUrl: process.env.WEBSITE_URL || 'https://aiwaverider.com',
  
  // Support Contact
  supportEmail: process.env.SUPPORT_EMAIL || 'support@aiwaverider.com',
  
  // Default email sending limits
  rateLimit: {
    maxEmails: parseInt(process.env.MAX_EMAILS_PER_BATCH || '100', 10), // Max emails to send in one batch
    batchInterval: parseInt(process.env.EMAIL_BATCH_INTERVAL || '3600000', 10), // Interval between batches in ms (default 1 hour)
    maxPerUser: parseInt(process.env.MAX_EMAILS_PER_USER || '5', 10) // Max emails to send to one user per day
  }
}; 