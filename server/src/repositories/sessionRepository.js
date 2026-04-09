import { getDbPool } from '../config/db.js';

function mapSessionRow(row) {
  return {
    id: row.id,
    doubtId: row.doubt_id,
    expertId: row.expert_id,
    status: row.status,
    requestMessage: row.request_message || null,
    requestedAt: row.requested_at || null,
    acceptedAt: row.accepted_at || null,
    declinedAt: row.declined_at || null,
    declineReason: row.decline_reason || null,
    endedByRole: row.ended_by_role || null,
    endedByName: row.ended_by_name || null,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    doubt: {
      id: row.doubt_id,
      title: row.doubt_title,
      requesterName: row.requester_name,
      requesterUserId: row.requester_user_id || null
    },
    expert: {
      id: row.expert_id,
      userId: row.expert_user_id || null,
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
    messageStatus: row.message_status || 'sent',
    deliveredAt: row.delivered_at || null,
    seenAt: row.seen_at || null,
    createdAt: row.created_at,
    createdAtLabel: new Date(row.created_at).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  };
}

function isMissingParticipantsTable(error) {
  return error?.code === 'ER_NO_SUCH_TABLE' && String(error?.sqlMessage || '').includes('session_participants');
}

function isMissingMessageStatusColumns(error) {
  if (error?.code !== 'ER_BAD_FIELD_ERROR') return false;
  const message = String(error?.sqlMessage || '');
  return (
    message.includes('message_status') ||
    message.includes('delivered_at') ||
    message.includes('seen_at')
  );
}

function isMissingSessionWorkflowColumns(error) {
  if (error?.code !== 'ER_BAD_FIELD_ERROR') return false;
  const message = String(error?.sqlMessage || '');
  return (
    message.includes('request_message')
    || message.includes('requested_at')
    || message.includes('accepted_at')
    || message.includes('declined_at')
    || message.includes('decline_reason')
    || message.includes('ended_by_role')
    || message.includes('ended_by_name')
  );
}

function isMissingSessionRatingsTable(error) {
  return error?.code === 'ER_NO_SUCH_TABLE' && String(error?.sqlMessage || '').includes('session_ratings');
}

export const sessionRepository = {
  async findAllSessions() {
    const pool = getDbPool();
    const [rows] = await pool.query(
      `
        SELECT s.*, d.title AS doubt_title, d.requester_name, d.requester_user_id, e.user_id AS expert_user_id, e.full_name AS expert_name, e.title AS expert_title
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
        SELECT s.*, d.title AS doubt_title, d.requester_name, d.requester_user_id, e.user_id AS expert_user_id, e.full_name AS expert_name, e.title AS expert_title
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
    let result;
    try {
      [result] = await pool.query(
        `
          INSERT INTO sessions (doubt_id, expert_id, status, request_message, requested_at)
          VALUES (?, ?, 'requested', ?, CURRENT_TIMESTAMP)
        `,
        [payload.doubtId, payload.expertId, payload.requestMessage || 'Student requested to start a chat session.']
      );
    } catch (error) {
      if (!isMissingSessionWorkflowColumns(error)) throw error;
      [result] = await pool.query(
        `
          INSERT INTO sessions (doubt_id, expert_id, status, started_at)
          VALUES (?, ?, 'requested', NULL)
        `,
        [payload.doubtId, payload.expertId]
      );
    }

    return this.findSessionById(result.insertId);
  },

  async markSessionRequested(id, requestMessage) {
    const pool = getDbPool();
    let result;
    try {
      [result] = await pool.query(
        `
          UPDATE sessions
          SET status = 'requested',
              request_message = ?,
              requested_at = CURRENT_TIMESTAMP,
              accepted_at = NULL,
              declined_at = NULL,
              decline_reason = NULL,
              started_at = NULL,
              ended_at = NULL,
              ended_by_role = NULL,
              ended_by_name = NULL
          WHERE id = ?
        `,
        [requestMessage || 'Student requested to start a chat session.', id]
      );
    } catch (error) {
      if (!isMissingSessionWorkflowColumns(error)) throw error;
      [result] = await pool.query(
        `
          UPDATE sessions
          SET status = 'requested',
              started_at = NULL,
              ended_at = NULL
          WHERE id = ?
        `,
        [id]
      );
    }

    if (!result.affectedRows) return null;
    return this.findSessionById(id);
  },

  async updateSessionStatus(id, status, options = {}) {
    const pool = getDbPool();
    const normalized = String(status || '').trim().toLowerCase();
    let setSql = 'status = ?';
    const values = [normalized];

    if (normalized === 'active') {
      const startedAt = options.startedAt ? new Date(options.startedAt) : new Date();
      setSql += `,
        accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP),
        declined_at = NULL,
        decline_reason = NULL,
        ended_at = NULL,
        ended_by_role = NULL,
        ended_by_name = NULL,
        started_at = COALESCE(started_at, ?)`;
      values.push(startedAt);
    }

    if (normalized === 'accepted_pending') {
      setSql += `,
        accepted_at = CURRENT_TIMESTAMP,
        declined_at = NULL,
        decline_reason = NULL,
        ended_at = NULL,
        ended_by_role = NULL,
        ended_by_name = NULL,
        started_at = NULL`;
    }

    if (normalized === 'declined') {
      setSql += `,
        declined_at = CURRENT_TIMESTAMP,
        accepted_at = NULL,
        started_at = NULL,
        ended_at = NULL,
        decline_reason = ?`;
      values.push(options.declineReason || 'The expert is currently unavailable for chat. Please choose another expert or try again later.');
    }

    if (normalized === 'completed' || normalized === 'cancelled') {
      setSql += ', ended_at = CURRENT_TIMESTAMP, ended_by_role = ?, ended_by_name = ?';
      values.push(options.endedByRole || null, options.endedByName || null);
    }

    let result;
    try {
      [result] = await pool.query(
        `UPDATE sessions SET ${setSql} WHERE id = ?`,
        [...values, id]
      );
    } catch (error) {
      if (!isMissingSessionWorkflowColumns(error)) throw error;

      if (normalized === 'active') {
        [result] = await pool.query(
          `
            UPDATE sessions
            SET status = 'active',
                started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
                ended_at = NULL
            WHERE id = ?
          `,
          [id]
        );
      } else if (normalized === 'declined') {
        [result] = await pool.query(
          `
            UPDATE sessions
            SET status = 'declined',
                started_at = NULL,
                ended_at = NULL
            WHERE id = ?
          `,
          [id]
        );
      } else {
        [result] = await pool.query(
          `
            UPDATE sessions
            SET status = ?,
                ended_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [normalized, id]
        );
      }
    }

    if (!result.affectedRows) return null;
    return this.findSessionById(id);
  },

  async scheduleSessionStart(id) {
    return this.updateSessionStatus(id, 'active', { startedAt: new Date() });
  },

  async createMessage(payload) {
    const pool = getDbPool();
    let result;
    try {
      [result] = await pool.query(
        `
          INSERT INTO session_messages (session_id, sender_role, sender_name, message, message_status)
          VALUES (?, ?, ?, ?, 'sent')
        `,
        [payload.sessionId, payload.senderRole, payload.senderName, payload.message]
      );
    } catch (error) {
      if (!isMissingMessageStatusColumns(error)) throw error;
      [result] = await pool.query(
        `
          INSERT INTO session_messages (session_id, sender_role, sender_name, message)
          VALUES (?, ?, ?, ?)
        `,
        [payload.sessionId, payload.senderRole, payload.senderName, payload.message]
      );
    }

    const [rows] = await pool.query('SELECT * FROM session_messages WHERE id = ?', [result.insertId]);
    return mapMessageRow(rows[0]);
  },

  async markMessageDelivered(messageId) {
    const pool = getDbPool();
    try {
      const [result] = await pool.query(
        `
          UPDATE session_messages
          SET message_status = 'delivered',
              delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP)
          WHERE id = ? AND message_status = 'sent'
        `,
        [messageId]
      );

      if (!result.affectedRows) return null;
      const [rows] = await pool.query('SELECT * FROM session_messages WHERE id = ? LIMIT 1', [messageId]);
      if (!rows.length) return null;
      return mapMessageRow(rows[0]);
    } catch (error) {
      if (!isMissingMessageStatusColumns(error)) throw error;
      return null;
    }
  },

  async markMessagesSeenForParticipant(sessionId, senderRole, senderName) {
    const pool = getDbPool();
    try {
      const [rows] = await pool.query(
        `
          SELECT id
          FROM session_messages
          WHERE session_id = ?
            AND (sender_role <> ? OR sender_name <> ?)
            AND message_status <> 'seen'
          ORDER BY id ASC
        `,
        [sessionId, senderRole, senderName]
      );

      if (!rows.length) return [];
      const ids = rows.map((row) => row.id);
      const placeholders = ids.map(() => '?').join(', ');

      await pool.query(
        `
          UPDATE session_messages
          SET message_status = 'seen',
              delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP),
              seen_at = CURRENT_TIMESTAMP
          WHERE id IN (${placeholders})
        `,
        ids
      );

      return ids;
    } catch (error) {
      if (!isMissingMessageStatusColumns(error)) throw error;
      return [];
    }
  },

  async markAllPendingMessagesSeenInSession(sessionId) {
    const pool = getDbPool();
    try {
      const [rows] = await pool.query(
        `
          SELECT id
          FROM session_messages
          WHERE session_id = ?
            AND message_status <> 'seen'
          ORDER BY id ASC
        `,
        [sessionId]
      );

      if (!rows.length) return [];
      const ids = rows.map((row) => row.id);
      const placeholders = ids.map(() => '?').join(', ');

      await pool.query(
        `
          UPDATE session_messages
          SET message_status = 'seen',
              delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP),
              seen_at = CURRENT_TIMESTAMP
          WHERE id IN (${placeholders})
        `,
        ids
      );

      return ids;
    } catch (error) {
      if (!isMissingMessageStatusColumns(error)) throw error;
      return [];
    }
  },

  async upsertParticipant(sessionId, senderRole, senderName) {
    const pool = getDbPool();
    try {
      await pool.query(
        `
          INSERT INTO session_participants (session_id, sender_role, sender_name, last_read_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE last_read_at = CURRENT_TIMESTAMP
        `,
        [sessionId, senderRole, senderName]
      );
    } catch (error) {
      if (!isMissingParticipantsTable(error)) throw error;
    }
  },

  async markSessionReadForParticipant(sessionId, senderRole, senderName) {
    const pool = getDbPool();
    try {
      await pool.query(
        `
          INSERT INTO session_participants (session_id, sender_role, sender_name, last_read_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE last_read_at = CURRENT_TIMESTAMP
        `,
        [sessionId, senderRole, senderName]
      );
    } catch (error) {
      if (!isMissingParticipantsTable(error)) throw error;
    }
  },

  async findUnreadCountsByParticipant(senderRole, senderName) {
    const pool = getDbPool();
    let rows;
    try {
      [rows] = await pool.query(
        `
          SELECT
            s.id AS session_id,
            COUNT(m.id) AS unread_count
          FROM sessions s
          LEFT JOIN session_participants sp
            ON sp.session_id = s.id
           AND sp.sender_role = ?
           AND sp.sender_name = ?
          LEFT JOIN session_messages m
            ON m.session_id = s.id
           AND (
             m.sender_role <> ?
             OR m.sender_name <> ?
           )
           AND m.created_at > COALESCE(sp.last_read_at, '1970-01-01 00:00:00')
          GROUP BY s.id
        `,
        [senderRole, senderName, senderRole, senderName]
      );
    } catch (error) {
      if (!isMissingParticipantsTable(error)) throw error;
      return [];
    }

    return rows.map((row) => ({
      sessionId: row.session_id,
      unreadCount: Number(row.unread_count) || 0
    }));
  },

  async findMessagesBySessionId(sessionId) {
    const pool = getDbPool();
    const [rows] = await pool.query(
      'SELECT * FROM session_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC',
      [sessionId]
    );

    return rows.map(mapMessageRow);
  },

  async findSessionRating(sessionId) {
    const pool = getDbPool();
    try {
      const [rows] = await pool.query(
        `
          SELECT id, session_id, expert_id, student_user_id, rating, review_text, created_at, updated_at
          FROM session_ratings
          WHERE session_id = ?
          LIMIT 1
        `,
        [sessionId]
      );

      if (!rows.length) return null;
      const row = rows[0];
      return {
        id: row.id,
        sessionId: row.session_id,
        expertId: row.expert_id,
        studentUserId: row.student_user_id,
        rating: Number(row.rating),
        reviewText: row.review_text || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      if (!isMissingSessionRatingsTable(error)) throw error;
      return null;
    }
  },

  async upsertSessionRating(payload) {
    const pool = getDbPool();
    try {
      await pool.query(
        `
          INSERT INTO session_ratings (session_id, expert_id, student_user_id, rating, review_text)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            rating = VALUES(rating),
            review_text = VALUES(review_text),
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          payload.sessionId,
          payload.expertId,
          payload.studentUserId,
          payload.rating,
          payload.reviewText || null
        ]
      );

      return this.findSessionRating(payload.sessionId);
    } catch (error) {
      if (!isMissingSessionRatingsTable(error)) throw error;
      const notReadyError = new Error('Rating feature is not ready. Please run latest SQL migration and try again.');
      notReadyError.status = 500;
      throw notReadyError;
    }
  },

  async findLatestByDoubtIds(doubtIds = []) {
    const numericIds = [...new Set(doubtIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    if (!numericIds.length) return [];

    const pool = getDbPool();
    const placeholders = numericIds.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `
        SELECT s.*
        FROM sessions s
        INNER JOIN (
          SELECT doubt_id, MAX(id) AS latest_id
          FROM sessions
          WHERE doubt_id IN (${placeholders})
          GROUP BY doubt_id
        ) latest
          ON latest.latest_id = s.id
      `,
      numericIds
    );

    return rows;
  }
};
