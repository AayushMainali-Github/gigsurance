export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? null;
    this.code = options.code ?? 'api_error';
    this.payload = options.payload ?? null;
    this.path = options.path ?? null;
    this.retryable = options.retryable ?? false;
  }
}

export function isUnavailableError(error) {
  return error instanceof ApiError && ['not_found', 'network_unavailable', 'request_timeout'].includes(error.code);
}

export function isUnauthorizedError(error) {
  return error instanceof ApiError && error.status === 401;
}

export function getErrorMessage(error, fallback = 'Something went wrong') {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}
