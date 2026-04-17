import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../../lib/api/errors.js';
import { getWorkerLinkFeedback } from './linkingState.js';

test('maps not found worker errors to warning feedback', () => {
  const result = getWorkerLinkFeedback(new ApiError('Worker not found', { status: 404 }));
  assert.equal(result.tone, 'warning');
});

test('maps ownership conflicts to danger feedback', () => {
  const result = getWorkerLinkFeedback(new ApiError('Worker already linked to another user', { status: 409 }));
  assert.equal(result.message, 'This worker is already linked to another account.');
});

test('maps same-account conflicts to warning feedback', () => {
  const result = getWorkerLinkFeedback(new ApiError('Primary worker already linked for this user', { status: 409 }));
  assert.equal(result.message, 'A primary worker is already linked to this account.');
});
