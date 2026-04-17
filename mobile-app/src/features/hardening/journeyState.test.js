import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJourneyChecklist } from './journeyState.js';

test('journey checklist marks core seeded flow steps complete', () => {
  const items = buildJourneyChecklist({
    user: {
      email: 'seeded+swiggy-worker@gigsurance.local',
      linkedWorker: { platformDriverId: 'SWIGGY-DEL-00000145' },
      currentPolicy: { status: 'active' }
    },
    coverage: { status: 'active' },
    currentPremium: { id: 'premium-1' },
    latestPayout: { id: 'payout-1', status: 'approved' },
    reviewSummary: { hasOpenReview: true }
  });

  assert.equal(items.every((item) => item.complete), true);
});

test('journey checklist marks missing payout and review states incomplete', () => {
  const items = buildJourneyChecklist({
    user: { email: 'new@worker.com', linkedWorker: { platformDriverId: 'ID-1' }, currentPolicy: { status: 'active' } },
    coverage: { status: 'active' },
    currentPremium: { id: 'premium-1' },
    latestPayout: null,
    reviewSummary: { hasOpenReview: false }
  });

  const payoutVisible = items.find((item) => item.key === 'payoutVisible');
  const reviewVisible = items.find((item) => item.key === 'reviewStateVisible');

  assert.equal(payoutVisible.complete, false);
  assert.equal(reviewVisible.complete, false);
});
