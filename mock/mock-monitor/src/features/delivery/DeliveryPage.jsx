import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';
import { formatNumber } from '../../lib/utils/format';
import { formatLabel } from '../../lib/utils/format';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';
import { SparkBarList } from '../../components/SparkBarList';

export function DeliveryPage() {
  const { city, platformName, state } = useMonitorFilters();
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (platformName) params.set('platformName', platformName);
    if (state) params.set('state', state);
    params.set('limit', '20');
    params.set('sortBy', 'joinedAt');
    return params.toString();
  }, [city, platformName, state]);

  const driversQuery = useQuery({ queryKey: ['delivery-drivers', query], queryFn: () => api.getDeliveryDrivers(query) });
  const summaryQuery = useQuery({ queryKey: ['delivery-summary', query], queryFn: () => api.getDeliverySummary(query) });

  const drivers = driversQuery.data?.data || [];
  const totalDrivers = driversQuery.data?.total || 0;
  const driverCounts = summaryQuery.data?.data?.driverCounts || [];
  const historyStats = summaryQuery.data?.data?.historyStats || [];
  const totalGigs = historyStats.reduce((sum, item) => sum + Number(item.gigs || 0), 0);
  const weightedPay = historyStats.reduce((sum, item) => sum + Number(item.avgAmountPaid || 0) * Number(item.gigs || 0), 0);
  const weightedDuration = historyStats.reduce((sum, item) => sum + Number(item.avgDurationMinutes || 0) * Number(item.gigs || 0), 0);

  return (
    <div className="dashboard-stack page-surface">
      <section className="hero card">
        <div>
          <span className="eyebrow">Delivery Operations</span>
          <h2>Driver volume and payout quality in one view</h2>
          <p>Track the current delivery slice with clearer emphasis on platform mix, payout averages, and the newest driver records.</p>
        </div>
        <div className="hero-side">
          <div><span>Platforms Visible</span><strong>{driverCounts.length}</strong></div>
          <div><span>Result Scope</span><strong>{formatNumber(totalDrivers)}</strong></div>
        </div>
      </section>
      <section className="metric-grid">
        <StatCard title="Matching Drivers" value={formatNumber(totalDrivers)} subtitle="Filtered active driver base" tone="accent" />
        <StatCard title="Tracked Gigs" value={formatNumber(totalGigs)} subtitle="Across the current result slice" />
        <StatCard title="Avg Payout" value={totalGigs ? (weightedPay / totalGigs).toFixed(2) : '0.00'} subtitle="Weighted by platform gig volume" />
        <StatCard title="Avg Duration" value={totalGigs ? (weightedDuration / totalGigs).toFixed(2) : '0.00'} subtitle="Weighted delivery duration" />
      </section>

      <section className="page-grid">
        <SparkBarList title="Driver Counts by Platform" items={driverCounts} valueKey="drivers" labelKey="_id" formatter={formatNumber} />
        <PanelTable
          title="Gig Metrics by Platform"
          caption="Pay and duration performance"
          rows={historyStats}
          rowKey={(row) => row._id}
          columns={[
            { key: 'platform', label: 'Platform', render: (row) => row._id },
            { key: 'gigs', label: 'Gigs', render: (row) => formatNumber(row.gigs) },
            { key: 'pay', label: 'Avg Pay', render: (row) => Number(row.avgAmountPaid || 0).toFixed(2) },
            { key: 'duration', label: 'Avg Duration', render: (row) => Number(row.avgDurationMinutes || 0).toFixed(2) }
          ]}
        />
        <PanelTable
          title="Driver Slice"
          caption="Most recent joined drivers in the current filter state"
          rows={drivers}
          rowKey={(row) => `${row.platformName}-${row.platformDriverId}`}
          columns={[
            { key: 'driver', label: 'Driver', render: (row) => row.platformDriverId },
            { key: 'platform', label: 'Platform', render: (row) => row.platformName },
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'tier', label: 'Tier', render: (row) => formatLabel(row.cityTier) },
            { key: 'archetype', label: 'Archetype', render: (row) => row.driverProfile?.archetype },
            { key: 'sensitivity', label: 'Sensitivity', render: (row) => row.driverProfile?.weatherSensitivity }
          ]}
        />
      </section>
    </div>
  );
}
