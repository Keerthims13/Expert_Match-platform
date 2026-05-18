import { getDbPool } from '../config/db.js';
import notificationService from '../services/notificationService.js';

const SUPPORT_CONTACT = process.env.SUPPORT_CONTACT || 'support@example.com';

function asPositiveInt(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

export async function createReport(req, res) {
  try {
    const pool = getDbPool();
    const reporterUserId = req.user?.id;
    const {
      reportedUserId,
      reportedExpertId,
      sessionId,
      category = 'Unprofessional Behavior',
      reason = ''
    } = req.body || {};

    const normalizedReason = String(reason || '').trim();
    if (!normalizedReason || normalizedReason.length < 10) {
      return res.status(400).json({ message: 'Please provide at least 10 characters for the report reason' });
    }

    const targetUserId = asPositiveInt(reportedUserId);
    const targetExpertId = asPositiveInt(reportedExpertId);
    const targetSessionId = asPositiveInt(sessionId);

    if (!targetUserId && !targetExpertId) {
      return res.status(400).json({ message: 'A reported user or expert is required' });
    }

    const [result] = await pool.query(
      `
        INSERT INTO user_reports (
          reporter_user_id,
          reported_user_id,
          reported_expert_id,
          session_id,
          category,
          reason,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `,
      [
        reporterUserId,
        targetUserId,
        targetExpertId,
        targetSessionId,
        String(category || 'Unprofessional Behavior').trim().toLowerCase(),
        normalizedReason
      ]
    );

    res.status(201).json({
      message: 'Report submitted successfully',
      data: {
        id: result.insertId,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ message: error.message });
  }
}

export async function getAdminReports(req, res) {
  try {
    const pool = getDbPool();
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Number(limit) || 20);
    const offset = (pageNumber - 1) * pageSize;

    const where = [];
    const params = [];

    if (status) {
      where.push('r.status = ?');
      params.push(String(status));
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `
        SELECT
          r.id,
          r.reporter_user_id AS reporterUserId,
          r.reported_user_id AS reportedUserId,
          r.reported_expert_id AS reportedExpertId,
          r.session_id AS sessionId,
          r.category,
          r.reason,
          r.status,
          r.admin_action AS adminAction,
          r.admin_notes AS adminNotes,
          r.resolved_by AS resolvedBy,
          r.resolved_at AS resolvedAt,
          r.created_at AS createdAt,
          reporter.full_name AS reporterName,
          target_user.full_name AS reportedUserName,
          target_expert.full_name AS reportedExpertName,
          target_expert.user_id AS reportedExpertUserId,
          resolver.fullName AS resolvedByName
        FROM user_reports r
        LEFT JOIN users reporter ON reporter.id = r.reporter_user_id
        LEFT JOIN users target_user ON target_user.id = r.reported_user_id
        LEFT JOIN experts target_expert ON target_expert.id = r.reported_expert_id
        LEFT JOIN admins resolver ON resolver.id = r.resolved_by
        ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM user_reports r ${whereClause}`,
      params
    );

    res.json({
      data: rows,
      pagination: {
        total: countRows[0]?.total || 0,
        page: pageNumber,
        limit: pageSize
      }
    });
  } catch (error) {
    console.error('Get admin reports error:', error);
    res.status(500).json({ message: error.message });
  }
}

export async function takeAdminReportAction(req, res) {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    const reportId = asPositiveInt(req.params.reportId);
    const adminId = req.session?.adminId;
    const {
      action,
      notes = '',
      disableReason = 'Account disabled based on moderation report'
    } = req.body || {};

    const normalizedAction = String(action || '').trim().toLowerCase();
    if (!['dismiss', 'disable_user', 'disable_expert'].includes(normalizedAction)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await connection.beginTransaction();

    const [reportRows] = await connection.query(
      'SELECT * FROM user_reports WHERE id = ? LIMIT 1 FOR UPDATE',
      [reportId]
    );

    if (!reportRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Report not found' });
    }

    const report = reportRows[0];
    if (String(report.status || '').toLowerCase() !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ message: 'This report was already handled' });
    }

    const normalizedDisableReason = String(disableReason || '').trim() || 'Account disabled based on moderation report';

    if (normalizedAction === 'disable_user') {
      let targetUserId = asPositiveInt(report.reported_user_id);

      if (!targetUserId && asPositiveInt(report.reported_expert_id)) {
        const [expertRows] = await connection.query(
          'SELECT user_id FROM experts WHERE id = ? LIMIT 1',
          [report.reported_expert_id]
        );
        targetUserId = asPositiveInt(expertRows[0]?.user_id);
      }

      if (!targetUserId) {
        await connection.rollback();
        return res.status(400).json({ message: 'No user target found for this report' });
      }

      await connection.query(
        'UPDATE users SET accountStatus = ?, accountDisabledReason = ?, approvedBy = ?, approvedAt = NOW() WHERE id = ?',
        ['disabled', normalizedDisableReason, adminId, targetUserId]
      );

      await connection.query(
        'INSERT INTO audit_logs (adminId, action, entityType, entityId, details) VALUES (?, ?, ?, ?, ?)',
        [adminId, 'DISABLE_USER_FROM_REPORT', 'user', targetUserId, JSON.stringify({ reportId, reason: normalizedDisableReason })]
      );

      // Notify the user and disconnect realtime sockets
      try {
        const io = req.app.get('io');
        await notificationService.createNotification(
          targetUserId,
          'account_disabled',
          'Account disabled',
          `Your account has been disabled by an administrator following a report. Contact ${SUPPORT_CONTACT} to appeal.`,
          {}
        );
        if (io) {
          const room = `user:${targetUserId}`;
          const roomSockets = io.sockets.adapter.rooms.get(room);
          if (roomSockets) {
            for (const socketId of roomSockets) {
              const sock = io.sockets.sockets.get(socketId);
              if (sock) try { sock.disconnect(true); } catch (_e) {}
            }
          }
        }
      } catch (_e) {
        // best-effort
      }
    }

    if (normalizedAction === 'disable_expert') {
      const targetExpertId = asPositiveInt(report.reported_expert_id);
      if (!targetExpertId) {
        await connection.rollback();
        return res.status(400).json({ message: 'No expert target found for this report' });
      }

      await connection.query(
        'UPDATE experts SET accountStatus = ?, accountDisabledReason = ?, approvedBy = ?, approvedAt = NOW() WHERE id = ?',
        ['disabled', normalizedDisableReason, adminId, targetExpertId]
      );

      await connection.query(
        `
          UPDATE users u
          JOIN experts e ON e.user_id = u.id
          SET u.accountStatus = ?, u.accountDisabledReason = ?, u.approvedBy = ?, u.approvedAt = NOW()
          WHERE e.id = ?
        `,
        ['disabled', normalizedDisableReason, adminId, targetExpertId]
      );

      await connection.query(
        'INSERT INTO audit_logs (adminId, action, entityType, entityId, details) VALUES (?, ?, ?, ?, ?)',
        [adminId, 'DISABLE_EXPERT_FROM_REPORT', 'expert', targetExpertId, JSON.stringify({ reportId, reason: normalizedDisableReason })]
      );

      // Notify expert's user account and disconnect realtime sockets
      try {
        const [expertRows] = await connection.query('SELECT user_id FROM experts WHERE id = ? LIMIT 1', [targetExpertId]);
        const targetUserId2 = expertRows?.[0]?.user_id ? Number(expertRows[0].user_id) : null;
        const io = req.app.get('io');
        if (targetUserId2) {
          await notificationService.createNotification(
            targetUserId2,
            'account_disabled',
            'Account disabled',
            `Your expert account has been disabled by an administrator following a report. Contact ${SUPPORT_CONTACT} to appeal.`,
            {}
          );
          if (io) {
            const room = `user:${targetUserId2}`;
            const roomSockets = io.sockets.adapter.rooms.get(room);
            if (roomSockets) {
              for (const socketId of roomSockets) {
                const sock = io.sockets.sockets.get(socketId);
                if (sock) try { sock.disconnect(true); } catch (_e) {}
              }
            }
          }
        }
      } catch (_e) {
        // best-effort
      }
    }

    const finalStatus = normalizedAction === 'dismiss' ? 'dismissed' : 'action_taken';
    await connection.query(
      `
        UPDATE user_reports
        SET status = ?, admin_action = ?, admin_notes = ?, resolved_by = ?, resolved_at = NOW()
        WHERE id = ?
      `,
      [finalStatus, normalizedAction, String(notes || '').trim() || null, adminId, reportId]
    );

    await connection.commit();
    res.json({ message: 'Report action completed successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Take admin report action error:', error);
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
}
