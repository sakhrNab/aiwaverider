import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/admin/AdminLayout';
import HashLoader from 'react-spinners/HashLoader';
import { FaEnvelope, FaBell, FaGlobe, FaUserPlus, FaPencilAlt } from 'react-icons/fa';
import './EmailManagement.css';

const EmailManagement = () => {
  const [activeTab, setActiveTab] = useState('welcome');
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  
  // Welcome email state
  const [welcomeTemplate, setWelcomeTemplate] = useState({
    subject: 'Welcome to AI Wave Rider!',
    content: 'Thank you for joining our platform. We\'re excited to have you on board!'
  });
  
  // Update notification state
  const [updateTemplate, setUpdateTemplate] = useState({
    subject: 'New Updates Available',
    content: 'We\'ve made some exciting new updates to our platform.',
    updateType: 'feature'
  });
  
  // Global announcement state
  const [globalTemplate, setGlobalTemplate] = useState({
    subject: 'Important Announcement',
    content: 'We have an important announcement to share with all our users.'
  });
  
  // Custom email state
  const [customEmail, setCustomEmail] = useState({
    subject: '',
    content: '',
    recipients: '',
    recipientType: 'all' // all, premium, free
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleTestEmail = async (type) => {
    if (!testEmail || !testEmail.trim()) {
      toast.error('Please enter a valid email address for testing');
      return;
    }
    
    setLoading(true);
    try {
      let endpoint = '/api/email/test';
      let payload = { email: testEmail };
      
      switch (type) {
        case 'welcome':
          endpoint = '/api/email/test-welcome';
          payload = {
            email: testEmail,
            firstName: 'Test',
            lastName: 'User',
            subject: welcomeTemplate.subject,
            content: welcomeTemplate.content
          };
          break;
        case 'update':
          endpoint = '/api/email/test-update';
          payload = {
            email: testEmail,
            firstName: 'Test',
            lastName: 'User',
            subject: updateTemplate.subject,
            content: updateTemplate.content,
            updateType: updateTemplate.updateType
          };
          break;
        case 'global':
          endpoint = '/api/email/test-global';
          payload = {
            email: testEmail,
            firstName: 'Test',
            lastName: 'User',
            subject: globalTemplate.subject,
            content: globalTemplate.content
          };
          break;
        case 'custom':
          endpoint = '/api/email/test-custom';
          payload = {
            email: testEmail,
            subject: customEmail.subject,
            content: customEmail.content
          };
          break;
        default:
          endpoint = '/api/email/test';
      }
      
      const token = localStorage.getItem('token');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send test email');
      }
      
      const data = await response.json();
      toast.success(`Test email sent successfully to ${testEmail}`);
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(error.message || 'Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (type) => {
    setLoading(true);
    try {
      let endpoint = '';
      let payload = {};
      
      switch (type) {
        case 'welcome':
          endpoint = '/api/email/templates/welcome';
          payload = welcomeTemplate;
          break;
        case 'update':
          endpoint = '/api/email/templates/update';
          payload = updateTemplate;
          break;
        case 'global':
          endpoint = '/api/email/templates/global';
          payload = globalTemplate;
          break;
        default:
          throw new Error('Invalid template type');
      }
      
      const token = localStorage.getItem('token');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save template');
      }
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} email template saved successfully`);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCustomEmail = async () => {
    if (!customEmail.subject || !customEmail.content) {
      toast.error('Please provide both subject and content for your email');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/email/send-custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(customEmail)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send emails');
      }
      
      const data = await response.json();
      toast.success(`Emails scheduled to be sent to ${data.recipientCount} users`);
      
      // Reset form
      setCustomEmail({
        subject: '',
        content: '',
        recipients: '',
        recipientType: 'all'
      });
    } catch (error) {
      console.error('Error sending custom emails:', error);
      toast.error(error.message || 'Failed to send emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="email-management">
        <h1>Email Management</h1>
        
        {loading && (
          <div className="loading-container">
            <HashLoader color="#4FD1C5" size={50} />
            <p>Processing your request...</p>
          </div>
        )}
        
        <div className="email-test-section">
          <h2>Test Email Address</h2>
          <div className="email-input-container">
            <input
              type="email"
              placeholder="Enter email for testing"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
        </div>
        
        <div className="email-tabs">
          <button 
            className={activeTab === 'welcome' ? 'active' : ''}
            onClick={() => handleTabChange('welcome')}
          >
            <FaUserPlus /> Welcome Emails
          </button>
          <button 
            className={activeTab === 'update' ? 'active' : ''}
            onClick={() => handleTabChange('update')}
          >
            <FaBell /> Update Notifications
          </button>
          <button 
            className={activeTab === 'global' ? 'active' : ''}
            onClick={() => handleTabChange('global')}
          >
            <FaGlobe /> Global Announcements
          </button>
          <button 
            className={activeTab === 'custom' ? 'active' : ''}
            onClick={() => handleTabChange('custom')}
          >
            <FaPencilAlt /> Custom Emails
          </button>
        </div>
        
        <div className="email-content">
          {activeTab === 'welcome' && (
            <div className="email-template-form">
              <h2>Welcome Email Template</h2>
              <p className="template-description">
                This email is sent to users when they first register for an account.
              </p>
              
              <div className="form-group">
                <label>Subject Line</label>
                <input
                  type="text"
                  value={welcomeTemplate.subject}
                  onChange={(e) => setWelcomeTemplate({...welcomeTemplate, subject: e.target.value})}
                  placeholder="Email subject line"
                />
              </div>
              
              <div className="form-group">
                <label>Email Content</label>
                <textarea
                  value={welcomeTemplate.content}
                  onChange={(e) => setWelcomeTemplate({...welcomeTemplate, content: e.target.value})}
                  placeholder="Email content"
                  rows={10}
                ></textarea>
              </div>
              
              <div className="template-placeholders">
                <h3>Available Placeholders:</h3>
                <ul>
                  <li><code>{{firstName}}</code> - User's first name</li>
                  <li><code>{{lastName}}</code> - User's last name</li>
                  <li><code>{{email}}</code> - User's email address</li>
                  <li><code>{{websiteUrl}}</code> - Your website URL</li>
                </ul>
              </div>
              
              <div className="email-actions">
                <button 
                  className="save-button"
                  onClick={() => handleSaveTemplate('welcome')}
                  disabled={loading}
                >
                  Save Template
                </button>
                <button 
                  className="test-button"
                  onClick={() => handleTestEmail('welcome')}
                  disabled={loading || !testEmail}
                >
                  Send Test Email
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'update' && (
            <div className="email-template-form">
              <h2>Update Notification Template</h2>
              <p className="template-description">
                This email is sent to notify users about new features, updates, or changes to the platform.
              </p>
              
              <div className="form-group">
                <label>Subject Line</label>
                <input
                  type="text"
                  value={updateTemplate.subject}
                  onChange={(e) => setUpdateTemplate({...updateTemplate, subject: e.target.value})}
                  placeholder="Email subject line"
                />
              </div>
              
              <div className="form-group">
                <label>Email Content</label>
                <textarea
                  value={updateTemplate.content}
                  onChange={(e) => setUpdateTemplate({...updateTemplate, content: e.target.value})}
                  placeholder="Email content"
                  rows={10}
                ></textarea>
              </div>
              
              <div className="form-group">
                <label>Update Type</label>
                <select
                  value={updateTemplate.updateType}
                  onChange={(e) => setUpdateTemplate({...updateTemplate, updateType: e.target.value})}
                >
                  <option value="feature">New Feature</option>
                  <option value="improvement">Improvement</option>
                  <option value="bugfix">Bug Fix</option>
                  <option value="security">Security Update</option>
                  <option value="announcement">General Announcement</option>
                </select>
              </div>
              
              <div className="template-placeholders">
                <h3>Available Placeholders:</h3>
                <ul>
                  <li><code>{{firstName}}</code> - User's first name</li>
                  <li><code>{{lastName}}</code> - User's last name</li>
                  <li><code>{{updateType}}</code> - Type of update</li>
                  <li><code>{{websiteUrl}}</code> - Your website URL</li>
                </ul>
              </div>
              
              <div className="email-actions">
                <button 
                  className="save-button"
                  onClick={() => handleSaveTemplate('update')}
                  disabled={loading}
                >
                  Save Template
                </button>
                <button 
                  className="test-button"
                  onClick={() => handleTestEmail('update')}
                  disabled={loading || !testEmail}
                >
                  Send Test Email
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'global' && (
            <div className="email-template-form">
              <h2>Global Announcement Template</h2>
              <p className="template-description">
                This email is sent as a global announcement to all users.
              </p>
              
              <div className="form-group">
                <label>Subject Line</label>
                <input
                  type="text"
                  value={globalTemplate.subject}
                  onChange={(e) => setGlobalTemplate({...globalTemplate, subject: e.target.value})}
                  placeholder="Email subject line"
                />
              </div>
              
              <div className="form-group">
                <label>Email Content</label>
                <textarea
                  value={globalTemplate.content}
                  onChange={(e) => setGlobalTemplate({...globalTemplate, content: e.target.value})}
                  placeholder="Email content"
                  rows={10}
                ></textarea>
              </div>
              
              <div className="template-placeholders">
                <h3>Available Placeholders:</h3>
                <ul>
                  <li><code>{{firstName}}</code> - User's first name</li>
                  <li><code>{{lastName}}</code> - User's last name</li>
                  <li><code>{{websiteUrl}}</code> - Your website URL</li>
                  <li><code>{{supportEmail}}</code> - Your support email</li>
                </ul>
              </div>
              
              <div className="email-actions">
                <button 
                  className="save-button"
                  onClick={() => handleSaveTemplate('global')}
                  disabled={loading}
                >
                  Save Template
                </button>
                <button 
                  className="test-button"
                  onClick={() => handleTestEmail('global')}
                  disabled={loading || !testEmail}
                >
                  Send Test Email
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'custom' && (
            <div className="email-template-form">
              <h2>Custom Email Campaign</h2>
              <p className="template-description">
                Send a custom email to specific users or user groups.
              </p>
              
              <div className="form-group">
                <label>Subject Line</label>
                <input
                  type="text"
                  value={customEmail.subject}
                  onChange={(e) => setCustomEmail({...customEmail, subject: e.target.value})}
                  placeholder="Email subject line"
                />
              </div>
              
              <div className="form-group">
                <label>Email Content</label>
                <textarea
                  value={customEmail.content}
                  onChange={(e) => setCustomEmail({...customEmail, content: e.target.value})}
                  placeholder="Email content"
                  rows={10}
                ></textarea>
              </div>
              
              <div className="form-group">
                <label>Recipient Type</label>
                <select
                  value={customEmail.recipientType}
                  onChange={(e) => setCustomEmail({...customEmail, recipientType: e.target.value})}
                >
                  <option value="all">All Users</option>
                  <option value="premium">Premium Users Only</option>
                  <option value="free">Free Users Only</option>
                  <option value="specific">Specific Emails</option>
                </select>
              </div>
              
              {customEmail.recipientType === 'specific' && (
                <div className="form-group">
                  <label>Recipient Emails (comma separated)</label>
                  <textarea
                    value={customEmail.recipients}
                    onChange={(e) => setCustomEmail({...customEmail, recipients: e.target.value})}
                    placeholder="email1@example.com, email2@example.com"
                    rows={3}
                  ></textarea>
                </div>
              )}
              
              <div className="template-placeholders">
                <h3>Available Placeholders:</h3>
                <ul>
                  <li><code>{{firstName}}</code> - User's first name</li>
                  <li><code>{{lastName}}</code> - User's last name</li>
                  <li><code>{{email}}</code> - User's email address</li>
                  <li><code>{{websiteUrl}}</code> - Your website URL</li>
                </ul>
              </div>
              
              <div className="email-actions">
                <button 
                  className="send-button"
                  onClick={handleSendCustomEmail}
                  disabled={loading || !customEmail.subject || !customEmail.content}
                >
                  Send Email Campaign
                </button>
                <button 
                  className="test-button"
                  onClick={() => handleTestEmail('custom')}
                  disabled={loading || !testEmail || !customEmail.subject || !customEmail.content}
                >
                  Send Test Email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default EmailManagement; 