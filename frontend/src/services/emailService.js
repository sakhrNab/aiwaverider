/**
 * Email Service
 * 
 * Frontend service to interact with the email API endpoints
 */

import { toast } from 'react-toastify';

/**
 * Base API URL from environment
 */
const API_URL = import.meta.env.VITE_API_URL;

/**
 * Send a test email
 * @param {string} email - Email address to send test to
 * @param {string} type - Type of test email (welcome, update, global, agent, tool, custom)
 * @param {Object} data - Additional data for the test email
 * @returns {Promise<Object>} - API response
 */
export const sendTestEmail = async (email, type = '', data = {}) => {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    let endpoint = `${API_URL}/api/email/test`;
    
    // Use specific endpoints based on type
    switch (type) {
      case 'welcome':
        endpoint = `${API_URL}/api/email/test-welcome`;
        break;
      case 'update':
        endpoint = `${API_URL}/api/email/test-update`;
        break;
      case 'global':
        endpoint = `${API_URL}/api/email/test-global`;
        break;
      case 'agent':
        endpoint = `${API_URL}/api/email/test-agent`;
        break;
      case 'send-agent-update':
        endpoint = `${API_URL}/api/email/test-agent-update`;
        break;
      case 'tool':
        endpoint = `${API_URL}/api/email/test-tool`;
        break;
      case 'custom':
        endpoint = `${API_URL}/api/email/test-custom`;
        break;
      default:
        console.warn(`Unknown email type: ${type}. Using default test endpoint.`);
    }
    
    // Ensure email is included in payload
    const payload = {
      email,
      ...data
    };
    
    console.log(`Sending test ${type} email to: ${email}`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to send test email: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(`API endpoint not available: ${endpoint}. Ensure the backend supports this email type.`);
      }
      throw error;
    }
  } catch (error) {
    console.error(`Test ${type} email error:`, error);
    throw error;
  }
};

/**
 * Send welcome email to a specific user
 * @param {Object} userData - User data (userId, email, firstName, lastName)
 * @returns {Promise<Object>} - API response
 */
export const sendWelcomeEmail = async (userData) => {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    const response = await fetch(`${API_URL}/api/email/welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to send welcome email');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Welcome email error:', error);
    throw error;
  }
};

/**
 * Send custom email to specific recipients
 * @param {Object} emailData - Email data
 * @returns {Promise<Object>} - API response
 */
export const sendCustomEmail = async (emailData) => {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    // Use different endpoints based on email type
    let endpoint = `${API_URL}/api/email/send-custom`;
    
    // Prepare the payload based on endpoint requirements
    let payload = { ...emailData };
    
    if (emailData.emailType === 'agent') {
      endpoint = `${API_URL}/api/email/send-agent-update`;
      
      // For agent/tool updates, ensure we have title, content and updateType
      if (!emailData.title || !emailData.content || !emailData.updateType) {
        throw new Error('Title, content, and update type are required for agent updates');
      }
      
      // Ensure the payload uses the expected field names for the backend
      if (emailData.subject && !emailData.title) {
        payload.title = emailData.subject;
      }
      
      // Convert recipients from comma-separated string to userIds array format
      // that is expected by the backend controller
      if (emailData.recipients && payload.recipientType === 'specific') {
        // Check if we have userIds already
        if (emailData.userIds) {
          payload.userIds = emailData.userIds;
        } 
        // Check if we have recipients string and need to convert to userIds
        else if (emailData.recipients && typeof emailData.recipients === 'string') {
          // If we have user IDs data available, use it
          if (emailData.recipientUsersData && Array.isArray(emailData.recipientUsersData)) {
            payload.userIds = emailData.recipientUsersData
              .filter(user => user && user.id)
              .map(user => user.id);
            
            // Log the conversion
            console.log(`Converted ${payload.userIds.length} recipient emails to user IDs`);
          } else {
            // Otherwise create a special payload for the backend to handle
            // Set the email addresses as the userIds temporarily 
            // (backend will need to look up users by email)
            payload.emailAddresses = emailData.recipients.split(',').filter(Boolean);
            delete payload.recipients; // Remove the recipients field to avoid confusion
            
            if (payload.emailAddresses.length === 0) {
              throw new Error('No valid email addresses provided');
            }
            
            console.log(`Using ${payload.emailAddresses.length} email addresses for lookup`);
          }
        }
      }
      
    } else if (emailData.emailType === 'tool') {
      endpoint = `${API_URL}/api/email/send-tool-update`;
      
      // For agent/tool updates, ensure we have title, content and updateType
      if (!emailData.title || !emailData.content || !emailData.updateType) {
        throw new Error('Title, content, and update type are required for tool updates');
      }
      
      // Ensure the payload uses the expected field names for the backend
      if (emailData.subject && !emailData.title) {
        payload.title = emailData.subject;
      }
      
      // Log detailed payload for debugging tool update emails
      console.log('Tool update email payload:', JSON.stringify(payload, null, 2));
      
    } else if (emailData.emailType) {
      console.warn(`Using default endpoint for email type: ${emailData.emailType}`);
    }
    
    console.log(`Sending to ${endpoint} with payload:`, payload);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        // Try to get detailed error response
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', errorData);
        
        if (response.status === 404) {
          throw new Error(`Endpoint not found: ${endpoint}. Check if the API route is configured correctly.`);
        }
        
        throw new Error(errorData.message || `Failed to send email (${response.status}): ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(`API endpoint not available: ${endpoint}. Ensure the backend supports this email type.`);
      }
      throw error;
    }
  } catch (error) {
    console.error('Custom email error:', error);
    toast.error(`Email sending failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get email statistics
 * @returns {Promise<Object>} - Email stats data
 */
// export const getEmailStats = async () => {
//   try {
//     const token = localStorage.getItem('authToken');
    
//     if (!token) {
//       throw new Error('Authentication token not found');
//     }
    
//     const response = await fetch(`${API_URL}/api/email/stats`, {
//       headers: {
//         'Authorization': `Bearer ${token}`
//       }
//     });
    
//     if (!response.ok) {
//       const errorData = await response.json().catch(() => ({}));
//       throw new Error(errorData.message || 'Failed to get email statistics');
//     }
    
//     return await response.json();
//   } catch (error) {
//     console.error('Email stats error:', error);
//     throw error;
//   }
// };

/**
 * Get email template
 * @param {string} templateType - Template type to get
 * @returns {Promise<Object>} - API response
 */
export const getEmailTemplate = async (templateType) => {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    // Ensure template type is valid
    const validTemplateTypes = ['welcome', 'update', 'agent', 'tool', 'global', 'custom'];
    if (!validTemplateTypes.includes(templateType)) {
      throw new Error(`Invalid template type: ${templateType}`);
    }
    
    const endpoint = `${API_URL}/api/email/templates/${templateType}`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to get email template');
      }
      
      return await response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(`API endpoint not available: ${endpoint}. Ensure the backend supports this template type.`);
      }
      throw error;
    }
  } catch (error) {
    console.error('Template fetch error:', error);
    throw error;
  }
};

/**
 * Update email template
 * @param {string} templateType - Template type to update
 * @param {Object} templateData - Template data to save
 * @returns {Promise<Object>} - API response
 */
export const updateEmailTemplate = async (templateType, templateData) => {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    // Ensure template type is valid
    const validTemplateTypes = ['welcome', 'update', 'agent', 'tool', 'global', 'custom'];
    if (!validTemplateTypes.includes(templateType)) {
      throw new Error(`Invalid template type: ${templateType}`);
    }
    
    // Validate template data
    if (!templateData.subject || !templateData.content) {
      throw new Error('Template must include subject and content');
    }
    
    const endpoint = `${API_URL}/api/email/templates/${templateType}`;
    
    console.log(`Updating ${templateType} email template:`, templateData);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update email template');
      }
      
      return await response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(`API endpoint not available: ${endpoint}. Ensure the backend supports this template type.`);
      }
      throw error;
    }
  } catch (error) {
    console.error('Template update error:', error);
    throw error;
  }
};

/**
 * Handle email API errors
 * @param {Error} error - Error object
 * @param {string} fallbackMessage - Fallback error message
 */
export const handleEmailError = (error, fallbackMessage = 'An error occurred with the email service') => {
  const errorMessage = error.message || fallbackMessage;
  toast.error(errorMessage);
  return { success: false, message: errorMessage };
};

export default {
  sendTestEmail,
  sendWelcomeEmail,
  sendCustomEmail,
  // getEmailStats,
  getEmailTemplate,
  updateEmailTemplate,
  handleEmailError
}; 