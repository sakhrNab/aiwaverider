import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaExclamationTriangle, FaSearch, FaPlus, FaSpinner, FaAngleLeft, FaAngleRight, FaBell, FaEnvelope, FaTools, FaRobot } from 'react-icons/fa';
import AdminLayout from '../../components/layout/AdminLayout';
import { fetchUsers, createUser, updateUser, deleteUser } from '../../api/admin/adminManageUsersApi';
import { toast } from 'react-toastify';
import './AdminManageUsersPage.css';
import { handleGoogleProfileImage } from '../../utils/imageUtils';

/**
 * Admin page for managing users
 */
const ManageUsers = () => {
  // State for users data and UI
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationType, setNotificationType] = useState('weeklyUpdates');
  const [notificationContent, setNotificationContent] = useState({
    title: '',
    message: ''
  });
  const [sendingNotification, setSendingNotification] = useState(false);
  
  // State for pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 10
  });
  
  // State for sorting
  const [sortConfig, setSortConfig] = useState({
    sortBy: 'createdAt',
    sortDirection: 'desc'
  });
  
  // Load users on component mount or when pagination/sorting/search changes
  useEffect(() => {
    loadUsers();
  }, [pagination.currentPage, pagination.limit, sortConfig, searchQuery]);
  
  // Function to fetch users with current filters and pagination
  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Call API with current pagination, search, and sort parameters
      const result = await fetchUsers(
        pagination.currentPage,
        pagination.limit,
        searchQuery,
        sortConfig.sortBy,
        sortConfig.sortDirection
      );
      
      setUsers(result.users || []);
      
      // Update pagination information
      setPagination({
        ...pagination,
        totalPages: result.totalPages || 1,
        totalUsers: result.total || 0
      });
      
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.message || 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle search input change with debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Reset to first page when search changes
    if (pagination.currentPage !== 1) {
      setPagination({
        ...pagination,
        currentPage: 1
      });
    }
  };
  
  // Handle sort column click
  const handleSort = (field) => {
    setSortConfig(prevSort => {
      // If clicking the same column, toggle direction
      if (prevSort.sortBy === field) {
        return {
          sortBy: field,
          sortDirection: prevSort.sortDirection === 'asc' ? 'desc' : 'asc'
        };
      }
      
      // If clicking a new column, default to ascending
      return {
        sortBy: field,
        sortDirection: 'asc'
      };
    });
    
    // Reset to first page when sort changes
    if (pagination.currentPage !== 1) {
      setPagination({
        ...pagination,
        currentPage: 1
      });
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle edit user
  const handleEditClick = (user) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };
  
  // Handle create new user
  const handleCreateClick = () => {
    setSelectedUser({
      username: '',
      email: '',
      role: 'user',
      status: 'active'
    });
    setIsCreateModalOpen(true);
  };
  
  // Handle delete user
  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };
  
  // Delete user
  const confirmDeleteUser = async () => {
    if (!selectedUser || !selectedUser.id) {
      setError('Cannot delete user: Missing user ID');
      setIsDeleteModalOpen(false);
      return;
    }
    
    try {
      setLoading(true);
      await deleteUser(selectedUser.id);
      
      // Update local state to remove the deleted user
    setUsers(users.filter(user => user.id !== selectedUser.id));
      
      // Update pagination if necessary
      if (users.length === 1 && pagination.currentPage > 1) {
        setPagination({
          ...pagination,
          currentPage: pagination.currentPage - 1
        });
      } else {
        // Reload users to get fresh data and correct pagination
        loadUsers();
      }
      
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Create new user
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) {
      setError('Cannot create user: Missing user data');
      return;
    }
    
    try {
      setLoading(true);
      await createUser(selectedUser);
      
      // Reset and reload to show new user
      setIsCreateModalOpen(false);
      setSelectedUser(null);
      
      // Go to first page and reload
      setPagination({
        ...pagination,
        currentPage: 1
      });
      
      loadUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Update existing user
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedUser || !selectedUser.id) {
      setError('Cannot update user: Missing user ID');
      return;
    }
    
    try {
      setLoading(true);
      const updatedUser = await updateUser(selectedUser.id, selectedUser);
      
      // Update the user in the local state
      setUsers(users.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      ));
      
    setIsEditModalOpen(false);
    setSelectedUser(null);
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.message || 'Failed to update user. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle pagination change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    
    setPagination({
      ...pagination,
      currentPage: newPage
    });
  };
  
  // Handle page size change
  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 100);
    
    setPagination({
      ...pagination,
      limit: newLimit,
      currentPage: 1  // Reset to first page when changing page size
    });
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
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
    setSelectAll(!selectAll);
  };

  // Open notification modal
  const handleOpenNotificationModal = () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user to send a notification");
      return;
    }
    
    let title = '';
    let message = '';
    
    switch (notificationType) {
      case 'weeklyUpdates':
        title = 'Weekly AI Waverider Update';
        message = 'Here are the latest updates from AI Waverider this week...';
        break;
      case 'newAgents':
        title = 'New AI Agents Available';
        message = 'We have added new AI agents to our platform...';
        break;
      case 'newTools':
        title = 'New AI Tools Available';
        message = 'Check out these new AI tools we\'ve added to our platform...';
        break;
      default:
        title = 'AI Waverider Update';
        message = 'Here are the latest updates from AI Waverider...';
    }
    
    setNotificationContent({
      title,
      message
    });
    
    setIsNotificationModalOpen(true);
  };

  // Handle notification type change
  const handleNotificationTypeChange = (e) => {
    setNotificationType(e.target.value);
  };

  // Send notification to selected users
  const handleSendNotification = async (e) => {
    e.preventDefault();
    
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user to send a notification");
      return;
    }
    
    if (!notificationContent.title || !notificationContent.message) {
      toast.error("Please provide both a title and message for the notification");
      return;
    }
    
    setSendingNotification(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/email/update/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          title: notificationContent.title,
          content: notificationContent.message,
          updateType: notificationType,
          userIds: selectedUsers
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send notification: ${response.status}`);
      }
      
      const data = await response.json();
      
      toast.success(`Notification sent to ${data.data.sentCount} users`);
      setIsNotificationModalOpen(false);
      setSelectedUsers([]);
      setSelectAll(false);
      setNotificationContent({
        title: '',
        message: ''
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error(error.message);
    } finally {
      setSendingNotification(false);
    }
  };

  // After the loadUsers function and before the return statement, add this useEffect:
  useEffect(() => {
    if (!loading && users.length === 0 && pagination.currentPage > 1) {
      setPagination(prev => ({
        ...prev,
        currentPage: prev.currentPage - 1
      }));
    }
  }, [users, loading, pagination.currentPage]);

  return (
    <AdminLayout>
      <div className="manage-users-page">
        <header className="page-header">
          <h1>Manage Users</h1>
          <div className="action-buttons-container">
            <button 
              className="btn-notification" 
              onClick={handleOpenNotificationModal}
              disabled={selectedUsers.length === 0}
            >
              <FaEnvelope className="mr-2" /> Send Update
            </button>
            <button className="btn-primary" onClick={handleCreateClick}>
              <FaPlus className="mr-2" /> Add New User
            </button>
          </div>
        </header>
        
        {error && (
          <div className="error-message">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}
        
        <div className="filters-container">
          <div className="search-bar">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          
          <div className="notification-selector">
            <select
              value={notificationType}
              onChange={handleNotificationTypeChange}
              className="notification-select"
            >
              <option value="weeklyUpdates">Weekly Updates</option>
              <option value="newAgents">New Agents</option>
              <option value="newTools">New AI Tools</option>
            </select>
          </div>
          
          <div className="page-size-selector">
            <span>Show:</span>
            <select
              value={pagination.limit}
              onChange={handleLimitChange}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <span>per page</span>
          </div>
        </div>
        
        {loading && users.length === 0 ? (
          <div className="loading-message">
            <FaSpinner className="spinner" />
            <span>Loading users...</span>
          </div>
        ) : (
          <div className="users-table-container">
            {users.length === 0 ? (
              <div className="no-users-message">
                {searchQuery 
                  ? `No users found matching "${searchQuery}"`
                  : "No users found. Create your first user by clicking 'Add New User'."
                }
              </div>
            ) : (
              <>
              <table className="users-table">
                <thead>
                  <tr>
                    <th className="select-column">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th 
                      className={sortConfig.sortBy === 'username' ? `sorted-${sortConfig.sortDirection}` : ''}
                      onClick={() => handleSort('username')}
                    >
                      Username
                    </th>
                    <th 
                      className={sortConfig.sortBy === 'email' ? `sorted-${sortConfig.sortDirection}` : ''}
                      onClick={() => handleSort('email')}
                    >
                      Email
                    </th>
                    <th 
                      className={sortConfig.sortBy === 'role' ? `sorted-${sortConfig.sortDirection}` : ''}
                      onClick={() => handleSort('role')}
                    >
                      Role
                    </th>
                    <th 
                      className={sortConfig.sortBy === 'status' ? `sorted-${sortConfig.sortDirection}` : ''}
                      onClick={() => handleSort('status')}
                    >
                      Status
                    </th>
                    <th 
                      className={sortConfig.sortBy === 'createdAt' ? `sorted-${sortConfig.sortDirection}` : ''}
                      onClick={() => handleSort('createdAt')}
                    >
                      Created
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleUserSelection(user.id)}
                        />
                      </td>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">
                            {user.photoURL ? (
                              <img src={handleGoogleProfileImage(user.photoURL)} alt={user.username} />
                            ) : (
                              <div className="avatar-placeholder">
                                {(user.firstName?.charAt(0) || user.username?.charAt(0) || '?').toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span>{user.username || user.displayName}</span>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.status}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-edit" 
                            onClick={() => handleEditClick(user)}
                            title="Edit user"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className="btn-delete" 
                            onClick={() => handleDeleteClick(user)}
                            title="Delete user"
                            disabled={user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                
                {/* Pagination controls */}
                <div className="pagination-controls">
                  <div className="pagination-info">
                    {users.length > 0
                      ? `Showing ${(pagination.currentPage - 1) * pagination.limit + 1} to ${Math.min(pagination.currentPage * pagination.limit, pagination.totalUsers)} of ${pagination.totalUsers} users`
                      : 'No users to display on this page.'}
                  </div>
                  <div className="pagination-buttons">
                    <button
                      className="pagination-button"
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.currentPage === 1}
                      title="First page"
                    >
                      «
                    </button>
                    <button
                      className="pagination-button"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      title="Previous page"
                    >
                      <FaAngleLeft />
                    </button>
                    
                    {/* Page number buttons */}
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      // If less than 5 pages, show all pages
                      // If more than 5 pages, show a window around the current page
                      let pageToShow;
                      if (pagination.totalPages <= 5) {
                        pageToShow = i + 1;
                      } else {
                        // Calculate the window
                        const offset = Math.max(
                          Math.min(
                            pagination.currentPage - 3,
                            pagination.totalPages - 5
                          ),
                          0
                        );
                        pageToShow = i + 1 + offset;
                      }
                      
                      return (
                        <button
                          key={pageToShow}
                          className={`pagination-button ${pagination.currentPage === pageToShow ? 'active' : ''}`}
                          onClick={() => handlePageChange(pageToShow)}
                        >
                          {pageToShow}
                        </button>
                      );
                    })}
                    
                    <button
                      className="pagination-button"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      title="Next page"
                    >
                      <FaAngleRight />
                    </button>
                    <button
                      className="pagination-button"
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      title="Last page"
                    >
                      »
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Create User Modal */}
        {isCreateModalOpen && selectedUser && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Create New User</h2>
              <form onSubmit={handleCreateSubmit}>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    value={selectedUser.username}
                    onChange={(e) => setSelectedUser({...selectedUser, username: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={selectedUser.email}
                    onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    value={selectedUser.password || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, password: e.target.value})}
                    required
                  />
                  <small className="form-helper-text">Password must be at least 8 characters</small>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      value={selectedUser.firstName || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, firstName: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      value={selectedUser.lastName || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, lastName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    value={selectedUser.status}
                    onChange={(e) => setSelectedUser({...selectedUser, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? <FaSpinner className="spinner" /> : 'Create User'}
                </button>
              </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Edit User Modal */}
        {isEditModalOpen && selectedUser && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Edit User</h2>
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    value={selectedUser.username || selectedUser.displayName || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, username: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={selectedUser.email}
                    onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password (leave blank to keep unchanged)</label>
                  <input
                    type="password"
                    id="password"
                    value={selectedUser.password || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, password: e.target.value})}
                  />
                  <small className="form-helper-text">If provided, password must be at least 8 characters</small>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      value={selectedUser.firstName || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, firstName: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      value={selectedUser.lastName || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, lastName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    value={selectedUser.status}
                    onChange={(e) => setSelectedUser({...selectedUser, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? <FaSpinner className="spinner" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedUser && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Confirm Deletion</h2>
              <p>Are you sure you want to delete the user <strong>{selectedUser.username || selectedUser.displayName}</strong>?</p>
              <p>This action cannot be undone. All user data will be permanently removed.</p>
              {selectedUser.role === 'admin' && (
                <div className="warning-message">
                  <FaExclamationTriangle />
                  <span>Warning: You are about to delete an admin user!</span>
                </div>
              )}
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-danger" 
                  onClick={confirmDeleteUser}
                  disabled={loading}
                >
                  {loading ? <FaSpinner className="spinner" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Notification Modal */}
        {isNotificationModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content notification-modal">
              <h2>
                {notificationType === 'weeklyUpdates' && <><FaBell /> Send Weekly Update</>}
                {notificationType === 'newAgents' && <><FaRobot /> Send New Agents Notification</>}
                {notificationType === 'newTools' && <><FaTools /> Send New Tools Notification</>}
              </h2>
              <p className="selected-users-count">
                Sending to {selectedUsers.length} selected user{selectedUsers.length !== 1 ? 's' : ''}
              </p>
              
              <form onSubmit={handleSendNotification}>
                <div className="form-group">
                  <label htmlFor="notificationTitle">Email Subject</label>
                  <input
                    type="text"
                    id="notificationTitle"
                    value={notificationContent.title}
                    onChange={(e) => setNotificationContent({...notificationContent, title: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="notificationMessage">Email Message</label>
                  <textarea
                    id="notificationMessage"
                    value={notificationContent.message}
                    onChange={(e) => setNotificationContent({...notificationContent, message: e.target.value})}
                    rows={6}
                    required
                  ></textarea>
                  <p className="form-helper-text">This will be sent to all selected users who have enabled the corresponding notification preference.</p>
                </div>
                
                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => setIsNotificationModalOpen(false)}
                    disabled={sendingNotification}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={sendingNotification}
                  >
                    {sendingNotification ? (
                      <>
                        <FaSpinner className="spinner" /> Sending...
                      </>
                    ) : (
                      <>Send Notification</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageUsers; 