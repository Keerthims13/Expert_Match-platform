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

    await conn.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student',
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);

    console.log('SUCCESS: Auth migration applied');
    await conn.end();
  } catch (error) {
    console.log('ERROR: ' + error.message);
    process.exit(1);
  }
})();
