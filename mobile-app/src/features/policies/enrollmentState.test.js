import test from 'node:test';
import assert from 'node:assert/strict';
import { getEnrollmentMessage } from './enrollmentState.js';

test('returns default policy activation guidance', () => {
  assert.equal(getEnrollmentMessage({ hasPolicy: false, submitting: false, success: false }).tone, 'info');
});

test('returns success messaging after enrollment', () => {
  assert.equal(getEnrollmentMessage({ hasPolicy: true, submitting: false, success: true }).tone, 'success');
});

test('returns already covered messaging when policy exists', () => {
  assert.match(getEnrollmentMessage({ hasPolicy: true, submitting: false, success: false }).message, /already has active coverage/i);
});
