const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function withPagination(path, { page = 1, limit = 100 } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  return `${path}?${params.toString()}`;
}

export const api = {
  getAdminDashboard: () => request('/api/admin/dashboard'),
  getUsers: ({ page = 1, limit = 100 } = {}) => request(withPagination('/api/admin/users', { page, limit })),
  getPolicies: ({ page = 1, limit = 100 } = {}) => request(withPagination('/api/admin/policies', { page, limit })),
  getPremiumQueue: ({ page = 1, limit = 100 } = {}) => request(withPagination('/api/admin/queues/premiums', { page, limit })),
  getPayoutQueue: ({ page = 1, limit = 100 } = {}) => request(withPagination('/api/admin/queues/payouts', { page, limit })),
  getReviewQueue: ({ page = 1, limit = 100 } = {}) => request(withPagination('/api/admin/queues/reviews', { page, limit })),
  getExposure: ({ page = 1, limit = 100 } = {}) => request(withPagination('/api/admin/exposure', { page, limit })),
  getFinanceDashboard: () => request('/api/finance/dashboard'),
  getFinanceSummary: () => request('/api/finance/summary'),
  getLatestSnapshot: () => request('/api/finance/snapshots/latest'),
  getAuditLogs: ({ page = 1, limit = 100 } = {}) => request(withPagination('/api/audit', { page, limit })),
  getReviewCases: ({ page = 1, limit = 100 } = {}) => request(withPagination('/api/fraud', { page, limit })),
  suspendUser: (userId, body) => request(`/api/admin/users/${userId}/suspend`, { method: 'POST', body: JSON.stringify(body) }),
  annotateUser: (userId, body) => request(`/api/admin/users/${userId}/notes`, { method: 'POST', body: JSON.stringify(body) }),
  overridePremium: (decisionId, body) => request(`/api/admin/premiums/${decisionId}/override`, { method: 'POST', body: JSON.stringify(body) }),
  overridePayout: (decisionId, body) => request(`/api/admin/payouts/${decisionId}/override`, { method: 'POST', body: JSON.stringify(body) }),
  applyReviewAction: (caseId, body) => request(`/api/fraud/${caseId}/actions`, { method: 'POST', body: JSON.stringify(body) })
};
