-- Create admins table for admin authentication
CREATE TABLE IF NOT EXISTS admins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  fullName VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_isActive (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add audit_logs table for monitoring
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  adminId INT,
  action VARCHAR(255),
  entityType VARCHAR(100),
  entityId INT,
  details JSON,
  ipAddress VARCHAR(45),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_adminId (adminId),
  INDEX idx_createdAt (createdAt),
  INDEX idx_action (action),
  FOREIGN KEY (adminId) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add status column to users table for approval workflow
ALTER TABLE users ADD COLUMN IF NOT EXISTS accountStatus VARCHAR(50) DEFAULT 'pending' COMMENT 'pending, approved, disabled';
ALTER TABLE users ADD COLUMN IF NOT EXISTS accountDisabledReason VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approvedBy INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approvedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE users ADD INDEX idx_accountStatus (accountStatus);

-- Add status column to experts table for approval workflow
ALTER TABLE experts ADD COLUMN IF NOT EXISTS accountStatus VARCHAR(50) DEFAULT 'pending' COMMENT 'pending, approved, disabled';
ALTER TABLE experts ADD COLUMN IF NOT EXISTS accountDisabledReason VARCHAR(500);
ALTER TABLE experts ADD COLUMN IF NOT EXISTS approvedBy INT;
ALTER TABLE experts ADD COLUMN IF NOT EXISTS approvedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE experts ADD INDEX idx_accountStatus (accountStatus);
