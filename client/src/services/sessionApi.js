import { apiFetch } from './httpClient.js';

export async function fetchSessions() {
  const payload = await apiFetch('/api/sessions', {}, 'Failed to fetch sessions');
  return payload.data;
}

export async function createSession(data) {
  const payload = await apiFetch(
    '/api/sessions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    },
    'Failed to create session'
  );
  return {
    ...payload.data,
    _meta: payload.meta || {}
  };
}

export async function fetchSessionMessages(sessionId) {
  const payload = await apiFetch(`/api/sessions/${sessionId}/messages`, {}, 'Failed to fetch session messages');
  return payload.data;
}

export async function sendSessionMessage(sessionId, data) {
  const payload = await apiFetch(
    `/api/sessions/${sessionId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    },
    'Failed to send message'
  );
  return payload.data;
}

export async function updateSessionStatus(sessionId, status) {
  const payload = await apiFetch(
    `/api/sessions/${sessionId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    },
    'Failed to update session status'
  );
  return payload.data;
}

export async function fetchUnreadCounts() {
  const payload = await apiFetch('/api/sessions/unread', {}, 'Failed to fetch unread counts');
  return payload.data || {};
}

export async function markSessionRead(sessionId) {
  const payload = await apiFetch(
    `/api/sessions/${sessionId}/read`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    },
    'Failed to mark session as read'
  );
  return payload.data;
}
