import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../services/httpClient.js';
import '../styles/admin.css';

function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [actionFilter, setActionFilter] = useState('');
  const navigate = useNavigate();

  const actionOptions = [
    'APPROVE_USER',
    'DISABLE_USER',
    'APPROVE_EXPERT',
    'DISABLE_EXPERT',
    'DELETE_USER',
    'DELETE_EXPERT'
  ];

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  async function loadLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 50
      });

      if (actionFilter) params.append('action', actionFilter);

      const data = await apiFetch(`/api/admin/activity-logs?${params}`, {}, 'Failed to load logs');
      setLogs(data.logs);
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('unauthorized')) {
        navigate('/admin/login');
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getActionColor(action) {
    if (action.includes('APPROVE')) return 'action-approve';
    if (action.includes('DISABLE')) return 'action-disable';
    if (action.includes('DELETE')) return 'action-delete';
    return 'action-default';
  }

  if (loading) return <div className="admin-page"><p className="muted">Loading logs...</p></div>;

  return (
    <div className="admin-page">
      <h2>📋 Audit Logs</h2>

      <div className="filter-bar">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="filter-select"
        >
          <option value="">All Actions</option>
          {actionOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error-box">{error}</p>}

      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                  <p className="muted">No logs found</p>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.fullName || 'System'}</td>
                  <td>
                    <span className={`action-badge ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.entityType}</td>
                  <td>#{log.entityId}</td>
                  <td>
                    {log.details ? (
                      <details className="log-details">
                        <summary>View</summary>
                        <pre>{JSON.stringify(JSON.parse(log.details), null, 2)}</pre>
                      </details>
                    ) : (
                      <span className="muted">-</span>
                    )}
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

export default AdminLogsPage;
