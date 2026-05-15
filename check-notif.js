// Check notifications for Test Expert
import mysql from 'mysql2/promise';

async function checkNotifications() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root@123',
    database: 'expert_match',
    waitForConnections: true,
    connectionLimit: 1,
  });

  try {
    const conn = await pool.getConnection();
    
    try {
      // Check expert user
      const [users] = await conn.query('SELECT id, email, full_name FROM users WHERE id = 1774032316');
      console.log('Expert User:', users[0]);
      
      // Get notifications for this user
      const [notifs] = await conn.query(
        'SELECT id, user_id, type, title, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [1774032316]
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
  } finally {
    await pool.end();
  }
  
  process.exit(0);
}

checkNotifications();
