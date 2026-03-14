const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function parseResponse(response, fallbackMessage) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || fallbackMessage);
  }

  return response.json();
}

export async function fetchDoubts() {
  const response = await fetch(`${API_BASE_URL}/api/doubts`);
  const payload = await parseResponse(response, 'Failed to fetch doubts');
  return payload.data;
}

export async function createDoubt(data) {
  const response = await fetch(`${API_BASE_URL}/api/doubts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const payload = await parseResponse(response, 'Failed to create doubt');
  return payload.data;
}

export async function fetchDoubtMatches(doubtId) {
  const response = await fetch(`${API_BASE_URL}/api/doubts/${doubtId}/matches`);
  const payload = await parseResponse(response, 'Failed to fetch expert matches');
  return payload.data;
}
