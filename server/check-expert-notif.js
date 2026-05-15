import { getDbPool } from './src/config/db.js';

async function checkNotifications() {
  try {
    const pool = getDbPool();
    const conn = await pool.getConnection();
    
    try {
      // Check expert user
      const [users] = await conn.query('SELECT id, email, full_name FROM users WHERE id = 1774032316');
      console.log('Expert User:', users[0]);
      
      // Get notifications for this user
      const [notifs] = await conn.query(
        'SELECT id, user_id, type, title, message, is_read, created_at FROM notifications WHERE user_id = 1774032316 ORDER BY created_at DESC'
      );
      
      console.log(`\nFound ${notifs.length} notifications for user 1774032316:\n`);
      notifs.forEach((n, i) => {
        console.log(`Notification ${i + 1}:`);
        console.log(`  ID: ${n.id}`);
        console.log(`  Type: ${n.type}`);
        console.log(`  Title: ${n.title}`);
        console.log(`  Message: "${n.message}"`);
        console.log(`  IsRead: ${n.is_read}`);
        console.log(`  Created: ${n.created_at}`);
        console.log('');
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

checkNotifications();
