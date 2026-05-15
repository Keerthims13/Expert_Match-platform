import React, { useState, useEffect } from 'react';
import { fetchNotificationHistory, markNotificationAsRead, deleteNotification } from '../services/notificationApi';

export default function NotificationHistoryPage() {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageSize] = useState(20);

  useEffect(() => {
    loadNotifications();
  }, [page]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const result = await fetchNotificationHistory(page, pageSize);
      console.log('Notification history result:', result);
      setNotifications(result.notifications || []);
      setTotal(result.total || 0);
      setHasMore(result.hasMore || false);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const success = await markNotificationAsRead(notificationId);
      if (success) {
        setNotifications(
          notifications.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      const success = await deleteNotification(notificationId);
      if (success) {
        setNotifications(notifications.filter((n) => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'session_request':
        return '📬';
      case 'session_accepted':
        return '✅';
      case 'session_rejected':
        return '❌';
      case 'session_feedback':
        return '📝';
      case 'message_received':
        return '💬';
      default:
        return 'ℹ️';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type) => {
    const labels = {
      session_request: 'Chat Request',
      session_accepted: 'Request Accepted',
      session_rejected: 'Request Declined',
      session_feedback: 'Session Feedback',
      message_received: 'New Message',
    };
    return labels[type] || type;
  };

  return (
    <div className="notification-history-page">
      <div className="notification-history-header">
        <h1>Notification History</h1>
        <p className="notification-count">
          Total: {total} notification{total !== 1 ? 's' : ''}
        </p>
      </div>

      {loading && notifications.length === 0 ? (
        <div className="loading-state">
          <p>Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <p>No notifications yet</p>
          <p className="subtext">You'll see all your notifications here</p>
        </div>
      ) : (
        <>
          <div className="notification-history-list">
            {notifications.map((notification) => {
              if (!notification) return null;
              return (
                <div
                  key={notification.id}
                  className={`notification-history-item ${notification.isRead ? 'read' : 'unread'}`}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="notification-details">
                    <div className="notification-header">
                      <h3 className="notification-title">{notification.title || 'Notification'}</h3>
                      <span className="notification-type">
                        {getTypeLabel(notification.type)}
                      </span>
                    </div>
                    <p className="notification-message">{notification.message || 'No message'}</p>
                    <div className="notification-meta">
                      <time className="notification-date">
                        {formatDate(notification.createdAt)}
                      </time>
                      {!notification.isRead && (
                        <span className="unread-badge">Unread</span>
                      )}
                    </div>
                  </div>

                  <div className="notification-actions">
                    {!notification.isRead && (
                      <button
                        type="button"
                        className="action-btn read-btn"
                        onClick={() => handleMarkAsRead(notification.id)}
                        title="Mark as read"
                      >
                        ✓ Read
                      </button>
                    )}
                    <button
                      type="button"
                      className="action-btn delete-btn"
                      onClick={() => handleDelete(notification.id)}
                      title="Delete notification"
                    >
                      × Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="pagination">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
