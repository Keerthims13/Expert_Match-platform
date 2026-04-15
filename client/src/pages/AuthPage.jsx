import { useEffect, useState } from 'react';
import { loginUser, loginWithGoogle, registerUser } from '../services/authApi.js';

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'student'
};

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!googleClientId) return;

    function initializeGoogle() {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            setSubmitting(true);
            setError('');
            const data = await loginWithGoogle({
              idToken: response.credential,
              role: form.role || 'student'
            });
            onAuthenticated?.(data.user);
          } catch (googleError) {
            setError(googleError.message);
          } finally {
            setSubmitting(false);
          }
        }
      });

      const nativeContainer = document.getElementById('google-signin-native');
      if (nativeContainer) {
        nativeContainer.innerHTML = '';
        window.google.accounts.id.renderButton(nativeContainer, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill'
        });
      }

      setGoogleReady(true);
    }

    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.body.appendChild(script);
    } else {
      initializeGoogle();
    }
  }, [googleClientId, form.role, mode]);

  function onGoogleSignInClick() {
    if (!googleClientId) {
      setError('Google login is not configured. Please set VITE_GOOGLE_CLIENT_ID.');
      return;
    }

    if (!window.google?.accounts?.id) {
      setError('Google SDK is still loading. Please wait and try again.');
      return;
    }

    setError('');
    const nativeBtn = document.querySelector('#google-signin-native [role="button"]');
    if (nativeBtn) {
      nativeBtn.click();
      return;
    }

    window.google.accounts.id.prompt();
  }

  function onChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function onImageChange(event) {
    const file = event.target.files?.[0] || null;
    setImageFile(file);

    if (!file) {
      setImagePreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const data = mode === 'login'
        ? await loginUser({ email: form.email, password: form.password })
        : await registerUser({ ...form, imageFile });

      onAuthenticated?.(data.user);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-layout">
        <aside className="auth-brand-panel">
          <p className="label">ExpertMatch</p>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="subtitle">Securely access doubts, live sessions, and your expert network in one place.</p>
          <div className="auth-brand-pills" aria-hidden="true">
            <span>AI matched experts</span>
            <span>Live chat sessions</span>
            <span>Trusted workflow</span>
          </div>
          
          <div className="auth-brand-features">
            <div className="auth-feature-item">
              <span className="auth-feature-icon">✨</span>
              <div>
                <p className="auth-feature-title">Smart Matching</p>
                <p className="auth-feature-desc">Get matched with the right experts instantly</p>
              </div>
            </div>
            <div className="auth-feature-item">
              <span className="auth-feature-icon">🎯</span>
              <div>
                <p className="auth-feature-title">Quality Assured</p>
                <p className="auth-feature-desc">Verified experts with proven track records</p>
              </div>
            </div>
            <div className="auth-feature-item">
              <span className="auth-feature-icon">🚀</span>
              <div>
                <p className="auth-feature-title">Instant Solutions</p>
                <p className="auth-feature-desc">Get help whenever you need it, 24/7</p>
              </div>
            </div>
          </div>

          <div className="auth-brand-stats">
            <div className="auth-stat-box">
              <p className="auth-stat-number">10K+</p>
              <p className="auth-stat-label">Experts Online</p>
            </div>
            <div className="auth-stat-box">
              <p className="auth-stat-number">95%</p>
              <p className="auth-stat-label">Success Rate</p>
            </div>
            <div className="auth-stat-box">
              <p className="auth-stat-number">&lt;2min</p>
              <p className="auth-stat-label">Avg Response</p>
            </div>
          </div>
        </aside>

        <div className="page-card auth-form-panel">
          {submitting ? (
            <div className="auth-skeleton" aria-hidden="true">
              <span className="auth-skeleton-line auth-skeleton-title" />
              <span className="auth-skeleton-line auth-skeleton-subtitle" />
              <span className="auth-skeleton-line auth-skeleton-input" />
              <span className="auth-skeleton-line auth-skeleton-input" />
              <span className="auth-skeleton-line auth-skeleton-button" />
            </div>
          ) : (
            <>
              <p className="label">Authentication</p>
              <h2 className="auth-form-title">{mode === 'login' ? 'Sign in to continue' : 'Set up your account'}</h2>
              <p className="subtitle">Use this to access doubts and live sessions securely.</p>

              <form onSubmit={onSubmit} className="profile-form auth-form-grid">
                {mode === 'register' ? (
                  <label>
                    Full Name
                    <span className="input-shell">
                      <span className="input-icon" aria-hidden="true">👤</span>
                      <input name="fullName" value={form.fullName} onChange={onChange} required />
                    </span>
                  </label>
                ) : null}

                {mode === 'register' ? (
                  <label>
                    Profile Image (optional)
                    <input name="image" type="file" accept="image/*" onChange={onImageChange} />
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Selected profile preview"
                        className="auth-image-preview"
                      />
                    ) : null}
                  </label>
                ) : null}

                <label>
                  Email
                  <span className="input-shell">
                    <span className="input-icon" aria-hidden="true">✉️</span>
                    <input name="email" type="email" value={form.email} onChange={onChange} required />
                  </span>
                </label>

                <label>
                  Password
                  <span className="input-shell">
                    <span className="input-icon" aria-hidden="true">🔒</span>
                    <input name="password" type="password" value={form.password} onChange={onChange} required />
                  </span>
                </label>

                {mode === 'register' ? (
                  <label>
                    Role
                    <span className="input-shell input-shell-select">
                      <span className="input-icon" aria-hidden="true">🧭</span>
                      <select name="role" value={form.role} onChange={onChange}>
                        <option value="student">Student</option>
                        <option value="expert">Expert</option>
                      </select>
                    </span>
                  </label>
                ) : null}

                <button type="submit" className="primary-btn auth-submit-btn" disabled={submitting}>
                  {submitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
                </button>
              </form>

              {googleClientId ? (
                <div className="google-auth-block">
                  <p className="muted">or continue with Google</p>
                  <div id="google-signin-native" className="google-native-hidden" aria-hidden="true" />
                  <button
                    type="button"
                    className="google-icon-btn"
                    onClick={onGoogleSignInClick}
                    disabled={!googleReady || submitting}
                    aria-label="Continue with Google"
                    title="Continue with Google"
                  >
                    <span className="google-symbol">G</span>
                    <span>Continue with Google</span>
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                className="link-btn auth-mode-toggle"
                onClick={() => {
                  setMode((prev) => (prev === 'login' ? 'register' : 'login'));
                  setError('');
                }}
              >
                {mode === 'login' ? 'New user? Register here' : 'Already have an account? Login'}
              </button>

              {mode === 'login' ? (
                <div className="auth-trust-section">
                  <p className="auth-trust-label">Trusted by thousands of students</p>
                  <div className="auth-trust-badges">
                    <div className="auth-badge">
                      <span className="auth-badge-icon">🔒</span>
                      <p>Encrypted</p>
                    </div>
                    <div className="auth-badge">
                      <span className="auth-badge-icon">✓</span>
                      <p>Verified</p>
                    </div>
                    <div className="auth-badge">
                      <span className="auth-badge-icon">⚡</span>
                      <p>Instant</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? <p className="error-box">{error}</p> : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default AuthPage;
