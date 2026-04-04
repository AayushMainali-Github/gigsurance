import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryState } from '../../components/QueryState';
import { ObjectListTable } from '../../components/ObjectListTable';
import { StatCard } from '../../components/StatCard';
import { DetailPanel } from '../../components/DetailPanel';
import { SparkBarList } from '../../components/SparkBarList';
import { api } from '../../lib/api/client';
import { formatCurrency, formatNumber } from '../../lib/utils/format';

export function ExposurePage() {
  const query = useQuery({ queryKey: ['underwriting-exposure'], queryFn: api.getExposure });
  const items = useMemo(() => query.data?.data?.map((item, index) => ({
    id: `${item.city}-${item.platformName}-${index}`,
    ...item
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

  const selected = items.find((item) => item.id === selectedId) || null;
  const activePolicies = items.reduce((sum, item) => sum + Number(item.activePolicies || 0), 0);
  const premiumVolume = items.reduce((sum, item) => sum + Number(item.weeklyPremiumInr || 0), 0);
  const avgPayoutReduction = items.length
    ? items.reduce((sum, item) => sum + Number(item.payoutReductionAvg || 0), 0) / items.length
    : 0;
  const premiumRows = items
    .slice()
    .sort((a, b) => Number(b.weeklyPremiumInr || 0) - Number(a.weeklyPremiumInr || 0))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      label: `${item.city} / ${item.platformName}`,
      value: Number(item.weeklyPremiumInr || 0),
      displayValue: formatCurrency(item.weeklyPremiumInr || 0)
    }));
  return (
    <QueryState isLoading={query.isLoading} error={query.error}>
      <div className="dashboard-stack">
        <section className="metric-grid">
          <StatCard title="Exposure Rows" value={formatNumber(items.length)} />
          <StatCard title="Active Policies" value={formatNumber(activePolicies)} />
          <StatCard title="Premium Volume" value={formatCurrency(premiumVolume)} tone="accent" />
          <StatCard title="Avg Payout Reduction" value={avgPayoutReduction.toFixed(2)} />
        </section>
        <div className="panel-grid two-up">
          <SparkBarList
            title="Premium Concentration"
            caption="Highest weekly premium clusters in the active book"
            rows={premiumRows}
          />
          <DetailPanel
            title="Exposure Detail"
            caption="Selected city and platform concentration"
            item={selected}
            fields={[
              { key: 'city', label: 'City' },
              { key: 'state', label: 'State' },
              { key: 'cityTier', label: 'Tier' },
              { key: 'platformName', label: 'Platform' },
              { key: 'activePolicies', label: 'Active Policies' },
              { key: 'weeklyPremiumInr', label: 'Weekly Premium', render: (item) => formatCurrency(item.weeklyPremiumInr || 0) },
              { key: 'payoutReductionAvg', label: 'Avg Payout Reduction' }
            ]}
          />
        </div>
        <ObjectListTable
          title="Exposure"
          caption="City and platform underwriting concentration"
          payload={items}
          preferredKeys={['city', 'platformName', 'activePolicies', 'weeklyPremiumInr', 'payoutReductionAvg', 'cityTier']}
          rowKey={(row) => row.id}
          selectedRowKey={selectedId}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      </div>
    </QueryState>
  );
}
