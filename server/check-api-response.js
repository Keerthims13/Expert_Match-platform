import { getDbPool } from './src/config/db.js';

async function checkAPI() {
  try {
    const pool = getDbPool();
    const conn = await pool.getConnection();
    
    try {
      // Get ALL notifications for expert
      const [notifs] = await conn.query(
        'SELECT id, user_id, type, title, message, data, is_read, created_at FROM notifications WHERE user_id = 1774032316 ORDER BY created_at DESC'
      );
      
      console.log(`Total notifications in DB: ${notifs.length}\n`);
      notifs.forEach((n, i) => {
        console.log(`Notification ${i + 1}:`);
        console.log(`  ID: ${n.id}`);
        console.log(`  Type: ${n.type}`);
        console.log(`  Title: ${n.title}`);
        console.log(`  Message: "${n.message}"`);
        console.log(`  Data: ${n.data}`);
        console.log(`  IsRead: ${n.is_read}`);
        console.log(`  Created: ${n.created_at}`);
        console.log('');
      });

      // Also check what the API layer would return
      console.log('\n--- API Transformation ---\n');
      const transformed = notifs.map(n => ({
        ...n,
        data: n.data ? JSON.parse(n.data) : null,
      }));
      
      console.log('First notification as API would send it:');
      console.log(JSON.stringify(transformed[0], null, 2));
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

checkAPI();
