import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPayoutListViewModel } from './payoutState.js';

test('formats payout list rows', () => {
  const result = buildPayoutListViewModel([
    { id: 'p1', incidentDate: '2026-04-10T00:00:00.000Z', finalPayoutInr: 220, status: 'approved' }
  ]);

  assert.equal(result[0].value, 'Rs 220');
  assert.equal(result[0].badgeLabel, 'Approved');
});

test('marks review-aware payout list rows', () => {
  const result = buildPayoutListViewModel([
    { id: 'p2', incidentDate: '2026-04-11T00:00:00.000Z', finalPayoutInr: 0, status: 'held', manualReviewFlag: true }
  ]);

  assert.match(result[0].meta, /review-aware/i);
});
