import { useQuery } from '@tanstack/react-query';
import { StatCard } from '../../components/StatCard';
import { QueryState } from '../../components/QueryState';
import { ObjectListTable } from '../../components/ObjectListTable';
import { SparkBarList } from '../../components/SparkBarList';
import { api } from '../../lib/api/client';
import { formatCurrency, formatNumber } from '../../lib/utils/format';

function getValue(data, keys, fallback = 0) {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
}

export function OverviewPage() {
  const dashboardQuery = useQuery({ queryKey: ['admin-dashboard'], queryFn: api.getAdminDashboard });
  const financeQuery = useQuery({ queryKey: ['finance-dashboard'], queryFn: api.getFinanceDashboard });
  const exposureQuery = useQuery({ queryKey: ['admin-exposure'], queryFn: api.getExposure });
  const reviewQuery = useQuery({ queryKey: ['review-queue'], queryFn: api.getReviewQueue });

  const isLoading = dashboardQuery.isLoading || financeQuery.isLoading || exposureQuery.isLoading || reviewQuery.isLoading;
  const error = dashboardQuery.error || financeQuery.error || exposureQuery.error || reviewQuery.error;
  const dashboard = dashboardQuery.data?.data || {};
  const finance = financeQuery.data?.data || {};
  const summary = finance.summary || finance;
  const metrics = finance.metrics || dashboard;
  const exposure = exposureQuery.data?.data || [];
  const reviewQueue = reviewQuery.data?.data?.items || [];
  const healthRows = [
    { metric: 'Gross Premiums Billed', value: formatCurrency(getValue(summary, ['grossPremiumsBilled'])) },
    { metric: 'Premiums Collected', value: formatCurrency(getValue(summary, ['premiumsCollected'])) },
    { metric: 'Gross Payouts Approved', value: formatCurrency(getValue(summary, ['grossPayoutsApproved'])) },
    { metric: 'Payouts Paid', value: formatCurrency(getValue(summary, ['payoutsPaid'])) },
    { metric: 'Held Liabilities', value: formatCurrency(getValue(summary, ['heldLiabilities'])) },
    { metric: 'Net Written Premium', value: formatCurrency(getValue(summary, ['netWrittenPremium'])) }
  ];
  const opsRows = [
    { metric: 'Insured Users', value: formatNumber(getValue(metrics, ['totalInsuredUsers'])) },
    { metric: 'Active Policies', value: formatNumber(getValue(metrics, ['activePolicies'])) },
    { metric: 'Flagged Cases', value: formatNumber(getValue(metrics, ['flaggedCaseCount'])) },
    { metric: 'Override Count', value: formatNumber(getValue(metrics, ['overrideCount'])) },
    { metric: 'Overdue Invoices', value: formatNumber(getValue(metrics, ['overdueInvoices'])) },
    { metric: 'Claim Ratio', value: getValue(metrics, ['claimRatio'], 0) }
  ];
  const exposureRows = exposure.slice(0, 6).map((item, index) => ({
    id: `${item.city}-${item.platformName}-${index}`,
    label: `${item.city} / ${item.platformName}`,
    value: Number(item.weeklyPremiumInr || 0),
    displayValue: formatCurrency(item.weeklyPremiumInr || 0)
  }));
  const reviewRows = reviewQueue.slice(0, 6).map((item, index) => ({
    id: item._id || index,
    label: `${item.source} / ${item.status}`,
    value: Number(item.score || 0),
    displayValue: `${item.score ?? 0}`
  }));

  return (
    <QueryState isLoading={isLoading} error={error}>
      <div className="dashboard-stack">
        <section className="hero card">
          <div>
            <span className="eyebrow">Admin Finance</span>
            <h2>Company-side monitoring with the exact monitor shell</h2>
            <p>Premium pool, payout liability, insured users, review queue, and company exposure in one workspace.</p>
          </div>
          <div className="hero-side">
            <div>
              <span>Insured users</span>
              <strong>{formatNumber(getValue(metrics, ['totalInsuredUsers', 'insuredUsers', 'userCount']))}</strong>
            </div>
            <div>
              <span>Claim ratio</span>
              <strong>{getValue(metrics, ['claimRatio'], 0)}</strong>
            </div>
          </div>
        </section>

        <section className="metric-grid">
          <StatCard title="Insured Users" value={formatNumber(getValue(metrics, ['totalInsuredUsers', 'insuredUsers']))} />
          <StatCard title="Active Policies" value={formatNumber(getValue(metrics, ['activePolicies']))} />
          <StatCard title="Premium Billed" value={formatCurrency(getValue(metrics, ['premiumBilledThisWeekInr', 'premiumBilledThisWeek', 'grossPremiumsBilled']))} tone="accent" />
          <StatCard title="Payout Liability" value={formatCurrency(getValue(metrics, ['payoutLiabilityTodayInr', 'payoutLiabilityToday', 'heldLiabilities']))} />
          <StatCard title="Payout Paid" value={formatCurrency(getValue(metrics, ['payoutPaidTodayInr', 'payoutPaidToday', 'payoutsPaid']))} />
          <StatCard title="Daily Margin" value={formatCurrency(getValue(metrics, ['netDailyMarginInr', 'netDailyMargin', 'profitLoss']))} />
          <StatCard title="Flagged Cases" value={formatNumber(getValue(metrics, ['flaggedCaseCount']))} />
          <StatCard title="Overdue Invoices" value={formatNumber(getValue(metrics, ['overdueInvoices']))} />
        </section>

        <div className="panel-grid two-up">
          <ObjectListTable
            title="Financial Health"
            caption="Current balance and ledger summary"
            payload={healthRows}
            preferredKeys={['metric', 'value']}
          />
          <ObjectListTable
            title="Operating Watchlist"
            caption="Current admin-side company metrics"
            payload={opsRows}
            preferredKeys={['metric', 'value']}
          />
        </div>
        <div className="panel-grid two-up">
          <SparkBarList
            title="Exposure Rank"
            caption="Top active premium concentration by city and platform"
            rows={exposureRows}
          />
          <SparkBarList
            title="Review Severity"
            caption="Highest-scoring open review cases"
            rows={reviewRows}
          />
        </div>
      </div>
    </QueryState>
  );
}
