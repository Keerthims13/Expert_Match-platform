#!/usr/bin/env node
import { getDbPool } from '../src/config/db.js';

async function run() {
  const pool = getDbPool();
  try {
    console.log('Starting reports category migration...');
    const [result] = await pool.query(
      "UPDATE user_reports SET category = ? WHERE LOWER(TRIM(category)) = ?",
      ['unprofessional behavior', 'misconduct']
    );

    console.log(`Rows affected: ${result.affectedRows}`);

    const [verify] = await pool.query(
      "SELECT COUNT(*) AS updated_count FROM user_reports WHERE LOWER(TRIM(category)) = ?",
      ['unprofessional behavior']
    );

    console.log('Verification:', verify[0]);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
