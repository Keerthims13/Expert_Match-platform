import mysql from 'mysql2/promise';

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Varijams@24',
      database: 'expert_match'
    });

    const sql = `
      ALTER TABLE session_messages
        ADD COLUMN IF NOT EXISTS message_status VARCHAR(20) NOT NULL DEFAULT 'sent',
        ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP NULL DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS seen_at TIMESTAMP NULL DEFAULT NULL
    `;

    await conn.query(sql);
    console.log('SUCCESS: Message status columns added');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.log('ERROR: ' + err.message);
    console.error(err);
    process.exit(1);
  }
})();
