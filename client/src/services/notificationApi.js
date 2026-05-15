import { apiFetch } from './httpClient';

export async function fetchUnreadNotifications(limit = 20) {
  try {
    const response = await apiFetch(`/api/notifications?limit=${limit}`);
    return response.notifications || [];
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return [];
  }
}

export async function fetchUnreadCount() {
  try {
    const response = await apiFetch('/api/notifications/count');
    return response.unreadCount || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

export async function fetchNotificationHistory(page = 1, pageSize = 20) {
  try {
    const response = await apiFetch(`/api/notifications/history?page=${page}&pageSize=${pageSize}`);
    return response;
  } catch (error) {
    console.error('Error fetching notification history:', error);
    return {
      notifications: [],
      total: 0,
      hasMore: false,
      page: 1,
    };
  }
}

export async function markNotificationAsRead(notificationId) {
  try {
    const response = await apiFetch(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
    return response.success || false;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const response = await apiFetch('/api/notifications/read-all', {
      method: 'PUT',
    });
    return response.updatedCount || 0;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return 0;
  }
}

export async function deleteNotification(notificationId) {
  try {
    const response = await apiFetch(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });
    return response.success || false;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}

export async function fetchNotificationPreferences() {
  try {
    const response = await apiFetch('/api/notification-preferences');
    return response;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return null;
  }
}

export async function updateNotificationPreferences(preferences) {
  try {
    const response = await apiFetch('/api/notification-preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
    return response;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return null;
  }
}
