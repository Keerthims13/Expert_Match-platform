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
