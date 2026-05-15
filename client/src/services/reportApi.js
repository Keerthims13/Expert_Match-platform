import { apiFetch } from './httpClient.js';

export async function submitReport(payload) {
  const response = await apiFetch(
    '/api/reports',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    },
    'Failed to submit report'
  );

  return response.data;
}

export async function fetchAdminReports({ page = 1, limit = 20, status = 'pending' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });

  if (status) {
    params.append('status', status);
  }

  return apiFetch(`/api/admin/reports?${params.toString()}`, {}, 'Failed to load reports');
}

export async function takeReportAction(reportId, payload) {
  return apiFetch(
    `/api/admin/reports/${reportId}/action`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    },
    'Failed to take action on report'
  );
}
