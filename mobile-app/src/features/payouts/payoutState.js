import { formatCurrencyInr, formatStatusLabel, getStatusTone } from '../../lib/utils/format.js';

export function buildPayoutListViewModel(decisions = []) {
  return decisions.map((item) => ({
    id: item.id,
    label: item.incidentDate ? new Date(item.incidentDate).toLocaleDateString() : 'Not available',
    value: formatCurrencyInr(item.finalPayoutInr),
    meta: item.manualReviewFlag || item.riskReviewFlag
      ? 'Review-aware payout decision.'
      : `Status: ${formatStatusLabel(item.status || 'unknown')}`,
    tone: getStatusTone(item.status),
    badgeLabel: formatStatusLabel(item.status || 'unknown')
  }));
}
