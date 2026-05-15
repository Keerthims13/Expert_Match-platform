import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../services/httpClient.js';
import '../styles/admin.css';

function AdminExpertsPage() {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [status, setStatus] = useState(searchParams.get('status') || 'approved');
  const [actionLoading, setActionLoading] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadExperts();
  }, [page, status]);

  async function loadExperts() {
    try {
      setLoading(true);
      const data = await apiFetch(
        `/api/admin/experts?page=${page}&limit=20&status=${status}`,
        {},
        'Failed to load experts'
      );
      setExperts(data.experts);
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('unauthorized')) {
        navigate('/admin/login');
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveExpert(expertId) {
    setActionLoading((prev) => ({ ...prev, [expertId]: 'approving' }));
    try {
      await apiFetch(`/api/admin/experts/${expertId}/approve`, {
        method: 'POST',
      }, 'Failed to approve expert');

      setExperts((prev) =>
        prev.map((e) => (e.id === expertId ? { ...e, accountStatus: 'approved' } : e))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [expertId]: null }));
    }
  }

  async function disableExpert(expertId) {
    const reason = prompt('Enter reason for disabling account:');
    if (!reason) return;

    setActionLoading((prev) => ({ ...prev, [expertId]: 'disabling' }));
    try {
      await apiFetch(`/api/admin/experts/${expertId}/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      }, 'Failed to disable expert');

      setExperts((prev) =>
        prev.map((e) => (e.id === expertId ? { ...e, accountStatus: 'disabled' } : e))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [expertId]: null }));
    }
  }

  if (loading) return <div className="admin-page"><p className="muted">Loading experts...</p></div>;

  return (
    <div className="admin-page">
      <h2>⭐ Expert Management</h2>

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
              <th>Name</th>
              <th>Expertise</th>
              <th>Rate/min</th>
              <th>Rating</th>
              <th>Sessions</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {experts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                  <p className="muted">No experts found</p>
                </td>
              </tr>
            ) : (
              experts.map((expert) => (
                <tr key={expert.id}>
                  <td>{expert.email}</td>
                  <td>{expert.fullName}</td>
                  <td>{expert.expertise}</td>
                  <td>₹{expert.pricePerMinute}</td>
                  <td>
                    <span className="rating">
                      ⭐ {expert.averageRating ? parseFloat(expert.averageRating).toFixed(1) : 'N/A'}
                    </span>
                  </td>
                  <td>{expert.sessionCount}</td>
                  <td>
                    <span className={`status-badge ${expert.accountStatus}`}>
                      {expert.accountStatus === 'pending' && '⏳ Pending'}
                      {expert.accountStatus === 'approved' && '✅ Approved'}
                      {expert.accountStatus === 'disabled' && '🚫 Disabled'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {expert.accountStatus === 'pending' && (
                        <button
                          onClick={() => approveExpert(expert.id)}
                          className="btn-approve"
                          disabled={actionLoading[expert.id]}
                        >
                          {actionLoading[expert.id] === 'approving' ? '⏳' : '✅'} Approve
                        </button>
                      )}
                      {expert.accountStatus !== 'disabled' && (
                        <button
                          onClick={() => disableExpert(expert.id)}
                          className="btn-disable"
                          disabled={actionLoading[expert.id]}
                        >
                          {actionLoading[expert.id] === 'disabling' ? '⏳' : '🚫'} Disable
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

export default AdminExpertsPage;
