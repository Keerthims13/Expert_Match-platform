USE Expert_Match;

CREATE TABLE IF NOT EXISTS session_participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  sender_role VARCHAR(20) NOT NULL,
  sender_name VARCHAR(140) NOT NULL,
  last_read_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_session_participant (session_id, sender_role, sender_name),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
