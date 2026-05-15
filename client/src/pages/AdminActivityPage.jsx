import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../services/httpClient.js';
import '../styles/admin.css';

function AdminActivityPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
  }, [page, statusFilter]);

  async function loadSessions() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 20
      });

      if (statusFilter) params.append('status', statusFilter);

      const data = await apiFetch(`/api/admin/sessions-monitoring?${params}`, {}, 'Failed to load sessions');
      setSessions(data.sessions);
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('unauthorized')) {
        navigate('/admin/login');
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="admin-page"><p className="muted">Loading activity...</p></div>;

  return (
    <div className="admin-page">
      <h2>📊 Activity Monitoring</h2>

      <div className="filter-bar">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="filter-select"
        >
          <option value="">All Sessions</option>
          <option value="active">🟢 Active</option>
          <option value="completed">✅ Completed</option>
          <option value="requested">⏳ Requested</option>
          <option value="declined">❌ Declined</option>
        </select>
      </div>

      {error && <p className="error-box">{error}</p>}

      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Session ID</th>
              <th>Student</th>
              <th>Expert</th>
              <th>Topic</th>
              <th>Status</th>
              <th>Rating</th>
              <th>Duration</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                  <p className="muted">No sessions found</p>
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id}>
                  <td>#{session.id}</td>
                  <td>{session.studentName}</td>
                  <td>{session.expertName}</td>
                  <td>{session.title}</td>
                  <td>
                    <span className={`status-badge ${session.status}`}>
                      {session.status === 'active' && '🟢 Active'}
                      {session.status === 'completed' && '✅ Completed'}
                      {session.status === 'requested' && '⏳ Requested'}
                      {session.status === 'declined' && '❌ Declined'}
                    </span>
                  </td>
                  <td>
                    {session.rating ? (
                      <span className="rating">⭐ {session.rating}/5</span>
                    ) : (
                      <span className="muted">Not rated</span>
                    )}
                  </td>
                  <td>{session.duration || 'N/A'}</td>
                  <td>{new Date(session.createdAt).toLocaleString()}</td>
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

export default AdminActivityPage;
