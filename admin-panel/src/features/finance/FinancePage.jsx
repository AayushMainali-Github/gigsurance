import { useQuery } from '@tanstack/react-query';
import { QueryState } from '../../components/QueryState';
import { ObjectListTable } from '../../components/ObjectListTable';
import { StatCard } from '../../components/StatCard';
import { SparkBarList } from '../../components/SparkBarList';
import { api } from '../../lib/api/client';
import { formatCurrency } from '../../lib/utils/format';

export function FinancePage() {
  const summaryQuery = useQuery({ queryKey: ['finance-summary'], queryFn: api.getFinanceSummary });
  const snapshotQuery = useQuery({ queryKey: ['finance-snapshot'], queryFn: api.getLatestSnapshot });
  const isLoading = summaryQuery.isLoading || snapshotQuery.isLoading;
  const error = summaryQuery.error || snapshotQuery.error;
  const summary = summaryQuery.data?.data || {};
  const snapshot = snapshotQuery.data?.data || {};
  const summaryRows = [
    { metric: 'Gross Premiums Billed', value: formatCurrency(summary.grossPremiumsBilled || 0) },
    { metric: 'Premiums Collected', value: formatCurrency(summary.premiumsCollected || 0) },
    { metric: 'Gross Payouts Approved', value: formatCurrency(summary.grossPayoutsApproved || 0) },
    { metric: 'Payouts Paid', value: formatCurrency(summary.payoutsPaid || 0) },
    { metric: 'Held Liabilities', value: formatCurrency(summary.heldLiabilities || 0) },
    { metric: 'Net Written Premium', value: formatCurrency(summary.netWrittenPremium || 0) },
    { metric: 'Profit Loss', value: formatCurrency(summary.profitLoss || 0) },
    { metric: 'Claim Ratio', value: summary.claimRatio ?? 0 }
  ];
  const snapshotRows = snapshot?.totals ? Object.entries(snapshot.totals).map(([metric, value]) => ({ metric, value })) : [];
  const financeRankRows = [
    { id: 'gross-premiums', label: 'Gross Premiums', value: Number(summary.grossPremiumsBilled || 0), displayValue: formatCurrency(summary.grossPremiumsBilled || 0) },
    { id: 'collected', label: 'Premiums Collected', value: Number(summary.premiumsCollected || 0), displayValue: formatCurrency(summary.premiumsCollected || 0) },
    { id: 'approved', label: 'Payouts Approved', value: Number(summary.grossPayoutsApproved || 0), displayValue: formatCurrency(summary.grossPayoutsApproved || 0) },
    { id: 'paid', label: 'Payouts Paid', value: Number(summary.payoutsPaid || 0), displayValue: formatCurrency(summary.payoutsPaid || 0) },
    { id: 'held', label: 'Held Liabilities', value: Number(summary.heldLiabilities || 0), displayValue: formatCurrency(summary.heldLiabilities || 0) },
    { id: 'net', label: 'Net Written Premium', value: Number(summary.netWrittenPremium || 0), displayValue: formatCurrency(summary.netWrittenPremium || 0) }
  ];
  const balanceRows = snapshot?.balances ? Object.entries(snapshot.balances).map(([metric, value]) => ({
    id: metric,
    label: metric,
    value: Number(value || 0),
    displayValue: formatCurrency(value || 0)
  })) : [];

  return (
    <QueryState isLoading={isLoading} error={error}>
      <div className="dashboard-stack">
        <section className="metric-grid">
          <StatCard title="Gross Premiums" value={formatCurrency(summary.grossPremiumsBilled || 0)} tone="accent" />
          <StatCard title="Premiums Collected" value={formatCurrency(summary.premiumsCollected || 0)} />
          <StatCard title="Gross Payouts" value={formatCurrency(summary.grossPayoutsApproved || 0)} />
          <StatCard title="Payouts Paid" value={formatCurrency(summary.payoutsPaid || 0)} />
          <StatCard title="Held Liabilities" value={formatCurrency(summary.heldLiabilities || 0)} />
          <StatCard title="Net Written Premium" value={formatCurrency(summary.netWrittenPremium || 0)} />
          <StatCard title="Claim Ratio" value={summary.claimRatio ?? 0} />
          <StatCard title="Profit Loss" value={formatCurrency(summary.profitLoss || 0)} />
        </section>
        <div className="panel-grid two-up">
          <ObjectListTable title="Finance Summary" caption="Ledger-derived financial picture" payload={summaryRows} preferredKeys={['metric', 'value']} />
          <ObjectListTable title="Latest Snapshot" caption="Latest account balance snapshot totals" payload={snapshotRows} preferredKeys={['metric', 'value']} />
        </div>
        <div className="panel-grid two-up">
          <SparkBarList
            title="Capital Mix"
            caption="Current money shape across premium and payout buckets"
            rows={financeRankRows}
          />
          <SparkBarList
            title="Balance Snapshot"
            caption="Latest stored balance positions"
            rows={balanceRows}
          />
        </div>
      </div>
    </QueryState>
  );
}
