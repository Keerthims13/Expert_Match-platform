import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAdminReports, takeReportAction } from '../services/reportApi.js';
import '../styles/admin.css';

function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [actionLoading, setActionLoading] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadReports();
  }, [page, status]);

  async function loadReports() {
    try {
      setLoading(true);
      const payload = await fetchAdminReports({ page, limit: 20, status });
      setReports(payload.data || []);
      setError('');
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('unauthorized')) {
        navigate('/admin/login');
        return;
      }
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  function titleCase(text) {
    if (!text) return '';
    return String(text)
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  async function handleAction(report, action) {
    const note = window.prompt('Optional admin note (leave blank to skip):', '');
    if (note === null) return;

    const payload = {
      action,
      notes: note || ''
    };

    if (action === 'disable_user' || action === 'disable_expert') {
      const disableReason = window.prompt('Reason to disable account:', report.reason || 'Policy violation') || 'Policy violation';
      payload.disableReason = disableReason;
    }

    setActionLoading((prev) => ({ ...prev, [report.id]: action }));
    try {
      await takeReportAction(report.id, payload);
      setReports((prev) => prev.filter((item) => item.id !== report.id));
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to take report action');
    } finally {
      setActionLoading((prev) => ({ ...prev, [report.id]: null }));
    }
  }

  if (loading) return <div className="admin-page"><p className="muted">Loading reports...</p></div>;

  return (
    <div className="admin-page">
      <h2>🚨 Reports & Moderation</h2>

      <div className="filter-bar">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="filter-select"
        >
          <option value="pending">Pending</option>
          <option value="action_taken">Action Taken</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {error ? <p className="error-box">{error}</p> : null}

      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Reporter</th>
              <th>Target</th>
              <th>Category</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                  <p className="muted">No reports found</p>
                </td>
              </tr>
            ) : reports.map((report) => (
              <tr key={report.id}>
                <td>#{report.id}</td>
                <td>{report.reporterName || `User #${report.reporterUserId}`}</td>
                <td>
                  {report.reportedExpertId
                    ? `Expert: ${report.reportedExpertName || `#${report.reportedExpertId}`}`
                    : `User: ${report.reportedUserName || `#${report.reportedUserId}`}`}
                </td>
                <td>{titleCase(report.category)}</td>
                <td style={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{report.reason}</td>
                <td><span className={`status-badge ${report.status}`}>{report.status}</span></td>
                <td>{new Date(report.createdAt).toLocaleString()}</td>
                <td>
                  {report.status === 'pending' ? (
                    <div className="action-buttons">
                      {report.reportedUserId ? (
                        <button
                          type="button"
                          className="btn-disable"
                          onClick={() => handleAction(report, 'disable_user')}
                          disabled={Boolean(actionLoading[report.id])}
                        >
                          Disable User
                        </button>
                      ) : null}
                      {report.reportedExpertId ? (
                        <button
                          type="button"
                          className="btn-disable"
                          onClick={() => handleAction(report, 'disable_expert')}
                          disabled={Boolean(actionLoading[report.id])}
                        >
                          Disable Expert
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => handleAction(report, 'dismiss')}
                        disabled={Boolean(actionLoading[report.id])}
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <span className="muted">Handled</span>
                  )}
                </td>
              </tr>
            ))}
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

export default AdminReportsPage;
