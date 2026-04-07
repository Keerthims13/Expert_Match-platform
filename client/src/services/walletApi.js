import { apiFetch } from './httpClient.js';

export async function fetchWalletConfig() {
  const payload = await apiFetch('/api/wallet/config', {}, 'Failed to fetch wallet config');
  return payload.data;
}

export async function fetchMyWallet() {
  const payload = await apiFetch('/api/wallet/me', {}, 'Failed to fetch wallet');
  return payload.data;
}

export async function createTopupOrder(amount) {
  const payload = await apiFetch(
    '/api/wallet/topup/create-order',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount })
    },
    'Failed to create topup order'
  );

  return payload.data;
}

export async function verifyTopupPayment(data) {
  const payload = await apiFetch(
    '/api/wallet/topup/verify',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    },
    'Failed to verify topup payment'
  );

  return payload.data;
}

export async function fetchMyBillings() {
  const payload = await apiFetch('/api/wallet/billings', {}, 'Failed to fetch billings');
  return payload.data;
}

export async function fetchSessionBilling(sessionId) {
  const payload = await apiFetch(`/api/sessions/${sessionId}/billing`, {}, 'Failed to fetch session billing');
  return payload.data;
}
