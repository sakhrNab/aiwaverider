import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/admin/AdminLayout';
import HashLoader from 'react-spinners/HashLoader';
import { FaEnvelope, FaUsers, FaUser, FaSearch, FaEye, FaPaperPlane } from 'react-icons/fa';
import { fetchUsers } from '../../utils/api';
import { sendCustomEmail } from '../../services/emailService';
import './EmailComposer.css';

const EmailComposer = () => {
  // Email composition states
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [emailType, setEmailType] = useState('update'); // update, announcement, custom
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
        setContent('Here are the latest updates from AI Waverider this week...');
        break;
      case 'announcement':
        setSubject('Important Announcement from AI Waverider');
        setContent('We have an important announcement to share with you...');
        break;
      case 'custom':
        setSubject('');
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
      // Extract emails for custom emails
      let emailList = [];
      if (emailType === 'custom') {
        emailList = selectedUsers
          .map(userId => {
            const user = filteredUsers.find(u => u.id === userId);
            return user ? user.email : null;
          })
          .filter(email => email); // Filter out any null values
          
        if (emailList.length === 0) {
          throw new Error('No valid email addresses found for selected users');
        }
        
        console.log(`Sending custom email to ${emailList.length} recipients:`, emailList);
      }
      
      // Use different endpoints based on email type
      let result;
      
      if (emailType === 'custom') {
        // For custom emails, use the emailService
        result = await sendCustomEmail({
          subject: subject,
          content: content,
          recipientType: 'specific',
          recipients: emailList.join(',')
        });
      } else {
        // For other email types, use the update service
        result = await fetch(`${import.meta.env.VITE_API_URL}/api/email/update/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            title: subject,
            content: content,
            updateType: emailType,
            userIds: selectedUsers
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
                <div className="form-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject"
                  />
                </div>
                
                <div className="form-group">
                  <label>Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter email content..."
                    rows={12}
                  ></textarea>
                </div>
                
                <div className="template-placeholders">
                  <h3>Available Placeholders:</h3>
                  <ul>
                    <li><code>{"{{name}}"}</code> - User's name</li>
                    <li><code>{"{{firstName}}"}</code> - User's first name</li>
                    <li><code>{"{{lastName}}"}</code> - User's last name</li>
                    <li><code>{"{{email}}"}</code> - User's email address</li>
                    <li><code>{"{{websiteUrl}}"}</code> - Your website URL</li>
                  </ul>
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
                <div className="preview-content">
                  {content.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}
            
            <div className="editor-actions">
              <button 
                className="preview-button"
                onClick={togglePreview}
              >
                {previewMode ? <><FaEnvelope /> Edit</> : <><FaEye /> Preview</>}
              </button>
              <button 
                className="send-button"
                onClick={handleSendEmail}
                disabled={loading || selectedUsers.length === 0 || !subject || !content}
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
                />
              </div>
              
              <button 
                className="select-all-button"
                onClick={handleSelectAll}
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
                  >
                    <div className="user-avatar">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={formatUserName(user)} />
                      ) : (
                        <FaUser />
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