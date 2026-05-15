-- Migration: update existing report categories from 'misconduct' to 'unprofessional behavior'
UPDATE user_reports
SET category = 'unprofessional behavior'
WHERE LOWER(TRIM(category)) = 'misconduct';

-- Verify rows updated
SELECT COUNT(*) AS updated_count FROM user_reports WHERE LOWER(TRIM(category)) = 'unprofessional behavior';
