import test from 'node:test';
import assert from 'node:assert/strict';
import { getAuthFlowState } from './authState.js';

test('returns restoring while auth state is loading', () => {
  assert.equal(getAuthFlowState({ isAuthenticated: false, isRestoring: true, user: null }), 'restoring');
});

test('returns auth when user is signed out', () => {
  assert.equal(getAuthFlowState({ isAuthenticated: false, isRestoring: false, user: null }), 'auth');
});

test('returns worker-link when linked worker is missing', () => {
  assert.equal(getAuthFlowState({ isAuthenticated: true, isRestoring: false, user: {} }), 'worker-link');
});

test('returns policy-enroll when worker exists but policy is missing', () => {
  assert.equal(
    getAuthFlowState({ isAuthenticated: true, isRestoring: false, user: { linkedWorker: { id: 'w1' } } }),
    'policy-enroll'
  );
});

test('returns app when linked worker and policy exist', () => {
  assert.equal(
    getAuthFlowState({
      isAuthenticated: true,
      isRestoring: false,
      user: { linkedWorker: { id: 'w1' }, currentPolicy: { id: 'p1' } }
    }),
    'app'
  );
});
