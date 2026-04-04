import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';
import { formatNumber } from '../../lib/utils/format';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';
import { SparkBarList } from '../../components/SparkBarList';

export function PlatformsPage() {
  const { platformName: filteredPlatform } = useMonitorFilters();
  const platformsQuery = useQuery({ queryKey: ['platforms-page'], queryFn: api.getPlatforms });
  const platforms = platformsQuery.data?.data || [];
  const activePlatform = filteredPlatform || platforms[0];
  const summaryQuery = useQuery({ queryKey: ['platform-summary', activePlatform], queryFn: () => api.getDeliveryPlatformSummary(activePlatform), enabled: Boolean(activePlatform) });
  const summary = summaryQuery.data?.data;
  const gigStats = summary?.gigStats;

  return (
    <div className="dashboard-stack page-surface">
      <section className="hero card">
        <div>
          <span className="eyebrow">Platform Monitoring</span>
          <h2>Platform footprint, city spread, and performance summary</h2>
          <p>Compare delivery platforms through driver presence, city coverage, and the latest gig-performance aggregates.</p>
        </div>
        <div className="hero-side">
          <div><span>Platforms</span><strong>{formatNumber(platforms.length)}</strong></div>
          <div><span>Selected Platform</span><strong>{activePlatform || 'None'}</strong></div>
        </div>
      </section>
      <section className="metric-grid">
        <StatCard title="Platforms" value={formatNumber(platforms.length)} subtitle="Known delivery platforms" tone="accent" />
        <StatCard title="Selected Platform" value={activePlatform || '-'} subtitle="Current platform scope" />
        <StatCard title="Drivers" value={formatNumber(summary?.drivers || 0)} subtitle="Driver docs for selected platform" />
        <StatCard title="Tracked Gigs" value={formatNumber(gigStats?.gigs || 0)} subtitle="Gig history volume for selected platform" />
      </section>

      <section className="page-grid">
        <SparkBarList title="Platform Directory" items={platforms.map((item) => ({ label: item, count: item === activePlatform ? 1 : 0.6 }))} valueKey="count" labelKey="label" formatter={() => ''} />
        <PanelTable
          title="Top Cities for Platform"
          caption={activePlatform ? `Largest city footprint for ${activePlatform}` : 'Select a platform'}
          rows={summary?.cityBreakdown || []}
          rowKey={(row) => row._id}
          columns={[
            { key: 'city', label: 'City', render: (row) => row._id },
            { key: 'drivers', label: 'Drivers', render: (row) => formatNumber(row.drivers) }
          ]}
        />
        <PanelTable
          title="Platform Metrics"
          caption={activePlatform ? `Performance summary for ${activePlatform}` : 'Select a platform'}
          rows={gigStats ? [gigStats] : []}
          rowKey={(_, index) => index}
          columns={[
            { key: 'gigs', label: 'Gigs', render: (row) => formatNumber(row.gigs) },
            { key: 'pay', label: 'Avg Pay', render: (row) => Number(row.avgAmountPaid || 0).toFixed(2) },
            { key: 'duration', label: 'Avg Duration', render: (row) => Number(row.avgDurationMinutes || 0).toFixed(2) }
          ]}
        />
      </section>
    </div>
  );
}
