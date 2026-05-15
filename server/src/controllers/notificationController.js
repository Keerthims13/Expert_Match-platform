import notificationService from '../services/notificationService.js';

/**
 * Get unread notifications for current user
 */
async function getUnreadNotifications(req, res) {
  try {
    const { limit = 20 } = req.query;
    const notifications = await notificationService.getUnreadNotifications(
      req.user.id,
      parseInt(limit)
    );
    res.json({ notifications });
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/**
 * Get notification history with pagination
 */
async function getNotificationHistory(req, res) {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const result = await notificationService.getNotificationHistory(
      req.user.id,
      parseInt(page),
      parseInt(pageSize)
    );
    res.json(result);
  } catch (error) {
    console.error('Error getting notification history:', error);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
}

/**
 * Mark single notification as read
 */
async function markNotificationAsRead(req, res) {
  try {
    const { id } = req.params;
    const notificationId = parseInt(id, 10);
    
    if (isNaN(notificationId) || notificationId <= 0) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }
    
    await notificationService.markNotificationAsRead(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(req, res) {
  try {
    const count = await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true, updatedCount: count });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
}

/**
 * Get unread notification count
 */
async function getUnreadCount(req, res) {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
}

/**
 * Delete notification
 */
async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const notificationId = parseInt(id, 10);
    
    if (isNaN(notificationId) || notificationId <= 0) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }
    
    await notificationService.deleteNotification(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
}

/**
 * Get user notification preferences
 */
async function getNotificationPreferences(req, res) {
  try {
    const preferences = await notificationService.getNotificationPreferences(req.user.id);
    res.json(preferences);
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
}

/**
 * Update notification preferences
 */
async function updateNotificationPreferences(req, res) {
  try {
    const preferences = await notificationService.updateNotificationPreferences(
      req.user.id,
      req.body
    );
    res.json(preferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
}

export default {
  getUnreadNotifications,
  getNotificationHistory,
  markNotificationAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
};
