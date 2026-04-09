import { apiFetch } from './httpClient.js';

export async function fetchExpertProfile(identifier) {
  const payload = await apiFetch(`/api/experts/${identifier}`, {}, 'Failed to fetch expert profile');
  return payload.data;
}

export async function fetchExpertList() {
  const payload = await apiFetch('/api/experts', {}, 'Failed to fetch expert list');
  return payload.data;
}

export async function createExpertProfile(data) {
  const payload = await apiFetch(
    '/api/experts/profile',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    },
    'Failed to create expert profile'
  );
  return payload.data;
}

export async function fetchMyExpertProfile() {
  const payload = await apiFetch('/api/experts/me', {}, 'Failed to fetch your expert profile');
  return payload.data;
}

export async function updateMyExpertAvailability(availabilityStatus) {
  const payload = await apiFetch(
    '/api/experts/me/availability',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ availabilityStatus })
    },
    'Failed to update availability'
  );
  return payload.data;
}

export async function uploadMyExpertAvatar(file) {
  const formData = new FormData();
  formData.append('image', file);

  const payload = await apiFetch(
    '/api/experts/me/avatar',
    {
      method: 'PATCH',
      body: formData
    },
    'Failed to upload expert image'
  );

  return payload.data;
}
