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

export async function searchExperts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.minRating !== undefined) params.append('minRating', filters.minRating);
  if (filters.maxRating !== undefined) params.append('maxRating', filters.maxRating);
  if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice);
  if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice);
  if (filters.availability) params.append('availability', filters.availability);
  if (filters.category) params.append('category', filters.category);

  const query = params.toString();
  const url = query ? `/api/experts/search/filter?${query}` : '/api/experts/search/filter';

  const payload = await apiFetch(url, {}, 'Failed to search experts');
  return payload.data;
}

export async function toggleExpertBookmark(expertId) {
  const payload = await apiFetch(
    `/api/experts/${expertId}/bookmark`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    'Failed to toggle bookmark'
  );
  return payload.data;
}

export async function fetchUserBookmarks() {
  const payload = await apiFetch('/api/bookmarks', {}, 'Failed to fetch bookmarks');
  return payload.data;
}
