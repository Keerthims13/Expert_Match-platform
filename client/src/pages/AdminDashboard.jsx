import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../services/httpClient.js';
import '../styles/admin.css';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentExperts, setRecentExperts] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        console.log('Checking admin auth...');
        await apiFetch('/api/admin/check-auth', {}, 'Admin authentication required');
        console.log('Auth check passed');

        console.log('Loading dashboard data...');
        const [statsResponse, usersResponse, expertsResponse, logsResponse] = await Promise.all([
          apiFetch('/api/admin/dashboard/stats', {}, 'Failed to load stats'),
          apiFetch('/api/admin/users?page=1&limit=5', {}, 'Failed to load users'),
          apiFetch('/api/admin/experts?page=1&limit=5', {}, 'Failed to load experts'),
          apiFetch('/api/admin/activity-logs?page=1&limit=5', {}, 'Failed to load activity logs')
        ]);

        if (!active) return;

        console.log('Stats response:', statsResponse);
        console.log('Users response:', usersResponse);

        setStats(statsResponse);
        setRecentUsers(usersResponse.users || []);
        setRecentExperts(expertsResponse.experts || []);
        setRecentLogs(logsResponse.logs || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
        if (String(err.message || '').toLowerCase().includes('authorization') || String(err.message || '').toLowerCase().includes('authentication')) {
          console.log('Auth failed, redirecting to login');
          navigate('/admin/login');
          return;
        }

        if (active) {
          setError(err.message || 'An error occurred loading the dashboard');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await apiFetch('/api/admin/logout', {
        method: 'POST',
      }, 'Logout failed');
      localStorage.removeItem('adminEmail');
      navigate('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  if (loading) return <div className="admin-page"><p className="muted">Loading dashboard...</p></div>;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>📊 Admin Dashboard</h1>
        <button onClick={handleLogout} className="secondary-btn logout-btn">
          🚪 Logout
        </button>
      </div>

      {error && <p className="error-box">{error}</p>}

      <div className="dashboard-hero">
        <div>
          <p className="dashboard-kicker">Platform overview</p>
          <h2>Manage approvals, sessions, and activity from one place.</h2>
          <p className="dashboard-summary">
            Review pending accounts, monitor expert sessions, and keep the platform healthy.
          </p>
        </div>
        <div className="dashboard-hero-panel">
          <div>
            <span className="dashboard-hero-label">Pending approvals</span>
            <strong>{(stats?.pendingUsers || 0) + (stats?.pendingExperts || 0)}</strong>
          </div>
          <div>
            <span className="dashboard-hero-label">Average rating</span>
            <strong>{stats?.averageRating ? Number(stats.averageRating).toFixed(1) : '0.0'}/5</strong>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card users">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <p className="stat-label">Approved Users</p>
            <p className="stat-value">{stats?.totalUsers || 0}</p>
            <p className="stat-subtext">{stats?.pendingUsers || 0} pending</p>
          </div>
          <Link to="/admin/users" className="stat-link">Manage →</Link>
        </div>

        <div className="stat-card experts">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <p className="stat-label">Approved Experts</p>
            <p className="stat-value">{stats?.totalExperts || 0}</p>
            <p className="stat-subtext">{stats?.pendingExperts || 0} pending</p>
          </div>
          <Link to="/admin/experts" className="stat-link">Manage →</Link>
        </div>

        <div className="stat-card sessions">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <p className="stat-label">Total Sessions</p>
            <p className="stat-value">{stats?.totalSessions || 0}</p>
            <p className="stat-subtext">avg rating: {Number(stats?.averageRating || 0).toFixed(1)}/5</p>
          </div>
          <Link to="/admin/activity" className="stat-link">Monitor →</Link>
        </div>

        <div className="stat-card doubts">
          <div className="stat-icon">❓</div>
          <div className="stat-content">
            <p className="stat-label">Total Doubts</p>
            <p className="stat-value">{stats?.totalDoubts || 0}</p>
            <p className="stat-subtext">requiring expert help</p>
          </div>
          <Link to="/admin/activity" className="stat-link">View →</Link>
        </div>

        <div className="stat-card disabled">
          <div className="stat-icon">🚫</div>
          <div className="stat-content">
            <p className="stat-label">Disabled Accounts</p>
            <p className="stat-value">{stats?.disabledAccounts || 0}</p>
            <p className="stat-subtext">inactive users</p>
          </div>
          <Link to="/admin/users?status=disabled" className="stat-link">Review →</Link>
        </div>

        <div className="stat-card activity">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <p className="stat-label">Admin Activity</p>
            <p className="stat-value">Logs</p>
            <p className="stat-subtext">all admin actions</p>
          </div>
          <Link to="/admin/logs" className="stat-link">View →</Link>
        </div>
      </div>

      <div className="admin-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <Link to="/admin/users?status=pending" className="action-btn">
            ✅ Approve Pending Users
          </Link>
          <Link to="/admin/experts?status=pending" className="action-btn">
            ✅ Approve Pending Experts
          </Link>
          <Link to="/admin/reports" className="action-btn">
            🚨 Review User Reports
          </Link>
          <Link to="/admin/activity" className="action-btn">
            📊 Monitor Activity
          </Link>
          <Link to="/admin/logs" className="action-btn">
            📋 View Audit Logs
          </Link>
        </div>
      </div>

      <div className="dashboard-panels">
        <section className="dashboard-panel">
          <div className="panel-header">
            <h3>Recent Users</h3>
            <Link to="/admin/users" className="panel-link">View all</Link>
          </div>
          <div className="panel-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr><td colSpan="3" className="empty-cell">No users found</td></tr>
                ) : recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td><span className={`status-badge ${user.accountStatus}`}>{user.accountStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="panel-header">
            <h3>Recent Experts</h3>
            <Link to="/admin/experts" className="panel-link">View all</Link>
          </div>
          <div className="panel-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Expertise</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {recentExperts.length === 0 ? (
                  <tr><td colSpan="3" className="empty-cell">No experts found</td></tr>
                ) : recentExperts.map((expert) => (
                  <tr key={expert.id}>
                    <td>{expert.fullName}</td>
                    <td>{expert.expertise || 'N/A'}</td>
                    <td>{expert.averageRating ? Number(expert.averageRating).toFixed(1) : '0.0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dashboard-panel dashboard-panel-wide">
          <div className="panel-header">
            <h3>Recent Activity</h3>
            <Link to="/admin/logs" className="panel-link">View logs</Link>
          </div>
          <div className="panel-table">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Admin</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.length === 0 ? (
                  <tr><td colSpan="4" className="empty-cell">No activity yet</td></tr>
                ) : recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.action}</td>
                    <td>{log.entityType} #{log.entityId}</td>
                    <td>{log.fullName || 'System'}</td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;
