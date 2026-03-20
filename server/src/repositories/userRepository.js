import { getDbPool } from '../config/db.js';

function mapUserRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

export const userRepository = {
  async findByEmail(email) {
    const pool = getDbPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (!rows.length) return null;
    return mapUserRow(rows[0]);
  },

  async findById(id) {
    const pool = getDbPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return null;
    return mapUserRow(rows[0]);
  },

  async create(payload) {
    const pool = getDbPool();
    const [result] = await pool.query(
      `
        INSERT INTO users (full_name, email, role, password_hash)
        VALUES (?, ?, ?, ?)
      `,
      [payload.fullName, payload.email, payload.role, payload.passwordHash]
    );

    return this.findById(result.insertId);
  }
};
