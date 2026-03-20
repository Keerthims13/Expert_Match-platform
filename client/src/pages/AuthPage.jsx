import { useState } from 'react';
import { loginUser, registerUser } from '../services/authApi.js';

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'student'
};

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function onChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const data = mode === 'login'
        ? await loginUser({ email: form.email, password: form.password })
        : await registerUser(form);

      onAuthenticated?.(data.user);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-card auth-shell">
      <p className="label">Authentication</p>
      <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="subtitle">Use this to access doubts and live sessions securely.</p>

      <form onSubmit={onSubmit} className="profile-form">
        {mode === 'register' ? (
          <label>
            Full Name
            <input name="fullName" value={form.fullName} onChange={onChange} required />
          </label>
        ) : null}

        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={onChange} required />
        </label>

        <label>
          Password
          <input name="password" type="password" value={form.password} onChange={onChange} required />
        </label>

        {mode === 'register' ? (
          <label>
            Role
            <select name="role" value={form.role} onChange={onChange}>
              <option value="student">Student</option>
              <option value="expert">Expert</option>
            </select>
          </label>
        ) : null}

        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </form>

      <button
        type="button"
        className="link-btn"
        onClick={() => {
          setMode((prev) => (prev === 'login' ? 'register' : 'login'));
          setError('');
        }}
      >
        {mode === 'login' ? 'New user? Register here' : 'Already have an account? Login'}
      </button>

      {error ? <p className="error-box">{error}</p> : null}
    </section>
  );
}

export default AuthPage;
