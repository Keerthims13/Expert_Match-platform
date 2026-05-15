import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import NotificationDropdown from './NotificationDropdown';

export default function BellIcon({ unreadCount = 0, notifications = [], onNotificationRead, onMarkAllAsRead, onViewAll }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const buttonRef = useRef(null);

  const handleBellClick = () => {
    setIsDropdownOpen((current) => !current);
  };

  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    if (!isDropdownOpen) return undefined;

    const updatePosition = () => {
      const buttonElement = buttonRef.current;
      if (!buttonElement) return;

      const rect = buttonElement.getBoundingClientRect();
      const viewportPadding = 8;
      const dropdownWidth = Math.min(420, window.innerWidth - viewportPadding * 2);
      const left = Math.max(
        viewportPadding,
        Math.min(rect.right - dropdownWidth, window.innerWidth - dropdownWidth - viewportPadding)
      );
      const top = rect.bottom + 8;

      setDropdownPosition({
        position: 'fixed',
        top,
        left,
        width: dropdownWidth,
        maxHeight: Math.max(240, window.innerHeight - top - viewportPadding)
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isDropdownOpen]);

  return (
    <div className="notification-bell-wrapper">
      <button
        ref={buttonRef}
        type="button"
        className="notification-bell"
        onClick={handleBellClick}
        title={`${unreadCount} new notification${unreadCount !== 1 ? 's' : ''}`}
        aria-label={`Notifications: ${unreadCount} unread`}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isDropdownOpen && typeof document !== 'undefined'
        ? createPortal(
            <NotificationDropdown
              notifications={notifications}
              onNotificationRead={onNotificationRead}
              onMarkAllAsRead={onMarkAllAsRead}
              onClose={handleCloseDropdown}
              onViewAll={onViewAll}
              style={dropdownPosition}
            />,
            document.body
          )
        : null}
    </div>
  );
}
