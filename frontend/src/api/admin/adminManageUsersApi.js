import { api } from '../core/apiConfig';

/**
 * Fetch users with pagination
 * @param {number} page - Page number (starts from 1)
 * @param {number} limit - Number of users per page
 * @param {string} search - Search query for filtering users
 * @param {string} sortBy - Field to sort by
 * @param {string} sortDirection - Sort direction (asc or desc)
 * @returns {Promise<Object>} - Users data with pagination info
 */
export const fetchUsers = async (page = 1, limit = 10, search = '', sortBy = 'createdAt', sortDirection = 'desc') => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    
    if (search) params.append('search', search);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortDirection) params.append('sortDirection', sortDirection);
    
    console.log(`[API] Fetching users with params: ${params.toString()}`);
    
    const response = await api.get(`/api/users?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};
/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Created user data
 */
export const createUser = async (userData) => {
  try {
    console.log('[API] Creating new user:', userData);
    const response = await api.post('/api/admin/users', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update an existing user
 * @param {string} userId - ID of the user to update
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} - Updated user data
 */
export const updateUser = async (userId, userData) => {
  try {
    console.log(`[API] Updating user ${userId}:`, userData);
    const response = await api.put(`/api/admin/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error;
  }
};

/**
 * Delete a user
 * @param {string} userId - ID of the user to delete
 * @returns {Promise<Object>} - Response with success status
 */
export const deleteUser = async (userId) => {
  try {
    console.log(`[API] Deleting user ${userId}`);
    const response = await api.delete(`/api/admin/users/${userId}`);
    return {
      success: true,
      message: 'User deleted successfully',
      ...response.data
    };
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get user roles
 * @returns {Promise<Array>} - Array of available user roles
 */
export const getUserRoles = async () => {
  try {
    const response = await api.get('/api/admin/users/roles');
    return response.data.roles || [];
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return ['admin', 'user', 'moderator']; // Fallback default roles
  }
};

/**
 * Send notification to users
 * @param {Array<string>} userIds - Array of user IDs to notify
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} - Response with success status
 */
export const sendUserNotification = async (userIds, notificationData) => {
  try {
    console.log(`[API] Sending notification to ${userIds.length} users`);
    const response = await api.post('/api/admin/users/notify', {
      userIds,
      notification: notificationData
    });
    return {
      success: true,
      message: `Notification sent to ${userIds.length} users`,
      ...response.data
    };
  } catch (error) {
    console.error('Error sending user notification:', error);
    throw error;
  }
};

/**
 * Get user statistics
 * @returns {Promise<Object>} - User statistics data
 */
export const getUserStats = async () => {
  try {
    const response = await api.get('/api/admin/users/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw error;
  }
}; 