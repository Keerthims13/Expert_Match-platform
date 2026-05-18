import { getDbPool } from '../config/db.js';
import bcrypt from 'bcryptjs';
import notificationService from '../services/notificationService.js';

const SUPPORT_CONTACT = process.env.SUPPORT_CONTACT || 'support@example.com';

function disconnectUserSockets(io, userId) {
  try {
    if (!io || !userId) return;
    const room = `user:${userId}`;
    const roomSockets = io.sockets.adapter.rooms.get(room);
    if (!roomSockets) return;
    for (const socketId of roomSockets) {
      const sock = io.sockets.sockets.get(socketId);
      if (sock) {
        try { sock.disconnect(true); } catch (_e) { /* ignore */ }
      }
    }
  } catch (_e) {
    // best effort
  }
}

// Admin Login
export async function adminLogin(req, res) {
  try {
    const pool = getDbPool();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [admins] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);

    if (admins.length === 0 || !admins[0].isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin = admins[0];
    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Store admin ID in session
    req.session.adminId = admin.id;
    req.session.adminEmail = admin.email;
    req.session.isAdmin = true;

    res.json({
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: error.message });
  }
}

// Admin Logout
export async function adminLogout(req, res) {
  try {
    req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
      res.json({ message: 'Logged out successfully' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: error.message });
  }
}

// Get Dashboard Stats
export async function getDashboardStats(req, res) {
  try {
    const pool = getDbPool();
    const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE accountStatus = "approved"');
    const [totalExperts] = await pool.query('SELECT COUNT(*) as count FROM experts WHERE accountStatus = "approved"');
    const [pendingUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE accountStatus = "pending"');
    const [pendingExperts] = await pool.query('SELECT COUNT(*) as count FROM experts WHERE accountStatus = "pending"');
    const [totalSessions] = await pool.query('SELECT COUNT(*) as count FROM sessions');
    const [totalDoubts] = await pool.query('SELECT COUNT(*) as count FROM doubts');
    const [avgRating] = await pool.query('SELECT AVG(rating) as avg FROM session_ratings');
    const [disabledUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE accountStatus = "disabled"');

    res.json({
      totalUsers: totalUsers[0].count,
      totalExperts: totalExperts[0].count,
      pendingUsers: pendingUsers[0].count,
      pendingExperts: pendingExperts[0].count,
      totalSessions: totalSessions[0].count,
      totalDoubts: totalDoubts[0].count,
      averageRating: avgRating[0].avg || 0,
      disabledAccounts: disabledUsers[0].count
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: error.message });
  }
}

// Get All Users
export async function getAllUsers(req, res) {
  try {
    const pool = getDbPool();
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const filters = [];
    const params = [];

    if (status) {
      filters.push('u.accountStatus = ?');
      params.push(status);
    }

    const whereClause = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';

    const query = `
      SELECT
        u.id,
        u.email,
        u.full_name AS fullName,
        u.role,
        u.profile_image_url AS avatar,
        u.accountStatus,
        u.created_at AS createdAt,
        u.approvedAt,
        COUNT(DISTINCT d.id) AS doubtCount
      FROM users u
      LEFT JOIN doubts d ON d.requester_user_id = u.id
      ${whereClause}
      GROUP BY u.id, u.email, u.full_name, u.role, u.profile_image_url, u.accountStatus, u.created_at, u.approvedAt
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), parseInt(offset));

    const [users] = await pool.query(query, params);

    const [totalCount] = await pool.query(
      `SELECT COUNT(*) as count FROM users u${whereClause}`,
      status ? [status] : []
    );

    res.json({
      users,
      total: totalCount[0].count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: error.message });
  }
}

// Get All Experts
export async function getAllExperts(req, res) {
  try {
    const pool = getDbPool();
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const filters = [];
    const params = [];

    if (status) {
      filters.push('e.accountStatus = ?');
      params.push(status);
    }

    const whereClause = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';

    const query = `
      SELECT
        e.id,
        e.user_id AS userId,
        u.email,
        e.full_name AS fullName,
        e.title,
        e.category AS expertise,
        e.price_per_minute AS pricePerMinute,
        e.rating,
        e.review_count AS ratingCount,
        e.consultations AS sessionCount,
        e.accountStatus,
        e.created_at AS createdAt,
        e.approvedAt,
        COALESCE(ROUND(AVG(sr.rating), 1), e.rating) AS averageRating
      FROM experts e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN sessions s ON e.id = s.expert_id
      LEFT JOIN session_ratings sr ON s.id = sr.session_id
      ${whereClause}
      GROUP BY e.id, e.user_id, u.email, e.full_name, e.title, e.category, e.price_per_minute, e.rating, e.review_count, e.consultations, e.accountStatus, e.created_at, e.approvedAt
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), parseInt(offset));

    const [experts] = await pool.query(query, params);

    const [totalCount] = await pool.query(
      `SELECT COUNT(*) as count FROM experts e${whereClause}`,
      status ? [status] : []
    );

    res.json({
      experts,
      total: totalCount[0].count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get experts error:', error);
    res.status(500).json({ message: error.message });
  }
}

// Approve User Account
export async function approveUser(req, res) {
  try {
    const pool = getDbPool();
    const { userId } = req.params;
    const adminId = req.session.adminId;

    await pool.query(
      'UPDATE users SET accountStatus = ?, approvedBy = ?, approvedAt = NOW() WHERE id = ?',
      ['approved', adminId, userId]
    );

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (adminId, action, entityType, entityId) VALUES (?, ?, ?, ?)',
      [adminId, 'APPROVE_USER', 'user', userId]
    );

    res.json({ message: 'User approved successfully' });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ message: error.message });
  }
}

// Disable User Account
export async function disableUser(req, res) {
  try {
    const pool = getDbPool();
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.session.adminId;

    await pool.query(
      'UPDATE users SET accountStatus = ?, accountDisabledReason = ?, approvedBy = ?, approvedAt = NOW() WHERE id = ?',
      ['disabled', reason || 'Account disabled by admin', adminId, userId]
    );

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (adminId, action, entityType, entityId, details) VALUES (?, ?, ?, ?, ?)',
      [adminId, 'DISABLE_USER', 'user', userId, JSON.stringify({ reason })]
    );

    // Notify the user and disconnect realtime sockets
    try {
      const io = req.app.get('io');
      await notificationService.createNotification(
        Number(userId),
        'account_disabled',
        'Account disabled',
        `Your account has been disabled by an administrator. Contact ${SUPPORT_CONTACT} to appeal.`,
        {}
      );
      disconnectUserSockets(io, Number(userId));
    } catch (_err) {
      // best-effort
    }

    res.json({ message: 'User account disabled' });
  } catch (error) {
    console.error('Disable user error:', error);
    res.status(500).json({ message: error.message });
  }
}

// Approve Expert Account
export async function approveExpert(req, res) {
  try {
    const pool = getDbPool();
    const { expertId } = req.params;
    const adminId = req.session.adminId;

    await pool.query(
      'UPDATE experts SET accountStatus = ?, approvedBy = ?, approvedAt = NOW() WHERE id = ?',
      ['approved', adminId, expertId]
    );

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (adminId, action, entityType, entityId) VALUES (?, ?, ?, ?)',
      [adminId, 'APPROVE_EXPERT', 'expert', expertId]
    );

    res.json({ message: 'Expert approved successfully' });
  } catch (error) {
    console.error('Approve expert error:', error);
    res.status(500).json({ message: error.message });
  }
}

// Disable Expert Account
export async function disableExpert(req, res) {
  try {
    const pool = getDbPool();
    const { expertId } = req.params;
    const { reason } = req.body;
    const adminId = req.session.adminId;

    await pool.query(
      'UPDATE experts SET accountStatus = ?, accountDisabledReason = ?, approvedBy = ?, approvedAt = NOW() WHERE id = ?',
      ['disabled', reason || 'Account disabled by admin', adminId, expertId]
    );

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (adminId, action, entityType, entityId, details) VALUES (?, ?, ?, ?, ?)',
      [adminId, 'DISABLE_EXPERT', 'expert', expertId, JSON.stringify({ reason })]
    );

    // Notify the expert's user account and disconnect realtime sockets
    try {
      const [rows] = await pool.query('SELECT user_id FROM experts WHERE id = ? LIMIT 1', [expertId]);
      const targetUserId = rows?.[0]?.user_id ? Number(rows[0].user_id) : null;
      const io = req.app.get('io');
      if (targetUserId) {
        await notificationService.createNotification(
          targetUserId,
          'account_disabled',
          'Account disabled',
          `Your expert account has been disabled by an administrator. Contact ${SUPPORT_CONTACT} to appeal.`,
          {}
        );
        disconnectUserSockets(io, targetUserId);
      }
    } catch (_err) {
      // best-effort
    }

    res.json({ message: 'Expert account disabled' });
  } catch (error) {
    console.error('Disable expert error:', error);
    res.status(500).json({ message: error.message });
  }
}

// Get Activity Logs
export async function getActivityLogs(req, res) {
  try {
    const pool = getDbPool();
    const { page = 1, limit = 50, action } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.id, a.adminId, a.action, a.entityType, a.entityId, a.details, a.createdAt, admin.fullName
      FROM audit_logs a
      LEFT JOIN admins admin ON a.adminId = admin.id
    `;
    const params = [];

    if (action) {
      query += ' WHERE a.action = ?';
      params.push(action);
    }

    query += ' ORDER BY a.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await pool.query(query, params);

    const [totalCount] = await pool.query(
      'SELECT COUNT(*) as count FROM audit_logs' + (action ? ' WHERE action = ?' : ''),
      action ? [action] : []
    );

    res.json({
      logs,
      total: totalCount[0].count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ message: error.message });
  }
}

// Get Sessions and Doubts Monitoring
export async function getSessionsMonitoring(req, res) {
  try {
    const pool = getDbPool();
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const filters = [];
    const params = [];

    if (status) {
      filters.push('s.status = ?');
      params.push(status);
    }

    const whereClause = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';

    const query = `
      SELECT
        s.id,
        s.status,
        d.title AS doubtTitle,
        d.description AS doubtDescription,
        u.full_name AS studentName,
        e.full_name AS expertName,
        sr.rating,
        s.created_at AS createdAt,
        s.started_at AS startedAt,
        s.ended_at AS endedAt,
        TIMEDIFF(s.ended_at, s.started_at) AS duration
      FROM sessions s
      JOIN doubts d ON s.doubt_id = d.id
      LEFT JOIN users u ON d.requester_user_id = u.id
      JOIN experts e ON s.expert_id = e.id
      LEFT JOIN session_ratings sr ON s.id = sr.session_id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), parseInt(offset));

    const [sessions] = await pool.query(query, params);

    res.json({ sessions, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get sessions monitoring error:', error);
    res.status(500).json({ message: error.message });
  }
}

// Check Admin Auth
export async function checkAdminAuth(req, res) {
  if (req.session.isAdmin) {
    res.json({
      isAuthenticated: true,
      adminId: req.session.adminId,
      email: req.session.adminEmail
    });
  } else {
    res.status(401).json({ isAuthenticated: false });
  }
}
