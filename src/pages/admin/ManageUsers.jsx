import React, { useState, useEffect } from 'react';
import { FaUser, FaEdit, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import AdminLayout from '../../components/admin/AdminLayout';
import './ManageUsers.css';

/**
 * Admin page for managing users
 */
const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);
  
  // Function to fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // In a real application, this would be an API call
      // For now, we'll simulate with a timeout and mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockUsers = [
        { id: 1, username: 'john_doe', email: 'john.doe@example.com', role: 'user', status: 'active', createdAt: '2023-05-10T08:30:00Z' },
        { id: 2, username: 'jane_smith', email: 'jane.smith@example.com', role: 'user', status: 'active', createdAt: '2023-05-12T14:45:00Z' },
        { id: 3, username: 'admin_user', email: 'admin@example.com', role: 'admin', status: 'active', createdAt: '2023-04-01T10:00:00Z' },
        { id: 4, username: 'sam_wilson', email: 'sam.wilson@example.com', role: 'user', status: 'inactive', createdAt: '2023-05-15T09:20:00Z' },
        { id: 5, username: 'alex_johnson', email: 'alex.johnson@example.com', role: 'user', status: 'active', createdAt: '2023-05-18T16:10:00Z' }
      ];
      
      setUsers(mockUsers);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Handle edit user
  const handleEditClick = (user) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };
  
  // Handle delete user
  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };
  
  // Delete user
  const deleteUser = () => {
    // In a real application, this would be an API call
    setUsers(users.filter(user => user.id !== selectedUser.id));
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
  };
  
  // Edit user form submit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    // In a real application, this would be an API call
    const updatedUsers = users.map(user => 
      user.id === selectedUser.id ? selectedUser : user
    );
    setUsers(updatedUsers);
    setIsEditModalOpen(false);
    setSelectedUser(null);
  };
  
  return (
    <AdminLayout>
      <div className="manage-users-page">
        <header className="page-header">
          <h1>Manage Users</h1>
          <button className="btn-primary">Add New User</button>
        </header>
        
        {error && (
          <div className="error-message">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {loading ? (
          <div className="loading-message">Loading users...</div>
        ) : (
          <div className="users-table-container">
            {filteredUsers.length === 0 ? (
              <div className="no-users-message">
                No users found matching your search criteria.
              </div>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">
                            <FaUser />
                          </div>
                          <span>{user.username}</span>
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
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedUser && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Confirm Deletion</h2>
              <p>Are you sure you want to delete the user <strong>{selectedUser.username}</strong>?</p>
              <p>This action cannot be undone.</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                  Cancel
                </button>
                <button className="btn-danger" onClick={deleteUser}>
                  Delete
                </button>
              </div>
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
                  <button type="submit" className="btn-primary">
                    Save Changes
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