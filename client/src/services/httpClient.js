const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const TOKEN_KEY = 'expertmatch_token';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function parseResponse(response, fallbackMessage) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || fallbackMessage);
  }

  return response.json();
}

export async function apiFetch(path, options = {}, fallbackMessage = 'Request failed') {
  const headers = {
    ...(options.headers || {})
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  return parseResponse(response, fallbackMessage);
}

export { API_BASE_URL };
