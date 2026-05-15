import React, { useRef, useEffect } from 'react';

export default function NotificationDropdown({
  notifications = [],
  onNotificationRead,
  onMarkAllAsRead,
  onClose,
  onViewAll,
  style
}) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleNotificationClick = (notification) => {
    if (!notification.isRead && onNotificationRead) {
      onNotificationRead(notification.id);
    }
  };

    const getNotificationIcon = (type = 'default') => {
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

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-dropdown" ref={dropdownRef} style={style}>
      <div className="notification-dropdown-header">
        <h3>Notifications</h3>
        {notifications.length > 0 && (
          <button
            type="button"
            className="mark-all-read-btn"
            onClick={onMarkAllAsRead}
            title="Mark all as read"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="notification-dropdown-content">
        {notifications.length === 0 ? (
          <div className="notification-empty">
            <p>No new notifications</p>
          </div>
        ) : (
          <ul className="notification-list">
            {notifications.map((notification, index) => {
              if (!notification) return null;
              const itemKey = notification.id || `${notification.type || 'notice'}-${notification.createdAt || 'unknown'}-${index}`;

              return (
                <li
                  key={itemKey}
                  className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {formatTime(notification.createdAt)}
                    </div>
                  </div>
                  {!notification.isRead && (
                    <span className="notification-unread-indicator" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="notification-dropdown-footer">
        <button
          type="button"
          className="view-all-link"
          onClick={() => {
            onClose();
            if (onViewAll) onViewAll();
          }}
        >
          View all notifications →
        </button>
      </div>
    </div>
  );
}
