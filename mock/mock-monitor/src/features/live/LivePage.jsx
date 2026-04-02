import { useMemo } from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';
import { formatNumber } from '../../lib/utils/format';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';
import { SparkBarList } from '../../components/SparkBarList';

function statusTone(status) {
  if (status === 'in_transit') return 'status-live';
  if (status === 'recently_delivered') return 'status-complete';
  return 'status-pending';
}

function formatStatus(status) {
  return String(status || '').replaceAll('_', ' ');
}

function buildQuery({ city, platformName, state }) {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (platformName) params.set('platformName', platformName);
  if (state) params.set('state', state);
  params.set('windowMs', String(2 * 60 * 60 * 1000));
  return params.toString();
}

export function LivePage() {
  const { city, platformName, state } = useMonitorFilters();
  const baseQuery = useMemo(() => buildQuery({ city, platformName, state }), [city, platformName, state]);
  const ordersQuery = useMemo(() => {
    const params = new URLSearchParams(baseQuery);
    params.set('limit', '40');
    return params.toString();
  }, [baseQuery]);

  const metrics = useQuery({
    queryKey: ['live-metrics', baseQuery],
    queryFn: () => api.getLiveMetrics(baseQuery),
    refetchInterval: 30000
  });
  const orders = useQuery({
    queryKey: ['live-orders', ordersQuery],
    queryFn: () => api.getLiveOrders(ordersQuery),
    refetchInterval: 15000
  });

  const summary = metrics.data?.data?.summary || {};
  const cityBreakdown = metrics.data?.data?.cityBreakdown || [];
  const platformBreakdown = metrics.data?.data?.platformBreakdown || [];
  const items = orders.data?.data || [];
  const nowUnix = orders.data?.nowUnix || metrics.data?.nowUnix || Date.now();

  return (
    <div className="dashboard-stack">
      <section className="hero card">
        <div>
          <span className="eyebrow">Live Operations</span>
          <h2>Inferred order flow from the rolling delivery window</h2>
          <p>Active trips, recent completions, and hotspot breakdowns update on a polling cadence against the live mock API.</p>
        </div>
        <div className="hero-side">
          <div><span>Polling</span><strong>15s / 30s</strong></div>
          <div><span>Snapshot Time</span><strong>{dayjs(nowUnix).format('DD MMM HH:mm:ss')}</strong></div>
        </div>
      </section>

      <section className="metric-grid">
        <StatCard title="Active Orders" value={formatNumber(summary.activeOrders)} subtitle="Currently inferred in transit" tone="accent" />
        <StatCard title="Recent Deliveries" value={formatNumber(summary.recentlyDelivered)} subtitle="Completed inside the rolling window" />
        <StatCard title="Recent Pickups" value={formatNumber(summary.recentPickups)} subtitle="Started but not yet strongly in transit" />
        <StatCard title="Avg Live Pay" value={Number(summary.avgPay || 0).toFixed(2)} subtitle="Average payout of live-window gigs" />
      </section>

      <section className="page-grid">
        <SparkBarList title="Live Orders by City" items={cityBreakdown} valueKey="liveOrders" labelKey="_id" formatter={formatNumber} />
        <SparkBarList title="Live Orders by Platform" items={platformBreakdown} valueKey="liveOrders" labelKey="_id" formatter={formatNumber} />
        <section className="card panel">
          <div className="panel-header">
            <h2>Operational Notes</h2>
            <span className="panel-caption">Derived from embedded gig history</span>
          </div>
          <div className="live-notes">
            <div className="live-note">
              <strong>{Number(summary.avgDuration || 0).toFixed(2)} min</strong>
              <span>Average duration in the active window</span>
            </div>
            <div className="live-note">
              <strong>{formatNumber(items.length)}</strong>
              <span>Visible live orders in the current page slice</span>
            </div>
            <div className="live-note">
              <strong>{city || 'All cities'}</strong>
              <span>Current city filter</span>
            </div>
          </div>
        </section>
        <PanelTable
          title="Live Order Feed"
          caption="Most recent active or recently completed gigs"
          rows={items}
          rowKey={(row) => row.gig.gigId}
          columns={[
            { key: 'gig', label: 'Gig', render: (row) => row.gig.gigId },
            { key: 'status', label: 'Status', render: (row) => <span className={`status-pill ${statusTone(row.liveStatus)}`}>{formatStatus(row.liveStatus)}</span> },
            { key: 'platform', label: 'Platform', render: (row) => row.platformName },
            { key: 'driver', label: 'Driver', render: (row) => row.platformDriverId },
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'start', label: 'Started', render: (row) => dayjs(row.gig.startTimeUnix).format('DD MMM HH:mm') },
            { key: 'eta', label: 'ETA', render: (row) => `${row.etaMinutes} min` },
            { key: 'pay', label: 'Pay', render: (row) => row.gig.amountPaid?.toFixed?.(2) ?? Number(row.gig.amountPaid || 0).toFixed(2) }
          ]}
        />
        <PanelTable
          title="Recent Completion Queue"
          caption="Trips that just closed out"
          rows={items.filter((row) => row.liveStatus === 'recently_delivered').slice(0, 12)}
          rowKey={(row) => `${row.gig.gigId}-recent`}
          columns={[
            { key: 'platform', label: 'Platform', render: (row) => row.platformName },
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'driver', label: 'Driver', render: (row) => row.platformDriverId },
            { key: 'delivered', label: 'Delivered', render: (row) => dayjs(row.gig.reachedTimeUnix).format('DD MMM HH:mm') },
            { key: 'duration', label: 'Duration', render: (row) => `${row.gig.durationMinutes} min` }
          ]}
        />
      </section>
    </div>
  );
}
