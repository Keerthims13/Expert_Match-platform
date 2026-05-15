import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../services/httpClient.js';
import '../styles/admin.css';

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [status, setStatus] = useState(searchParams.get('status') || 'approved');
  const [actionLoading, setActionLoading] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, [page, status]);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await apiFetch(
        `/api/admin/users?page=${page}&limit=20&status=${status}`,
        {},
        'Failed to load users'
      );
      setUsers(data.users);
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('unauthorized')) {
        navigate('/admin/login');
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveUser(userId) {
    setActionLoading((prev) => ({ ...prev, [userId]: 'approving' }));
    try {
      await apiFetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
      }, 'Failed to approve user');

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, accountStatus: 'approved' } : u))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: null }));
    }
  }

  async function disableUser(userId) {
    const reason = prompt('Enter reason for disabling account:');
    if (!reason) return;

    setActionLoading((prev) => ({ ...prev, [userId]: 'disabling' }));
    try {
      await apiFetch(`/api/admin/users/${userId}/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      }, 'Failed to disable user');

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, accountStatus: 'disabled' } : u))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: null }));
    }
  }

  if (loading) return <div className="admin-page"><p className="muted">Loading users...</p></div>;

  return (
    <div className="admin-page">
      <h2>👥 User Management</h2>

      <div className="filter-bar">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="filter-select"
        >
          <option value="pending">⏳ Pending Approval</option>
          <option value="approved">✅ Approved</option>
          <option value="disabled">🚫 Disabled</option>
        </select>
      </div>

      {error && <p className="error-box">{error}</p>}

      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Full Name</th>
              <th>Status</th>
              <th>Doubts</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                  <p className="muted">No users found</p>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.fullName}</td>
                  <td>
                    <span className={`status-badge ${user.accountStatus}`}>
                      {user.accountStatus === 'pending' && '⏳ Pending'}
                      {user.accountStatus === 'approved' && '✅ Approved'}
                      {user.accountStatus === 'disabled' && '🚫 Disabled'}
                    </span>
                  </td>
                  <td>{user.doubtCount}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      {user.accountStatus === 'pending' && (
                        <button
                          onClick={() => approveUser(user.id)}
                          className="btn-approve"
                          disabled={actionLoading[user.id]}
                        >
                          {actionLoading[user.id] === 'approving' ? '⏳' : '✅'} Approve
                        </button>
                      )}
                      {user.accountStatus !== 'disabled' && (
                        <button
                          onClick={() => disableUser(user.id)}
                          className="btn-disable"
                          disabled={actionLoading[user.id]}
                        >
                          {actionLoading[user.id] === 'disabling' ? '⏳' : '🚫'} Disable
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="secondary-btn"
        >
          ← Previous
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="secondary-btn"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default AdminUsersPage;
