import { getDbPool } from './server/src/config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'server', '.env') });

async function initializeAdmin() {
  try {
    const pool = getDbPool();
    console.log('Initializing admin user...');

    // Check if admin already exists
    const [existing] = await pool.query('SELECT * FROM admins WHERE email = ?', ['admin@expertmatch.com']);
    
    if (existing.length > 0) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Hash password
    const password = 'admin123'; // Change this in production!
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert admin user
    await pool.query(
      'INSERT INTO admins (email, password, fullName, role, isActive) VALUES (?, ?, ?, ?, ?)',
      ['admin@expertmatch.com', hashedPassword, 'Admin User', 'admin', true]
    );

    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@expertmatch.com');
    console.log('🔐 Password: admin123');
    console.log('⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing admin:', error);
    process.exit(1);
  }
}

initializeAdmin();
