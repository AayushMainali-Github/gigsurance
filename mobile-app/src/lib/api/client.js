import Constants from 'expo-constants';
import { ApiError, getErrorMessage, isUnauthorizedError, isUnavailableError } from './errors';
import { getAccessToken } from '../storage/session';

const DEFAULT_TIMEOUT_MS = 15000;
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://127.0.0.1:5000';

function buildUrl(path, query) {
  const url = new URL(path, API_BASE_URL);

  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

function withPagination({ page = 1, limit = 20 } = {}) {
  return { page, limit };
}

async function withTimeout(executor, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await executor(controller.signal);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('Request timed out', {
        code: 'request_timeout',
        retryable: true
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function normalizeResponse(response, path) {
  const payload = await response.json().catch(() => null);

  if (response.ok) {
    return payload;
  }

  const message =
    payload?.message ||
    payload?.error ||
    (response.status === 404 ? 'Requested resource is unavailable' : `Request failed with status ${response.status}`);

  throw new ApiError(message, {
    status: response.status,
    code: response.status === 404 ? 'not_found' : 'request_failed',
    payload,
    path,
    retryable: response.status >= 500
  });
}

export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    query,
    auth = true,
    timeoutMs = DEFAULT_TIMEOUT_MS
  } = options;

  const token = auth ? await getAccessToken() : null;
  const resolvedHeaders = {
    Accept: 'application/json',
    ...headers
  };

  let resolvedBody = body;
  const isBodyJson = body !== undefined && body !== null && !(body instanceof FormData);

  if (auth && token) {
    resolvedHeaders.Authorization = `Bearer ${token}`;
  }

  if (isBodyJson) {
    resolvedHeaders['Content-Type'] = 'application/json';
    resolvedBody = JSON.stringify(body);
  }

  try {
    const response = await withTimeout(
      (signal) =>
        fetch(buildUrl(path, query), {
          method,
          headers: resolvedHeaders,
          body: resolvedBody,
          signal
        }),
      timeoutMs
    );

    return await normalizeResponse(response, path);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('Unable to reach the backend service', {
      code: 'network_unavailable',
      path,
      retryable: true
    });
  }
}

export const api = {
  health: () => request('/api/health', { auth: false }),

  auth: {
    signup: (payload) => request('/api/auth/signup', { method: 'POST', auth: false, body: payload }),
    login: (payload) => request('/api/auth/login', { method: 'POST', auth: false, body: payload }),
    refresh: () => request('/api/auth/refresh', { method: 'POST' }),
    logout: () => request('/api/auth/logout', { method: 'POST' })
  },

  users: {
    me: () => request('/api/users/me'),
    getDashboard: () => request('/api/users/me/dashboard'),
    getPolicySummary: () => request('/api/users/me/policy-summary')
  },

  workers: {
    list: () => request('/api/workers'),
    getPrimary: () => request('/api/workers/primary'),
    link: (payload) => request('/api/workers/link', { method: 'POST', body: payload })
  },

  policies: {
    list: () => request('/api/policies'),
    getCurrent: () => request('/api/policies/current'),
    getCoverage: () => request('/api/policies/current/coverage'),
    getWeeklyRisk: () => request('/api/policies/current/weekly-risk'),
    getReviewStatus: () => request('/api/policies/current/review-status'),
    enroll: () => request('/api/policies/enroll', { method: 'POST' }),
    pause: () => request('/api/policies/pause', { method: 'POST' }),
    cancel: () => request('/api/policies/cancel', { method: 'POST' })
  },

  billing: {
    list: (params) => request('/api/billing', { query: withPagination(params) }),
    getCurrent: () => request('/api/billing/current'),
    getHistory: (params) => request('/api/billing/history', { query: withPagination(params) }),
    getInvoices: (params = {}) =>
      request('/api/billing/invoices', {
        query: {
          ...withPagination(params),
          status: params.status
        }
      }),
    getNextDue: () => request('/api/billing/next-due'),
    payInvoice: (invoiceId) => request(`/api/billing/invoices/${invoiceId}/pay`, { method: 'POST' })
  },

  payouts: {
    list: (params) => request('/api/payouts', { query: withPagination(params) }),
    getHistory: (params) => request('/api/payouts/history', { query: withPagination(params) }),
    getLatest: () => request('/api/payouts/latest'),
    getReceipt: (decisionId) => request(`/api/payouts/${decisionId}/receipt`),
    getIncidentHistory: (params) => request('/api/payouts/incidents/history', { query: withPagination(params) })
  }
};

export { ApiError, getErrorMessage, isUnauthorizedError, isUnavailableError };
