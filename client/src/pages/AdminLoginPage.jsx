import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/httpClient.js';
import '../styles/admin.css';

function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiFetch(
        '/api/admin/login',
        {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
        },
        'Login failed'
      );

      localStorage.setItem('adminEmail', data.email);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🛡️ Admin Portal</h1>
          <p>Expert Match Administration</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-box">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@expertmatch.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="primary-btn login-btn"
            disabled={loading}
          >
            {loading ? '⏳ Logging in...' : '🔓 Access Admin Dashboard'}
          </button>
        </form>

        <div className="login-footer">
          <p>Restricted access for administrators only</p>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;
