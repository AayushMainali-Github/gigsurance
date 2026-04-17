import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardViewModel } from './dashboardState.js';

test('builds dashboard review-aware state', () => {
  const result = buildDashboardViewModel({
    coverage: { status: 'active' },
    currentPremium: { status: 'quoted', finalPremiumInr: 84 },
    latestPayout: null,
    reviewSummary: { hasOpenReview: true }
  });

  assert.equal(result.hasReviewHold, true);
  assert.equal(result.coverageCard.value, 'Protected');
});

test('formats premium and payout values for the dashboard', () => {
  const result = buildDashboardViewModel({
    coverage: { status: 'paused' },
    currentPremium: { status: 'quoted', finalPremiumInr: 120 },
    latestPayout: { status: 'approved', finalPayoutInr: 220 },
    reviewSummary: { hasOpenReview: false }
  });

  assert.equal(result.premiumCard.value, 'Rs 120');
  assert.equal(result.payoutCard.value, 'Rs 220');
});
