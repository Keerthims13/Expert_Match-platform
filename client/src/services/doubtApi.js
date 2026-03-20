import { apiFetch } from './httpClient.js';

export async function fetchDoubts() {
  const payload = await apiFetch('/api/doubts', {}, 'Failed to fetch doubts');
  return payload.data;
}

export async function createDoubt(data) {
  const payload = await apiFetch(
    '/api/doubts',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    },
    'Failed to create doubt'
  );
  return payload.data;
}

export async function fetchDoubtMatches(doubtId) {
  const payload = await apiFetch(`/api/doubts/${doubtId}/matches`, {}, 'Failed to fetch expert matches');
  return payload.data;
}

export async function assignExpertToDoubt(doubtId, expertId) {
  const payload = await apiFetch(
    `/api/doubts/${doubtId}/assign`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expertId })
    },
    'Failed to assign expert'
  );
  return payload.data;
}
