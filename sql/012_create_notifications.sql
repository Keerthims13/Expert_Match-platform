-- Create notifications table for storing user notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL COMMENT 'session_request, session_accepted, session_rejected, message_received, etc.',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_user_id INT COMMENT 'ID of user who triggered notification (expert or student)',
  session_id INT COMMENT 'Related session ID if applicable',
  data JSON COMMENT 'Additional metadata as JSON',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);
