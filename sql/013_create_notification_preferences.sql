-- Create notification_preferences table to store user notification settings
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  push_enabled BOOLEAN DEFAULT TRUE COMMENT 'In-app toast notifications',
  email_enabled BOOLEAN DEFAULT TRUE COMMENT 'Email notifications',
  sms_enabled BOOLEAN DEFAULT FALSE COMMENT 'SMS notifications',
  phone_number VARCHAR(20) COMMENT 'User phone number for SMS',
  email_on_session_request BOOLEAN DEFAULT TRUE,
  email_on_session_accepted BOOLEAN DEFAULT TRUE,
  email_on_session_rejected BOOLEAN DEFAULT FALSE,
  email_on_new_message BOOLEAN DEFAULT FALSE COMMENT 'Email digest instead of per-message',
  sms_on_session_request BOOLEAN DEFAULT FALSE,
  sms_on_session_accepted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
