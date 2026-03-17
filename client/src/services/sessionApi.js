const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function parseResponse(response, fallbackMessage) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || fallbackMessage);
  }

  return response.json();
}

export async function fetchSessions() {
  const response = await fetch(`${API_BASE_URL}/api/sessions`);
  const payload = await parseResponse(response, 'Failed to fetch sessions');
  return payload.data;
}

export async function createSession(data) {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const payload = await parseResponse(response, 'Failed to create session');
  return {
    ...payload.data,
    _meta: payload.meta || {}
  };
}

export async function fetchSessionMessages(sessionId) {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/messages`);
  const payload = await parseResponse(response, 'Failed to fetch session messages');
  return payload.data;
}

export async function sendSessionMessage(sessionId, data) {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const payload = await parseResponse(response, 'Failed to send message');
  return payload.data;
}

export async function updateSessionStatus(sessionId, status) {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  });

  const payload = await parseResponse(response, 'Failed to update session status');
  return payload.data;
}
