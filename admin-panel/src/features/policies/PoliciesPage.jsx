import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryState } from '../../components/QueryState';
import { ObjectListTable } from '../../components/ObjectListTable';
import { StatCard } from '../../components/StatCard';
import { DetailPanel } from '../../components/DetailPanel';
import { SparkBarList } from '../../components/SparkBarList';
import { api } from '../../lib/api/client';
import { formatCurrency, formatNumber } from '../../lib/utils/format';

export function PoliciesPage() {
  const query = useQuery({ queryKey: ['admin-policies'], queryFn: api.getPolicies });
  const items = useMemo(() => query.data?.data?.items?.map((policy) => ({
    id: policy._id,
    status: policy.status,
    currentWeeklyPremiumInr: policy.currentWeeklyPremiumInr,
    noClaimWeeks: policy.noClaimWeeks,
    fraudMultiplier: policy.fraudMultiplier,
    payoutReductionMultiplier: policy.payoutReductionMultiplier,
    startedAt: policy.startedAt,
    city: policy.linkedWorkerId?.city,
    platformName: policy.linkedWorkerId?.platformName,
    platformDriverId: policy.linkedWorkerId?.platformDriverId
  })) || [], [query.data]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);
  const activeCount = items.filter((item) => item.status === 'active').length;
  const pausedCount = items.filter((item) => item.status === 'paused').length;
  const cancelledCount = items.filter((item) => item.status === 'cancelled').length;
  const premiumBook = items.reduce((sum, item) => sum + Number(item.currentWeeklyPremiumInr || 0), 0);
  const statusRows = [
    { status: 'Active', count: activeCount },
    { status: 'Paused', count: pausedCount },
    { status: 'Cancelled', count: cancelledCount }
  ];
  const selected = items.find((item) => item.id === selectedId) || null;
  const premiumRows = items
    .slice()
    .sort((a, b) => Number(b.currentWeeklyPremiumInr || 0) - Number(a.currentWeeklyPremiumInr || 0))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      label: `${item.platformName || '-'} / ${item.platformDriverId || '-'}`,
      value: Number(item.currentWeeklyPremiumInr || 0),
      displayValue: formatCurrency(item.currentWeeklyPremiumInr || 0)
    }));
  return (
    <QueryState isLoading={query.isLoading} error={query.error}>
      <div className="dashboard-stack">
        <section className="metric-grid">
          <StatCard title="Policies" value={formatNumber(items.length)} />
          <StatCard title="Active Policies" value={formatNumber(activeCount)} />
          <StatCard title="Paused Policies" value={formatNumber(pausedCount)} />
          <StatCard title="Cancelled Policies" value={formatNumber(cancelledCount)} />
          <StatCard title="Weekly Premium Book" value={formatCurrency(premiumBook)} tone="accent" />
        </section>
        <div className="panel-grid two-up">
          <ObjectListTable title="Policy Status Mix" caption="Coverage lifecycle posture" payload={statusRows} preferredKeys={['status', 'count']} />
          <DetailPanel
            title="Policy Detail"
            caption="Lead policy in the current slice"
            item={selected}
            fields={[
              { key: 'platformName', label: 'Platform' },
              { key: 'platformDriverId', label: 'Worker ID' },
              { key: 'status', label: 'Status' },
              { key: 'currentWeeklyPremiumInr', label: 'Weekly Premium', render: (item) => formatCurrency(item.currentWeeklyPremiumInr || 0) },
              { key: 'noClaimWeeks', label: 'No-Claim Weeks' },
              { key: 'fraudMultiplier', label: 'Fraud Multiplier' },
              { key: 'payoutReductionMultiplier', label: 'Payout Reduction' }
            ]}
          />
        </div>
        <div className="panel-grid">
          <ObjectListTable
            title="Policies"
            caption="Coverage state and current weekly premium"
            payload={items}
            preferredKeys={['platformName', 'platformDriverId', 'status', 'currentWeeklyPremiumInr', 'noClaimWeeks', 'startedAt']}
            rowKey={(row) => row.id}
            selectedRowKey={selectedId}
            onRowClick={(row) => setSelectedId(row.id)}
          />
        </div>
        <div className="panel-grid two-up">
          <SparkBarList
            title="Premium Leaders"
            caption="Highest weekly premium rows in the active policy book"
            rows={premiumRows}
          />
          <DetailPanel
            title="Policy Multipliers"
            caption="Selected policy pricing posture"
            item={selected}
            fields={[
              { key: 'platformName', label: 'Platform' },
              { key: 'city', label: 'City' },
              { key: 'currentWeeklyPremiumInr', label: 'Weekly Premium', render: (item) => formatCurrency(item.currentWeeklyPremiumInr || 0) },
              { key: 'fraudMultiplier', label: 'Fraud Multiplier' },
              { key: 'payoutReductionMultiplier', label: 'Payout Reduction' },
              { key: 'noClaimWeeks', label: 'No-Claim Weeks' }
            ]}
          />
        </div>
      </div>
    </QueryState>
  );
}
