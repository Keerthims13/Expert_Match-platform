USE Expert_Match;

ALTER TABLE doubts
  ADD COLUMN IF NOT EXISTS requester_user_id INT NULL,
  ADD INDEX IF NOT EXISTS idx_doubts_requester_user_id (requester_user_id);

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'doubts'
    AND CONSTRAINT_NAME = 'fk_doubts_requester_user'
);

SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE doubts ADD CONSTRAINT fk_doubts_requester_user FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
