import { getDbPool } from '../config/db.js';

function mapDoubtRow(row) {
  return {
    id: row.id,
    requesterUserId: row.requester_user_id || null,
    requesterName: row.requester_name,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    assignedExpertId: row.assigned_expert_id || null,
    assignedAt: row.assigned_at || null,
    assignedExpert:
      row.assigned_expert_id && row.assigned_expert_name
        ? {
            id: row.assigned_expert_id,
            fullName: row.assigned_expert_name,
            title: row.assigned_expert_title || ''
          }
        : null,
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
    const [rows] = await pool.query(
      `
        SELECT d.*, e.id AS assigned_expert_id, e.full_name AS assigned_expert_name, e.title AS assigned_expert_title
        FROM doubts d
        LEFT JOIN experts e ON e.id = d.assigned_expert_id
        ORDER BY d.created_at DESC, d.id DESC
      `
    );
    return rows.map(mapDoubtRow);
  },

  async findById(id) {
    const pool = getDbPool();
    const [rows] = await pool.query(
      `
        SELECT d.*, e.id AS assigned_expert_id, e.full_name AS assigned_expert_name, e.title AS assigned_expert_title
        FROM doubts d
        LEFT JOIN experts e ON e.id = d.assigned_expert_id
        WHERE d.id = ?
        LIMIT 1
      `,
      [id]
    );
    if (!rows.length) return null;
    return mapDoubtRow(rows[0]);
  },

  async create(payload) {
    const pool = getDbPool();
    const [result] = await pool.query(
      `INSERT INTO doubts (requester_user_id, requester_name, title, description, category, status)
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [payload.requesterUserId || null, payload.requesterName, payload.title, payload.description, payload.category]
    );

    const [rows] = await pool.query('SELECT * FROM doubts WHERE id = ?', [result.insertId]);
    return mapDoubtRow(rows[0]);
  },

  async deleteById(id) {
    const pool = getDbPool();
    const [result] = await pool.query('DELETE FROM doubts WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async assignExpert(doubtId, expertId) {
    const pool = getDbPool();
    const [result] = await pool.query(
      `
        UPDATE doubts
        SET assigned_expert_id = ?, assigned_at = CURRENT_TIMESTAMP, status = 'matched'
        WHERE id = ?
      `,
      [expertId, doubtId]
    );

    if (!result.affectedRows) {
      return null;
    }

    return this.findById(doubtId);
  },

  async claimOwnershipIfMissing(doubtId, requesterUserId, requesterName) {
    const pool = getDbPool();
    const [result] = await pool.query(
      `
        UPDATE doubts
        SET requester_user_id = ?
        WHERE id = ?
          AND requester_user_id IS NULL
          AND LOWER(TRIM(requester_name)) = LOWER(TRIM(?))
      `,
      [Number(requesterUserId), Number(doubtId), String(requesterName || '')]
    );

    if (!result.affectedRows) return this.findById(doubtId);
    return this.findById(doubtId);
  }
};
