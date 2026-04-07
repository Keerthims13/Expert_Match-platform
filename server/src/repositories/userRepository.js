import { getDbPool } from '../config/db.js';

function mapUserRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    profileImageUrl: row.profile_image_url || '',
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

export const userRepository = {
  async findAll() {
    const pool = getDbPool();
    const [rows] = await pool.query('SELECT * FROM users ORDER BY id DESC');
    return rows.map(mapUserRow);
  },

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
    let result;

    try {
      [result] = await pool.query(
        `
          INSERT INTO users (full_name, email, role, password_hash, profile_image_url)
          VALUES (?, ?, ?, ?, ?)
        `,
        [payload.fullName, payload.email, payload.role, payload.passwordHash || null, payload.profileImageUrl || null]
      );
    } catch (error) {
      // Backward compatibility if profile_image_url migration is not applied yet.
      if (error?.code !== 'ER_BAD_FIELD_ERROR') {
        throw error;
      }

      [result] = await pool.query(
        `
          INSERT INTO users (full_name, email, role, password_hash)
          VALUES (?, ?, ?, ?)
        `,
        [payload.fullName, payload.email, payload.role, payload.passwordHash || null]
      );
    }

    return this.findById(result.insertId);
  },

  async updateProfileImageById(id, profileImageUrl) {
    const pool = getDbPool();
    const [result] = await pool.query(
      `
        UPDATE users
        SET profile_image_url = ?
        WHERE id = ?
      `,
      [profileImageUrl, Number(id)]
    );

    if (!result.affectedRows) return null;
    return this.findById(id);
  }
};
