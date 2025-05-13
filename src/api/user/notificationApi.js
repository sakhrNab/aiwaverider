import { api } from '../core/apiConfig';

// Get notifications for the current user
export const getUserNotifications = async (page = 1, limit = 10) => {
  try {
    const response = await api.get('/api/notifications', {
      params: { page, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await api.put('/api/notifications/read-all');
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Get notification preferences
export const getNotificationPreferences = async () => {
  try {
    const response = await api.get('/api/notifications/preferences');
    return response.data;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    throw error;
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (preferences) => {
  try {
    const response = await api.put('/api/notifications/preferences', preferences);
    return response.data;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

// Delete a notification
export const deleteNotification = async (notificationId) => {
  try {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

// Delete all notifications
export const deleteAllNotifications = async () => {
  try {
    const response = await api.delete('/api/notifications');
    return response.data;
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    throw error;
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async () => {
  try {
    const response = await api.get('/api/notifications/unread-count');
    return response.data;
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return { count: 0 };
  }
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (subscription) => {
  try {
    const response = await api.post('/api/notifications/push-subscription', subscription);
    return response.data;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (subscriptionId) => {
  try {
    const response = await api.delete(`/api/notifications/push-subscription/${subscriptionId}`);
    return response.data;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
}; 