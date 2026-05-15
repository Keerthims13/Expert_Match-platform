import { getDbPool } from './server/src/config/db.js';

async function checkNotifications() {
  try {
    const pool = getDbPool();
    const connection = await pool.getConnection();
    
    try {
      // Get expert by email
      const expertQuery = `SELECT id, email, full_name, user_id FROM users WHERE email = 'expert@test.com'`;
      const [expert] = await connection.query(expertQuery);
      console.log('Expert:', expert);
      
      if (expert && expert.id) {
        // Get notifications for this expert
        const notifQuery = `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`;
        const notifications = await connection.query(notifQuery, [expert.id]);
        console.log('Notifications for expert:', notifications.length);
        notifications.forEach((n, i) => {
          console.log(`\nNotification ${i + 1}:`);
          console.log(`  ID: ${n.id}`);
          console.log(`  Type: ${n.type}`);
          console.log(`  Title: ${n.title}`);
          console.log(`  Message: ${n.message}`);
          console.log(`  Created: ${n.created_at}`);
          console.log(`  IsRead: ${n.is_read}`);
          console.log(`  Data: ${n.data}`);
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkNotifications();
