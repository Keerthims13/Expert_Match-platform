import { getDbPool } from '../config/db.js';

function mapSessionRow(row) {
  return {
    id: row.id,
    doubtId: row.doubt_id,
    expertId: row.expert_id,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    doubt: {
      id: row.doubt_id,
      title: row.doubt_title,
      requesterName: row.requester_name
    },
    expert: {
      id: row.expert_id,
      fullName: row.expert_name,
      title: row.expert_title
    }
  };
}

function mapMessageRow(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    message: row.message,
    createdAt: row.created_at,
    createdAtLabel: new Date(row.created_at).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  };
}

export const sessionRepository = {
  async findAllSessions() {
    const pool = getDbPool();
    const [rows] = await pool.query(
      `
        SELECT s.*, d.title AS doubt_title, d.requester_name, e.full_name AS expert_name, e.title AS expert_title
        FROM sessions s
        JOIN doubts d ON d.id = s.doubt_id
        JOIN experts e ON e.id = s.expert_id
        ORDER BY s.created_at DESC, s.id DESC
      `
    );

    return rows.map(mapSessionRow);
  },

  async findSessionById(id) {
    const pool = getDbPool();
    const [rows] = await pool.query(
      `
        SELECT s.*, d.title AS doubt_title, d.requester_name, e.full_name AS expert_name, e.title AS expert_title
        FROM sessions s
        JOIN doubts d ON d.id = s.doubt_id
        JOIN experts e ON e.id = s.expert_id
        WHERE s.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!rows.length) return null;
    return mapSessionRow(rows[0]);
  },

  async findSessionByDoubtId(doubtId) {
    const pool = getDbPool();
    const [rows] = await pool.query('SELECT id FROM sessions WHERE doubt_id = ? LIMIT 1', [doubtId]);
    if (!rows.length) return null;
    return this.findSessionById(rows[0].id);
  },

  async createSession(payload) {
    const pool = getDbPool();
    const [result] = await pool.query(
      `
        INSERT INTO sessions (doubt_id, expert_id, status, started_at)
        VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
      `,
      [payload.doubtId, payload.expertId]
    );

    return this.findSessionById(result.insertId);
  },

  async updateSessionStatus(id, status) {
    const pool = getDbPool();
    const endedAtSql = status === 'completed' ? ', ended_at = CURRENT_TIMESTAMP' : '';

    const [result] = await pool.query(
      `UPDATE sessions SET status = ?${endedAtSql} WHERE id = ?`,
      [status, id]
    );

    if (!result.affectedRows) return null;
    return this.findSessionById(id);
  },

  async createMessage(payload) {
    const pool = getDbPool();
    const [result] = await pool.query(
      `
        INSERT INTO session_messages (session_id, sender_role, sender_name, message)
        VALUES (?, ?, ?, ?)
      `,
      [payload.sessionId, payload.senderRole, payload.senderName, payload.message]
    );

    const [rows] = await pool.query('SELECT * FROM session_messages WHERE id = ?', [result.insertId]);
    return mapMessageRow(rows[0]);
  },

  async findMessagesBySessionId(sessionId) {
    const pool = getDbPool();
    const [rows] = await pool.query(
      'SELECT * FROM session_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC',
      [sessionId]
    );

    return rows.map(mapMessageRow);
  }
};
