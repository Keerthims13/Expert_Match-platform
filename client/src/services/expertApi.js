const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function parseResponse(response, fallbackMessage) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || fallbackMessage);
  }

  return response.json();
}

export async function fetchExpertProfile(identifier) {
  const response = await fetch(`${API_BASE_URL}/api/experts/${identifier}`);
  const payload = await parseResponse(response, 'Failed to fetch expert profile');
  return payload.data;
}

export async function fetchExpertList() {
  const response = await fetch(`${API_BASE_URL}/api/experts`);
  const payload = await parseResponse(response, 'Failed to fetch expert list');
  return payload.data;
}

export async function createExpertProfile(data) {
  const response = await fetch(`${API_BASE_URL}/api/experts/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const payload = await parseResponse(response, 'Failed to create expert profile');
  return payload.data;
}
