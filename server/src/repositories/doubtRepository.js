import { getDbPool } from '../config/db.js';

function mapDoubtRow(row) {
  return {
    id: row.id,
    requesterName: row.requester_name,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    createdAtLabel: new Date(row.created_at).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
}

export const doubtRepository = {
  async findAll() {
    const pool = getDbPool();
    const [rows] = await pool.query('SELECT * FROM doubts ORDER BY created_at DESC, id DESC');
    return rows.map(mapDoubtRow);
  },

  async findById(id) {
    const pool = getDbPool();
    const [rows] = await pool.query('SELECT * FROM doubts WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return null;
    return mapDoubtRow(rows[0]);
  },

  async create(payload) {
    const pool = getDbPool();
    const [result] = await pool.query(
      `INSERT INTO doubts (requester_name, title, description, category, status)
       VALUES (?, ?, ?, ?, 'open')`,
      [payload.requesterName, payload.title, payload.description, payload.category]
    );

    const [rows] = await pool.query('SELECT * FROM doubts WHERE id = ?', [result.insertId]);
    return mapDoubtRow(rows[0]);
  },

  async deleteById(id) {
    const pool = getDbPool();
    const [result] = await pool.query('DELETE FROM doubts WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};
