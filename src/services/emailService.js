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
 * @param {string} type - Type of test email (welcome, update, global, custom)
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
      case 'custom':
        endpoint = `${API_URL}/api/email/test-custom`;
        break;
    }
    
    // Ensure email is included in payload
    const payload = {
      email,
      ...data
    };
    
    console.log(`Sending test ${type} email to: ${email}`);
    
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
    
    const response = await fetch(`${API_URL}/api/email/send-custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(emailData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to send custom email');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Custom email error:', error);
    throw error;
  }
};

/**
 * Get email statistics
 * @returns {Promise<Object>} - Email stats data
 */
export const getEmailStats = async () => {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    const response = await fetch(`${API_URL}/api/email/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to get email statistics');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Email stats error:', error);
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
    
    const response = await fetch(`${API_URL}/api/email/templates/${templateType}`, {
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
  getEmailStats,
  updateEmailTemplate,
  handleEmailError
}; 