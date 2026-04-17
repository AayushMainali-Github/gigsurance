import { formatCurrencyInr, formatStatusLabel, getStatusTone } from '../../lib/utils/format.js';

export function buildDashboardViewModel({ coverage, currentPremium, latestPayout, reviewSummary }) {
  return {
    hasReviewHold: Boolean(reviewSummary?.hasOpenReview || latestPayout?.status === 'held'),
    coverageCard: {
      title: formatStatusLabel(coverage?.status || 'unknown'),
      value: coverage?.status === 'active' ? 'Protected' : coverage?.status ? formatStatusLabel(coverage.status) : 'Not Active',
      tone: getStatusTone(coverage?.status)
    },
    premiumCard: {
      title: formatStatusLabel(currentPremium?.status || 'current'),
      value: currentPremium ? formatCurrencyInr(currentPremium.finalPremiumInr) : 'Not Generated',
      tone: 'primary'
    },
    payoutCard: {
      title: formatStatusLabel(latestPayout?.status || 'no recent payout'),
      value: latestPayout ? formatCurrencyInr(latestPayout.finalPayoutInr) : 'No Payout Yet',
      tone: getStatusTone(latestPayout?.status)
    }
  };
}
