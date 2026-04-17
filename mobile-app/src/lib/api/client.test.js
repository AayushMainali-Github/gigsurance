import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, getErrorMessage, isUnauthorizedError, isUnavailableError } from './errors.js';

test('detects unavailable errors', () => {
  assert.equal(isUnavailableError(new ApiError('missing', { code: 'not_found' })), true);
});

test('detects unauthorized errors', () => {
  assert.equal(isUnauthorizedError(new ApiError('unauthorized', { status: 401 })), true);
});

test('returns fallback for generic errors', () => {
  assert.equal(getErrorMessage(new Error('boom'), 'fallback'), 'fallback');
});
