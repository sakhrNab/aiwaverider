import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layout/AdminLayout';
import HashLoader from 'react-spinners/HashLoader';
import { FaEnvelope, FaUsers, FaSearch, FaEye, FaPaperPlane, FaRobot, FaTools } from 'react-icons/fa';
import { fetchUsers } from '../../api/admin/adminManageUsersApi';
import { sendCustomEmail } from '../../services/emailService';
import RichTextEditor from '../../components/editor/RichTextEditor';
import 'react-quill/dist/quill.snow.css';
// import { handleGoogleProfileImage } from '../../utils/imageUtils';
import './AdminEmailComposerPage.css';

const EmailComposer = () => {
  // Email composition states
  const [subject, setSubject] = useState('');
  const [headerTitle, setHeaderTitle] = useState('');
  const [content, setContent] = useState('');
  const [emailType, setEmailType] = useState('update'); // update, announcement, agent, tool, custom
  const [previewMode, setPreviewMode] = useState(false);
  
  // User selection states
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedAll, setSelectedAll] = useState(false);
  
  // Loading state
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);
  
  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(allUsers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allUsers.filter(user => 
        user.email.toLowerCase().includes(query) || 
        (user.username && user.username.toLowerCase().includes(query)) ||
        (user.firstName && user.firstName.toLowerCase().includes(query)) ||
        (user.lastName && user.lastName.toLowerCase().includes(query))
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, allUsers]);
  
  // Load users from the API
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      // Fetch up to 100 users
      const result = await fetchUsers(1, 100, '', 'createdAt', 'desc');
      setAllUsers(result.users || []);
      setFilteredUsers(result.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users. Please try again.');
    } finally {
      setLoadingUsers(false);
    }
  };
  
  // Handle email type change
  const handleEmailTypeChange = (type) => {
    setEmailType(type);
    
    // Set default template based on type
    switch(type) {
      case 'update':
        setSubject('Weekly AI Waverider Update');
        setHeaderTitle('Weekly AI Waverider Update');
        setContent('Here are the latest updates from AI Waverider this week...');
        break;
      case 'agent':
        setSubject('New AI Agents Available - AI Waverider');
        setHeaderTitle('New AI Agents Available');
        setContent('<p>We\'re excited to announce new AI agents on our platform!</p>');
        break;
      case 'tool':
        setSubject('New AI Tools Released - AI Waverider');
        setHeaderTitle('New AI Tools Released');
        setContent('<p>Check out our latest AI tools that have just been released:</p><ul><li><strong>Tool 1</strong>: Description of the first tool</li><li><strong>Tool 2</strong>: Description of the second tool</li></ul>');
        break;
      case 'announcement':
        setSubject('Important Announcement from AI Waverider');
        setHeaderTitle('Important Announcement');
        setContent('We have an important announcement to share with you...');
        break;
      case 'custom':
        setSubject('');
        setHeaderTitle('');
        setContent('');
        break;
      default:
        break;
    }
  };
  
  // Handle user selection
  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };
  
  // Handle select all users
  const handleSelectAll = () => {
    if (selectedAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
    setSelectedAll(!selectedAll);
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Preview email
  const togglePreview = () => {
    setPreviewMode(!previewMode);
  };
  
  // Send email
  const handleSendEmail = async () => {
    if (!subject || !content) {
      toast.error('Please provide both a subject and content for your email');
      return;
    }
    
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    
    setLoading(true);
    
    try {
      // Extract emails and prepare user data for selected users
      const recipientUsers = selectedUsers.map(userId => {
        const user = filteredUsers.find(u => u.id === userId);
        return user || null;
      }).filter(Boolean);
      
      if (recipientUsers.length === 0) {
        throw new Error('No valid recipients selected');
      }
      
      console.log(`Sending ${emailType} email to ${recipientUsers.length} recipients`);
      
      // Use the emailService for all email types
      let result;
      
      // For custom, agent, and tool emails, use sendCustomEmail
      if (emailType === 'custom' || emailType === 'agent' || emailType === 'tool') {
        // Get email addresses for these users
        const emailAddresses = recipientUsers.map(user => user.email).filter(Boolean);
        
        if (emailAddresses.length === 0) {
          throw new Error('No valid email addresses found for selected recipients');
        }
        
        // Log email addresses for debugging
        console.log(`Sending to ${emailAddresses.length} email addresses:`, emailAddresses);
        
        // Extract user IDs for these users
        const userIds = recipientUsers.map(user => user.id).filter(Boolean);
        
        // Prepare payload with the correct field names expected by the API
        const payload = {
          recipientType: 'specific',
          recipients: emailAddresses.join(','),
          recipientUsersData: recipientUsers, // Include full user data for ID extraction
          userIds: userIds, // Include user IDs directly when available
          emailType: emailType
        };
        
        // For agent/tool updates, use title instead of subject and add updateType
        if (emailType === 'agent' || emailType === 'tool') {
          payload.title = subject;
          payload.headerTitle = headerTitle || subject;
          payload.content = content;
          payload.updateType = emailType === 'agent' ? 'new_agents' : 'new_tools';
          
          // Add console logging for debugging
          console.log(`Preparing ${emailType} update with type ${payload.updateType}`);
          console.log(`Selected ${userIds.length} user IDs:`, userIds);
        } else {
          // For custom emails, use subject as is
          payload.subject = subject;
          payload.headerTitle = headerTitle || subject;
          payload.content = content;
        }
        
        try {
          result = await sendCustomEmail(payload);
          console.log(`${emailType} email sent successfully:`, result);
        } catch (error) {
          console.error(`Error sending ${emailType} email:`, error);
          throw error;
        }
      } else {
        // For update and announcement emails, use the update/users endpoint
        const userIds = recipientUsers.map(user => user.id);
        
        result = await fetch(`${import.meta.env.VITE_API_URL}/api/email/update/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            title: subject,
            headerTitle: headerTitle || subject,
            content: content,
            updateType: emailType,
            userIds: userIds
          })
        });
        
        if (!result.ok) {
          const errorData = await result.json().catch(() => null);
          throw new Error(
            errorData?.message || 
            `Failed to send email: ${result.status} ${result.statusText}`
          );
        }
        
        result = await result.json();
      }
      
      // Log success details
      console.log('Email sending successful:', result);
      
      if (result.data && result.data.sentCount) {
        toast.success(`Email successfully sent to ${result.data.sentCount} recipients!`);
      } else {
        toast.success('Email sent successfully!');
      }
      
      // Reset form after successful send
      setSubject('');
      setHeaderTitle('');
      setContent('');
      setSelectedUsers([]);
      setSelectedAll(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };
  
  // Format user display name
  const formatUserName = (user) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.username) {
      return user.username;
    } else if (user.displayName) {
      return user.displayName;
    } else {
      return user.email.split('@')[0];
    }
  };
  
  return (
    <AdminLayout>
      <div className="email-composer">
        <h1><FaEnvelope /> Email Composer</h1>
        
        {loading && (
          <div className="loading-container">
            <HashLoader color="#4FD1C5" size={50} />
            <p>Sending emails...</p>
          </div>
        )}
        
        <div className="composer-container">
          <div className="email-composition">
            <div className="email-type-selector">
              <button 
                className={emailType === 'update' ? 'active' : ''}
                onClick={() => handleEmailTypeChange('update')}
              >
                Weekly Update
              </button>
              <button 
                className={emailType === 'agent' ? 'active' : ''}
                onClick={() => handleEmailTypeChange('agent')}
              >
                <FaRobot /> AI Agents
              </button>
              <button 
                className={emailType === 'tool' ? 'active' : ''}
                onClick={() => handleEmailTypeChange('tool')}
              >
                <FaTools /> AI Tools
              </button>
              <button 
                className={emailType === 'announcement' ? 'active' : ''}
                onClick={() => handleEmailTypeChange('announcement')}
              >
                Announcement
              </button>
              <button 
                className={emailType === 'custom' ? 'active' : ''}
                onClick={() => handleEmailTypeChange('custom')}
              >
                Custom Email
              </button>
            </div>
            
            {!previewMode ? (
              <div className="email-editor">
                <div className="input-group">
                  <label htmlFor="email-subject">Email Subject (appears in inbox)</label>
                  <input
                    type="text"
                    id="email-subject"
                    placeholder="Enter email subject..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    aria-label="Email subject"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="email-header-title">Email Header Title (appears at the top of the email)</label>
                  <input
                    type="text"
                    id="email-header-title"
                    placeholder="Enter email header title..."
                    value={headerTitle}
                    onChange={(e) => setHeaderTitle(e.target.value)}
                    aria-label="Email header title"
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="email-content">Email Content</label>
                  <div className="editor-container">
                    <RichTextEditor 
                      value={content}
                      onChange={setContent}
                      placeholder="Compose your email content here..."
                    />
                  </div>
                  
                  <div className="placeholder-help">
                    <p><strong>Available placeholders:</strong></p>
                    <ul>
                      <li><code>{'{{name}}'}</code> - Recipient's first name or "there" if not available</li>
                      <li><code>{'{{websiteUrl}}'}</code> - Your website URL</li>
                      <li><code>{'{{supportEmail}}'}</code> - Support email address</li>
                      <li><code>{'{{currentYear}}'}</code> - Current year (for copyright)</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="email-preview">
                <div className="preview-header">
                  <h3>Email Preview</h3>
                </div>
                <div className="preview-subject">
                  <strong>Subject:</strong> {subject}
                </div>
                <div className="preview-content" dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            )}
            
            <div className="editor-actions">
              <button 
                className="preview-button"
                onClick={togglePreview}
                aria-label={previewMode ? "Edit email" : "Preview email"}
              >
                {previewMode ? <><FaEnvelope /> Edit</> : <><FaEye /> Preview</>}
              </button>
              <button 
                className="send-button"
                onClick={handleSendEmail}
                disabled={loading || selectedUsers.length === 0 || !subject || !content}
                aria-label="Send email to selected recipients"
              >
                <FaPaperPlane /> Send Email ({selectedUsers.length})
              </button>
            </div>
          </div>
          
          <div className="recipient-selector">
            <h2><FaUsers /> Select Recipients</h2>
            
            <div className="recipient-actions">
              <div className="search-bar">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  aria-label="Search users"
                />
              </div>
              
              <button 
                className="select-all-button"
                onClick={handleSelectAll}
                aria-label={selectedAll ? "Deselect all users" : "Select all users"}
              >
                {selectedAll ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="recipients-list">
              {loadingUsers ? (
                <div className="loading-users">
                  <HashLoader color="#4FD1C5" size={30} />
                  <p>Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="no-users">
                  <p>No users found</p>
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div 
                    key={user.id} 
                    className={`recipient-item ${selectedUsers.includes(user.id) ? 'selected' : ''}`}
                    onClick={() => handleUserSelection(user.id)}
                    role="checkbox" 
                    aria-checked={selectedUsers.includes(user.id)}
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleUserSelection(user.id);
                      }
                    }}
                  >
                    <div className="user-item-avatar">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={formatUserName(user)} />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.firstName?.charAt(0) || user.username?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{formatUserName(user)}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                    <div className="select-indicator"></div>
                  </div>
                ))
              )}
            </div>
            
            <div className="selected-count">
              {selectedUsers.length} recipients selected
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default EmailComposer; 