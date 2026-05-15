import { getDbPool } from '../config/db.js';

/**
 * Notification Service - Handles creation, retrieval, and management of notifications
 */

let io;

function parseJsonField(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function normalizeNotificationRow(row) {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedUserId: row.relatedUserId,
    sessionId: row.sessionId,
    data: parseJsonField(row.data),
    isRead: Boolean(row.isRead),
    createdAt: row.createdAt,
  };
}

// Function to set the io instance (called after socket initialization)
export function setSocketIO(socketInstance) {
  io = socketInstance;
}

/**
 * Create a new notification for a user
 * @param {number} userId - Recipient user ID
 * @param {string} type - Notification type (session_request, session_accepted, etc.)
 * @param {string} title - Short title
 * @param {string} message - Full message
 * @param {object} options - Additional options
 *   - relatedUserId: ID of user who triggered notification
 *   - sessionId: Related session ID
 *   - data: JSON object with additional metadata
 * @returns {Promise<number>} Notification ID
 */
async function createNotification(userId, type, title, message, options = {}) {
  try {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      const query = `
        INSERT INTO notifications (
          user_id, type, title, message, related_user_id, session_id, data, is_read
        ) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)
      `;

      const [result] = await connection.query(query, [
        userId,
        type,
        title,
        message,
        options.relatedUserId || null,
        options.sessionId || null,
        options.data ? JSON.stringify(options.data) : null,
      ]);

      const notificationId = result.insertId;

      // Emit real-time notification event
      if (io) {
        io.to(`user:${userId}`).emit('new_notification', {
          id: notificationId,
          userId,
          type,
          title,
          message,
          relatedUserId: options.relatedUserId,
          sessionId: options.sessionId,
          data: options.data,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }

      return notificationId;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Get unread notifications for a user
 * @param {number} userId - User ID
 * @param {number} limit - Max results (default 20)
 * @returns {Promise<array>} Unread notifications
 */
async function getUnreadNotifications(userId, limit = 20) {
  try {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      const query = `
        SELECT 
          id,
          user_id as userId,
          type,
          title,
          message,
          related_user_id as relatedUserId,
          session_id as sessionId,
          data,
          is_read as isRead,
          created_at as createdAt
        FROM notifications
        WHERE user_id = ? AND is_read = FALSE
        ORDER BY created_at DESC
        LIMIT ?
      `;

      const [notifications] = await connection.query(query, [userId, limit]);

      return notifications.map(normalizeNotificationRow);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    throw error;
  }
}

/**
 * Get all notifications (with pagination)
 * @param {number} userId - User ID
 * @param {number} page - Page number (default 1)
 * @param {number} pageSize - Items per page (default 20)
 * @returns {Promise<object>} {notifications, total, hasMore}
 */
async function getNotificationHistory(userId, page = 1, pageSize = 20) {
  try {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      // Get total count
      const countQuery = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?';
      const [countRows] = await connection.query(countQuery, [userId]);
      const count = Number(countRows?.[0]?.count || 0);

      // Get paginated results
      const offset = (page - 1) * pageSize;
      const query = `
        SELECT 
          id,
          user_id as userId,
          type,
          title,
          message,
          related_user_id as relatedUserId,
          session_id as sessionId,
          data,
          is_read as isRead,
          created_at as createdAt
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [notifications] = await connection.query(query, [userId, pageSize, offset]);

      const parsed = notifications.map(normalizeNotificationRow);

      return {
        notifications: parsed,
        total: count,
        hasMore: offset + pageSize < count,
        page,
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching notification history:', error);
    throw error;
  }
}

/**
 * Mark a notification as read
 * @param {number} notificationId - Notification ID
 * @returns {Promise<boolean>} Success
 */
async function markNotificationAsRead(notificationId) {
  try {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      const query = 'UPDATE notifications SET is_read = TRUE WHERE id = ?';
      await connection.query(query, [notificationId]);
      return true;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Count of updated notifications
 */
async function markAllAsRead(userId) {
  try {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      const query = 'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE';
      const [result] = await connection.query(query, [userId]);
      return result.affectedRows;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
}

/**
 * Get unread notification count for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Count of unread notifications
 */
async function getUnreadCount(userId) {
  try {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      const query = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE';
      const [countRows] = await connection.query(query, [userId]);
      return Number(countRows?.[0]?.count || 0);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
}

/**
 * Delete a notification
 * @param {number} notificationId - Notification ID
 * @returns {Promise<boolean>} Success
 */
async function deleteNotification(notificationId) {
  try {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      const query = 'DELETE FROM notifications WHERE id = ?';
      await connection.query(query, [notificationId]);
      return true;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

/**
 * Get user notification preferences
 * @param {number} userId - User ID
 * @returns {Promise<object>} User preferences or defaults
 */
async function getNotificationPreferences(userId) {
  try {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      const query = 'SELECT * FROM notification_preferences WHERE user_id = ?';
      const [results] = await connection.query(query, [userId]);

      if (results.length > 0) {
        const row = results[0];
        return {
          userId: row.user_id,
          pushEnabled: Boolean(row.push_enabled),
          emailEnabled: Boolean(row.email_enabled),
          smsEnabled: Boolean(row.sms_enabled),
          phoneNumber: row.phone_number,
          emailOnSessionRequest: Boolean(row.email_on_session_request),
          emailOnSessionAccepted: Boolean(row.email_on_session_accepted),
          emailOnSessionRejected: Boolean(row.email_on_session_rejected),
          emailOnNewMessage: Boolean(row.email_on_new_message),
          smsOnSessionRequest: Boolean(row.sms_on_session_request),
          smsOnSessionAccepted: Boolean(row.sms_on_session_accepted),
        };
      }

      // Return defaults if no preferences exist
      return {
        userId,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        phoneNumber: null,
        emailOnSessionRequest: true,
        emailOnSessionAccepted: true,
        emailOnSessionRejected: false,
        emailOnNewMessage: false,
        smsOnSessionRequest: false,
        smsOnSessionAccepted: true,
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    throw error;
  }
}

/**
 * Update notification preferences
 * @param {number} userId - User ID
 * @param {object} preferences - Updated preferences
 * @returns {Promise<object>} Updated preferences
 */
async function updateNotificationPreferences(userId, preferences) {
  try {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      // Check if preferences exist
      let query = 'SELECT id FROM notification_preferences WHERE user_id = ?';
      const [results] = await connection.query(query, [userId]);

      if (results.length === 0) {
        // Create new preferences
        query = `
          INSERT INTO notification_preferences (
            user_id, push_enabled, email_enabled, sms_enabled, phone_number,
            email_on_session_request, email_on_session_accepted, email_on_session_rejected,
            email_on_new_message, sms_on_session_request, sms_on_session_accepted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.query(query, [
          userId,
          preferences.pushEnabled !== undefined ? preferences.pushEnabled : true,
          preferences.emailEnabled !== undefined ? preferences.emailEnabled : true,
          preferences.smsEnabled !== undefined ? preferences.smsEnabled : false,
          preferences.phoneNumber || null,
          preferences.emailOnSessionRequest !== undefined ? preferences.emailOnSessionRequest : true,
          preferences.emailOnSessionAccepted !== undefined ? preferences.emailOnSessionAccepted : true,
          preferences.emailOnSessionRejected !== undefined ? preferences.emailOnSessionRejected : false,
          preferences.emailOnNewMessage !== undefined ? preferences.emailOnNewMessage : false,
          preferences.smsOnSessionRequest !== undefined ? preferences.smsOnSessionRequest : false,
          preferences.smsOnSessionAccepted !== undefined ? preferences.smsOnSessionAccepted : true,
        ]);
      } else {
        // Update existing preferences
        const updates = [];
        const values = [];

        if (preferences.pushEnabled !== undefined) {
          updates.push('push_enabled = ?');
          values.push(preferences.pushEnabled);
        }
        if (preferences.emailEnabled !== undefined) {
          updates.push('email_enabled = ?');
          values.push(preferences.emailEnabled);
        }
        if (preferences.smsEnabled !== undefined) {
          updates.push('sms_enabled = ?');
          values.push(preferences.smsEnabled);
        }
        if (preferences.phoneNumber !== undefined) {
          updates.push('phone_number = ?');
          values.push(preferences.phoneNumber);
        }
        if (preferences.emailOnSessionRequest !== undefined) {
          updates.push('email_on_session_request = ?');
          values.push(preferences.emailOnSessionRequest);
        }
        if (preferences.emailOnSessionAccepted !== undefined) {
          updates.push('email_on_session_accepted = ?');
          values.push(preferences.emailOnSessionAccepted);
        }
        if (preferences.emailOnSessionRejected !== undefined) {
          updates.push('email_on_session_rejected = ?');
          values.push(preferences.emailOnSessionRejected);
        }
        if (preferences.emailOnNewMessage !== undefined) {
          updates.push('email_on_new_message = ?');
          values.push(preferences.emailOnNewMessage);
        }
        if (preferences.smsOnSessionRequest !== undefined) {
          updates.push('sms_on_session_request = ?');
          values.push(preferences.smsOnSessionRequest);
        }
        if (preferences.smsOnSessionAccepted !== undefined) {
          updates.push('sms_on_session_accepted = ?');
          values.push(preferences.smsOnSessionAccepted);
        }

        if (updates.length > 0) {
          values.push(userId);
          query = `UPDATE notification_preferences SET ${updates.join(', ')} WHERE user_id = ?`;
          await connection.query(query, values);
        }
      }

      // Return updated preferences
      return getNotificationPreferences(userId);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
}

/**
 * Ensure notification tables exist
 * @returns {Promise<void>}
 */
async function ensureNotificationTablesExist() {
  try {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      // Create notifications table
      const notificationsTable = `
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          related_user_id INT,
          session_id INT,
          data JSON,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_type (type),
          INDEX idx_is_read (is_read),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
        )
      `;
      await connection.query(notificationsTable);

      // Create notification_preferences table
      const preferencesTable = `
        CREATE TABLE IF NOT EXISTS notification_preferences (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL UNIQUE,
          push_enabled BOOLEAN DEFAULT TRUE,
          email_enabled BOOLEAN DEFAULT TRUE,
          sms_enabled BOOLEAN DEFAULT FALSE,
          phone_number VARCHAR(20),
          email_on_session_request BOOLEAN DEFAULT TRUE,
          email_on_session_accepted BOOLEAN DEFAULT TRUE,
          email_on_session_rejected BOOLEAN DEFAULT FALSE,
          email_on_new_message BOOLEAN DEFAULT FALSE,
          sms_on_session_request BOOLEAN DEFAULT FALSE,
          sms_on_session_accepted BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;
      await connection.query(preferencesTable);

      console.log('✓ Notification tables verified/created');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error ensuring notification tables exist:', error);
    throw error;
  }
}

export default {
  createNotification,
  getUnreadNotifications,
  getNotificationHistory,
  markNotificationAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  ensureNotificationTablesExist,
  setSocketIO,
};
