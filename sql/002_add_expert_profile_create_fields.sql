USE Expert_Match;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(140) NOT NULL,
  email VARCHAR(160) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (id, full_name, email)
VALUES (1, 'Elena Rodriguez', 'elena@example.com')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

ALTER TABLE experts
  ADD COLUMN IF NOT EXISTS user_id INT NULL,
  ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) NOT NULL DEFAULT 'offline';

UPDATE experts SET user_id = 1 WHERE user_id IS NULL;

ALTER TABLE experts
  ADD UNIQUE KEY IF NOT EXISTS uk_experts_user_id (user_id);

ALTER TABLE experts
  ADD CONSTRAINT fk_experts_user
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE CASCADE;

ALTER TABLE experts
  MODIFY COLUMN user_id INT NOT NULL;
