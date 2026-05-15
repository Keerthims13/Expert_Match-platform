import { getDbPool } from '../config/db.js';

const createReportsTableSql = `
  CREATE TABLE IF NOT EXISTS user_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reporter_user_id INT NOT NULL,
    reported_user_id INT NULL,
    reported_expert_id INT NULL,
    session_id INT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'unprofessional behavior',
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    admin_action VARCHAR(100) NULL,
    admin_notes TEXT NULL,
    resolved_by INT NULL,
    resolved_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reports_status (status),
    INDEX idx_reports_created (created_at),
    INDEX idx_reports_reporter (reporter_user_id),
    INDEX idx_reports_reported_user (reported_user_id),
    INDEX idx_reports_reported_expert (reported_expert_id),
    INDEX idx_reports_session (session_id),
    CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reports_user FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_reports_expert FOREIGN KEY (reported_expert_id) REFERENCES experts(id) ON DELETE SET NULL,
    CONSTRAINT fk_reports_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
    CONSTRAINT fk_reports_admin FOREIGN KEY (resolved_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const reportService = {
  async ensureReportsTableExists() {
    const pool = getDbPool();
    await pool.query(createReportsTableSql);
  }
};

export default reportService;
