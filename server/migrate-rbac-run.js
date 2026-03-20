import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    await conn.query('ALTER TABLE doubts ADD COLUMN IF NOT EXISTS requester_user_id INT NULL');
    await conn.query('ALTER TABLE doubts ADD INDEX idx_doubts_requester_user_id (requester_user_id)').catch(() => {});

    const [fkRows] = await conn.query(`
      SELECT COUNT(*) AS count
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'doubts'
        AND CONSTRAINT_NAME = 'fk_doubts_requester_user'
    `);

    if (!Number(fkRows?.[0]?.count)) {
      await conn.query(`
        ALTER TABLE doubts
        ADD CONSTRAINT fk_doubts_requester_user
        FOREIGN KEY (requester_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
      `);
    }

    console.log('SUCCESS: RBAC migration applied');
    await conn.end();
  } catch (error) {
    console.log('ERROR: ' + error.message);
    process.exit(1);
  }
})();
