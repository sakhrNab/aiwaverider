import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layout/AdminLayout';
import HashLoader from 'react-spinners/HashLoader';
import { FaBell, FaGlobe, FaUserPlus, FaPencilAlt, FaRobot, FaTools } from 'react-icons/fa';
import { sendTestEmail, updateEmailTemplate, getEmailTemplate, handleEmailError, sendCustomEmail } from '../../services/emailService';
import RichTextEditor from '../../components/editor/RichTextEditor';
import './AdminEmailManagementPage.css';

const EmailManagement = () => {
  const [activeTab, setActiveTab] = useState('welcome');
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  
  // Welcome email state
  const [welcomeTemplate, setWelcomeTemplate] = useState({
    subject: 'Welcome to AI Waverider!',
    content: 'Thank you for joining our platform. We\'re excited to have you on board!'
  });
  
  // Update notification state
  const [updateTemplate, setUpdateTemplate] = useState({
    subject: 'New Updates Available',
    content: 'We\'ve made some exciting new updates to our platform.',
    updateType: 'feature'
  });
  
  // Agent update state
  const [agentTemplate, setAgentTemplate] = useState({
    subject: 'New AI Agents Available',
    content: '<p>We\'re excited to announce new AI agents on our platform!</p><ul><li><strong>Agent 1</strong>: Description of the first agent</li><li><strong>Agent 2</strong>: Description of the second agent</li></ul>'
  });
  
  // Tool update state
  const [toolTemplate, setToolTemplate] = useState({
    subject: 'New AI Tools Released',
    content: '<p>Check out our latest AI tools that have just been released:</p><ul><li><strong>Tool 1</strong>: Description of the first tool</li><li><strong>Tool 2</strong>: Description of the second tool</li></ul>'
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
      // Prepare payload based on the email type
      let emailData = { email: testEmail };
      
      switch (type) {
        case 'welcome':
          emailData = {
            email: testEmail,
            firstName: 'Test',
            lastName: 'User',
            subject: welcomeTemplate.subject,
            content: welcomeTemplate.content
          };
          break;
        case 'update':
          emailData = {
            email: testEmail,
            firstName: 'Test',
            lastName: 'User',
            subject: updateTemplate.subject,
            content: updateTemplate.content,
            updateType: updateTemplate.updateType
          };
          break;
        case 'agent':
          emailData = {
            email: testEmail,
            firstName: 'Test',
            lastName: 'User',
            subject: agentTemplate.subject,
            content: agentTemplate.content
          };
          break;
        case 'tool':
          emailData = {
            email: testEmail,
            firstName: 'Test',
            lastName: 'User',
            subject: toolTemplate.subject,
            content: toolTemplate.content
          };
          break;
        case 'global':
          emailData = {
            email: testEmail,
            firstName: 'Test',
            lastName: 'User',
            subject: globalTemplate.subject,
            content: globalTemplate.content
          };
          break;
        case 'custom':
          emailData = {
            email: testEmail,
            subject: customEmail.subject,
            content: customEmail.content
          };
          break;
      }
      
      // Send test email using the emailService
      const result = await sendTestEmail(testEmail, type, emailData);
      
      console.log(`Test ${type} email sent successfully to: ${testEmail}`);
      toast.success(`Test email sent successfully to ${testEmail}`);
    } catch (error) {
      handleEmailError(error, 'Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (type) => {
    setLoading(true);
    try {
      let templateData = {};
      
      switch (type) {
        case 'welcome':
          templateData = welcomeTemplate;
          break;
        case 'update':
          templateData = updateTemplate;
          break;
        case 'agent':
          templateData = agentTemplate;
          break;
        case 'tool':
          templateData = toolTemplate;
          break;
        case 'global':
          templateData = globalTemplate;
          break;
        default:
          throw new Error('Invalid template type');
      }
      
      // Save template using the emailService
      await updateEmailTemplate(type, templateData);
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} email template saved successfully`);
    } catch (error) {
      handleEmailError(error, 'Failed to save template');
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
      // Send custom email using the emailService
      const result = await sendCustomEmail(customEmail);
      
      console.log('Email sending successful:', result);
      
      if (result.data && result.data.recipientCount) {
        toast.success(`Emails scheduled to be sent to ${result.data.recipientCount} users`);
      } else {
        toast.success('Emails scheduled successfully');
      }
      
      // Reset form
      setCustomEmail({
        subject: '',
        content: '',
        recipients: '',
        recipientType: 'all'
      });
    } catch (error) {
      handleEmailError(error, 'Failed to send emails');
    } finally {
      setLoading(false);
    }
  };

  // Load email templates when tab changes
  useEffect(() => {
    const loadTemplate = async () => {
      if (!activeTab || activeTab === 'custom') return;
      
      setLoading(true);
      try {
        const result = await getEmailTemplate(activeTab);
        
        if (result.success && result.data) {
          switch (activeTab) {
            case 'welcome':
              setWelcomeTemplate(result.data);
              break;
            case 'update':
              setUpdateTemplate(result.data);
              break;
            case 'agent':
              setAgentTemplate(result.data);
              break;
            case 'tool':
              setToolTemplate(result.data);
              break;
            case 'global':
              setGlobalTemplate(result.data);
              break;
          }
        }
      } catch (error) {
        console.error(`Error loading ${activeTab} template:`, error);
        
        // Don't show error toast for template loading issues
        // Just use default templates instead
      } finally {
        setLoading(false);
      }
    };
    
    loadTemplate();
  }, [activeTab]);

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
              aria-label="Test email address"
            />
          </div>
        </div>
        
        <div className="email-tabs" role="tablist">
          <button 
            className={activeTab === 'welcome' ? 'active' : ''}
            onClick={() => handleTabChange('welcome')}
            role="tab"
            aria-selected={activeTab === 'welcome'}
            aria-controls="welcome-panel"
          >
            <FaUserPlus /> Welcome Emails
          </button>
          <button 
            className={activeTab === 'update' ? 'active' : ''}
            onClick={() => handleTabChange('update')}
            role="tab"
            aria-selected={activeTab === 'update'}
            aria-controls="update-panel"
          >
            <FaBell /> Update Notifications
          </button>
          <button 
            className={activeTab === 'agent' ? 'active' : ''}
            onClick={() => handleTabChange('agent')}
            role="tab"
            aria-selected={activeTab === 'agent'}
            aria-controls="agent-panel"
          >
            <FaRobot /> AI Agents
          </button>
          <button 
            className={activeTab === 'tool' ? 'active' : ''}
            onClick={() => handleTabChange('tool')}
            role="tab"
            aria-selected={activeTab === 'tool'}
            aria-controls="tool-panel"
          >
            <FaTools /> AI Tools
          </button>
          <button 
            className={activeTab === 'global' ? 'active' : ''}
            onClick={() => handleTabChange('global')}
            role="tab"
            aria-selected={activeTab === 'global'}
            aria-controls="global-panel"
          >
            <FaGlobe /> Global Announcements
          </button>
          <button 
            className={activeTab === 'custom' ? 'active' : ''}
            onClick={() => handleTabChange('custom')}
            role="tab"
            aria-selected={activeTab === 'custom'}
            aria-controls="custom-panel"
          >
            <FaPencilAlt /> Custom Emails
          </button>
        </div>
        
        <div className="email-content">
          {activeTab === 'welcome' && (
            <div className="email-template-form" id="welcome-panel" role="tabpanel" aria-labelledby="welcome-tab">
              <h2>Welcome Email Template</h2>
              <p className="template-description">
                This email is sent to users when they first register for an account.
              </p>
              
              <div className="form-group">
                <label htmlFor="welcome-subject">Subject Line</label>
                <input
                  id="welcome-subject"
                  type="text"
                  value={welcomeTemplate.subject}
                  onChange={(e) => setWelcomeTemplate({...welcomeTemplate, subject: e.target.value})}
                  placeholder="Email subject line"
                />
              </div>
              
              <div className="form-group">
                <label>Email Content</label>
                <RichTextEditor
                  content={welcomeTemplate.content}
                  onChange={(content) => setWelcomeTemplate({...welcomeTemplate, content})}
                />
              </div>
              
              <div className="template-placeholders">
                <h3>Available Placeholders:</h3>
                <ul>
                  <li><code>{"{{firstName}}"}</code> - User's first name</li>
                  <li><code>{"{{lastName}}"}</code> - User's last name</li>
                  <li><code>{"{{email}}"}</code> - User's email address</li>
                  <li><code>{"{{websiteUrl}}"}</code> - Your website URL</li>
                </ul>
              </div>
              
              <div className="email-actions">
                <button 
                  className="save-button"
                  onClick={() => handleSaveTemplate('welcome')}
                  disabled={loading}
                  aria-label="Save welcome email template"
                >
                  Save Template
                </button>
                <button 
                  className="test-button"
                  onClick={() => handleTestEmail('welcome')}
                  disabled={loading || !testEmail}
                  aria-label="Send test welcome email"
                >
                  Send Test Email
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'update' && (
            <div className="email-template-form" id="update-panel" role="tabpanel" aria-labelledby="update-tab">
              <h2>Update Notification Template</h2>
              <p className="template-description">
                This email is sent to notify users about new features, updates, or changes to the platform.
              </p>
              
              <div className="form-group">
                <label htmlFor="update-subject">Subject Line</label>
                <input
                  id="update-subject"
                  type="text"
                  value={updateTemplate.subject}
                  onChange={(e) => setUpdateTemplate({...updateTemplate, subject: e.target.value})}
                  placeholder="Email subject line"
                />
              </div>
              
              <div className="form-group">
                <label>Email Content</label>
                <RichTextEditor
                  content={updateTemplate.content}
                  onChange={(content) => setUpdateTemplate({...updateTemplate, content})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="update-type">Update Type</label>
                <select
                  id="update-type"
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
                  <li><code>{"{{firstName}}"}</code> - User's first name</li>
                  <li><code>{"{{lastName}}"}</code> - User's last name</li>
                  <li><code>{"{{updateType}}"}</code> - Type of update</li>
                  <li><code>{"{{websiteUrl}}"}</code> - Your website URL</li>
                </ul>
              </div>
              
              <div className="email-actions">
                <button 
                  className="save-button"
                  onClick={() => handleSaveTemplate('update')}
                  disabled={loading}
                  aria-label="Save update notification template"
                >
                  Save Template
                </button>
                <button 
                  className="test-button"
                  onClick={() => handleTestEmail('update')}
                  disabled={loading || !testEmail}
                  aria-label="Send test update notification"
                >
                  Send Test Email
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'agent' && (
            <div className="email-template-form" id="agent-panel" role="tabpanel" aria-labelledby="agent-tab">
              <h2>AI Agent Updates Template</h2>
              <p className="template-description">
                This email is sent to notify users about new AI Agents available on the platform.
              </p>
              
              <div className="form-group">
                <label htmlFor="agent-subject">Subject Line</label>
                <input
                  id="agent-subject"
                  type="text"
                  value={agentTemplate.subject}
                  onChange={(e) => setAgentTemplate({...agentTemplate, subject: e.target.value})}
                  placeholder="Email subject line"
                />
              </div>
              
              <div className="form-group">
                <label>Email Content</label>
                <RichTextEditor
                  content={agentTemplate.content}
                  onChange={(content) => setAgentTemplate({...agentTemplate, content})}
                />
              </div>
              
              <div className="template-placeholders">
                <h3>Available Placeholders:</h3>
                <ul>
                  <li><code>{"{{firstName}}"}</code> - User's first name</li>
                  <li><code>{"{{lastName}}"}</code> - User's last name</li>
                  <li><code>{"{{websiteUrl}}"}</code> - Your website URL</li>
                  <li><code>{"{{agentHtml}}"}</code> - Dynamic HTML content for agents</li>
                </ul>
              </div>
              
              <div className="email-actions">
                <button 
                  className="save-button"
                  onClick={() => handleSaveTemplate('agent')}
                  disabled={loading}
                  aria-label="Save AI agent template"
                >
                  Save Template
                </button>
                <button 
                  className="test-button"
                  onClick={() => handleTestEmail('agent')}
                  disabled={loading || !testEmail}
                  aria-label="Send test AI agent email"
                >
                  Send Test Email
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'tool' && (
            <div className="email-template-form" id="tool-panel" role="tabpanel" aria-labelledby="tool-tab">
              <h2>AI Tools Updates Template</h2>
              <p className="template-description">
                This email is sent to notify users about new AI Tools available on the platform.
              </p>
              
              <div className="form-group">
                <label htmlFor="tool-subject">Subject Line</label>
                <input
                  id="tool-subject"
                  type="text"
                  value={toolTemplate.subject}
                  onChange={(e) => setToolTemplate({...toolTemplate, subject: e.target.value})}
                  placeholder="Email subject line"
                />
              </div>
              
              <div className="form-group">
                <label>Email Content</label>
                <RichTextEditor
                  content={toolTemplate.content}
                  onChange={(content) => setToolTemplate({...toolTemplate, content})}
                />
              </div>
              
              <div className="template-placeholders">
                <h3>Available Placeholders:</h3>
                <ul>
                  <li><code>{"{{firstName}}"}</code> - User's first name</li>
                  <li><code>{"{{lastName}}"}</code> - User's last name</li>
                  <li><code>{"{{websiteUrl}}"}</code> - Your website URL</li>
                  <li><code>{"{{toolHtml}}"}</code> - Dynamic HTML content for tools</li>
                </ul>
              </div>
              
              <div className="email-actions">
                <button 
                  className="save-button"
                  onClick={() => handleSaveTemplate('tool')}
                  disabled={loading}
                  aria-label="Save AI tool template"
                >
                  Save Template
                </button>
                <button 
                  className="test-button"
                  onClick={() => handleTestEmail('tool')}
                  disabled={loading || !testEmail}
                  aria-label="Send test AI tool email"
                >
                  Send Test Email
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'global' && (
            <div className="email-template-form" id="global-panel" role="tabpanel" aria-labelledby="global-tab">
              <h2>Global Announcement Template</h2>
              <p className="template-description">
                This email is sent as a global announcement to all users.
              </p>
              
              <div className="form-group">
                <label htmlFor="global-subject">Subject Line</label>
                <input
                  id="global-subject"
                  type="text"
                  value={globalTemplate.subject}
                  onChange={(e) => setGlobalTemplate({...globalTemplate, subject: e.target.value})}
                  placeholder="Email subject line"
                />
              </div>
              
              <div className="form-group">
                <label>Email Content</label>
                <RichTextEditor
                  content={globalTemplate.content}
                  onChange={(content) => setGlobalTemplate({...globalTemplate, content})}
                />
              </div>
              
              <div className="template-placeholders">
                <h3>Available Placeholders:</h3>
                <ul>
                  <li><code>{"{{firstName}}"}</code> - User's first name</li>
                  <li><code>{"{{lastName}}"}</code> - User's last name</li>
                  <li><code>{"{{websiteUrl}}"}</code> - Your website URL</li>
                  <li><code>{"{{supportEmail}}"}</code> - Your support email</li>
                </ul>
              </div>
              
              <div className="email-actions">
                <button 
                  className="save-button"
                  onClick={() => handleSaveTemplate('global')}
                  disabled={loading}
                  aria-label="Save global announcement template"
                >
                  Save Template
                </button>
                <button 
                  className="test-button"
                  onClick={() => handleTestEmail('global')}
                  disabled={loading || !testEmail}
                  aria-label="Send test global announcement"
                >
                  Send Test Email
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'custom' && (
            <div className="email-template-form" id="custom-panel" role="tabpanel" aria-labelledby="custom-tab">
              <h2>Custom Email Campaign</h2>
              <p className="template-description">
                Send a custom email to specific users or user groups.
              </p>
              
              <div className="form-group">
                <label htmlFor="custom-subject">Subject Line</label>
                <input
                  id="custom-subject"
                  type="text"
                  value={customEmail.subject}
                  onChange={(e) => setCustomEmail({...customEmail, subject: e.target.value})}
                  placeholder="Email subject line"
                />
              </div>
              
              <div className="form-group">
                <label>Email Content</label>
                <RichTextEditor
                  content={customEmail.content}
                  onChange={(content) => setCustomEmail({...customEmail, content})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="recipient-type">Recipient Type</label>
                <select
                  id="recipient-type"
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
                  <label htmlFor="recipient-emails">Recipient Emails (comma separated)</label>
                  <textarea
                    id="recipient-emails"
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
                  <li><code>{"{{firstName}}"}</code> - User's first name</li>
                  <li><code>{"{{lastName}}"}</code> - User's last name</li>
                  <li><code>{"{{email}}"}</code> - User's email address</li>
                  <li><code>{"{{websiteUrl}}"}</code> - Your website URL</li>
                </ul>
              </div>
              
              <div className="email-actions">
                <button 
                  className="send-button"
                  onClick={handleSendCustomEmail}
                  disabled={loading || !customEmail.subject || !customEmail.content}
                  aria-label="Send custom email campaign"
                >
                  Send Email Campaign
                </button>
                <button 
                  className="test-button"
                  onClick={() => handleTestEmail('custom')}
                  disabled={loading || !testEmail || !customEmail.subject || !customEmail.content}
                  aria-label="Send test custom email"
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