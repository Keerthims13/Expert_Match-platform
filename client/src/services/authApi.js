import { apiFetch, setAuthToken } from './httpClient.js';

export async function registerUser(payload) {
  const response = await apiFetch(
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
