import { apiFetch, setAuthToken } from './httpClient.js';

export async function registerUser(payload) {
  let response;

  if (payload?.imageFile) {
    const formData = new FormData();
    formData.append('fullName', payload.fullName || '');
    formData.append('email', payload.email || '');
    formData.append('password', payload.password || '');
    formData.append('role', payload.role || 'student');
    formData.append('image', payload.imageFile);

    response = await apiFetch(
      '/api/auth/register-with-avatar',
      {
        method: 'POST',
        body: formData
      },
      'Failed to register'
    );
  } else {
    response = await apiFetch(
      '/api/auth/register',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      },
      'Failed to register'
    );
  }

  if (response?.data?.token) {
    setAuthToken(response.data.token);
  }

  return response.data;
}

export async function loginUser(payload) {
  const response = await apiFetch(
    '/api/auth/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    },
    'Failed to login'
  );

  if (response?.data?.token) {
    setAuthToken(response.data.token);
  }

  return response.data;
}

export async function fetchCurrentUser() {
  const response = await apiFetch('/api/auth/me', {}, 'Failed to fetch current user');
  return response.data;
}

export async function loginWithGoogle(payload) {
  const response = await apiFetch(
    '/api/auth/google',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    },
    'Failed to login with Google'
  );

  if (response?.data?.token) {
    setAuthToken(response.data.token);
  }

  return response.data;
}

export async function uploadMyAvatar(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await apiFetch(
    '/api/auth/me/avatar',
    {
      method: 'PATCH',
      body: formData
    },
    'Failed to upload profile image'
  );

  return response.data;
}
