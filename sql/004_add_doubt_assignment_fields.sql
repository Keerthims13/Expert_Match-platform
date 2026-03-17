USE Expert_Match;

ALTER TABLE doubts
  ADD COLUMN IF NOT EXISTS assigned_expert_id INT NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP NULL DEFAULT NULL;

SET @fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'doubts'
    AND CONSTRAINT_NAME = 'fk_doubts_assigned_expert'
);

SET @sql = IF(
  @fk_exists = 0,
  'ALTER TABLE doubts ADD CONSTRAINT fk_doubts_assigned_expert FOREIGN KEY (assigned_expert_id) REFERENCES experts(id) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
