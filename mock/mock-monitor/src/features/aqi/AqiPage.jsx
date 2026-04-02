import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';

export function AqiPage() {
  const { city, state } = useMonitorFilters();
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (state) params.set('state', state);
    params.set('limit', '20');
    params.set('sortBy', 'tsUnix');
    return params.toString();
  }, [city, state]);

  const latestQuery = useQuery({ queryKey: ['aqi-latest-page', city], queryFn: () => api.getAqiLatest(city || undefined) });
  const snapshotsQuery = useQuery({ queryKey: ['aqi-snapshots', query], queryFn: () => api.getAqiSnapshots(query) });
  const latestItems = Array.isArray(latestQuery.data?.data) ? latestQuery.data.data.slice(0, 10) : latestQuery.data?.data ? [latestQuery.data.data] : [];
  const snapshots = snapshotsQuery.data?.data || [];
  const avgAqi = latestItems.length ? (latestItems.reduce((sum, item) => sum + Number(item.aqi || 0), 0) / latestItems.length).toFixed(0) : '0';
  const severeCount = latestItems.filter((item) => item.category === 'severe').length;

  return (
    <div className="dashboard-stack">
      <section className="metric-grid">
        <StatCard title="Latest Cities Visible" value={String(latestItems.length)} subtitle="Latest AQI cards in current scope" tone="accent" />
        <StatCard title="Average AQI" value={avgAqi} subtitle="Across the latest visible cities" />
        <StatCard title="Severe Cities" value={String(severeCount)} subtitle="Cities currently in severe category" />
        <StatCard title="Recent Rows" value={String(snapshots.length)} subtitle="AQI rows in the current list" />
      </section>

      <section className="page-grid">
        <PanelTable
          title="Latest AQI"
          caption="Most recent city pollution readings"
          rows={latestItems}
          rowKey={(row) => `${row.city}-${row.tsUnix}`}
          columns={[
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'aqi', label: 'AQI', render: (row) => row.aqi },
            { key: 'category', label: 'Category', render: (row) => row.category },
            { key: 'severity', label: 'Severity', render: (row) => row.severityScore }
          ]}
        />
        <PanelTable
          title="Recent AQI Snapshots"
          caption="Recent operational AQI rows"
          rows={snapshots}
          rowKey={(row) => `${row.city}-${row.tsUnix}`}
          columns={[
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'time', label: 'Time', render: (row) => row.tsUnix },
            { key: 'aqi', label: 'AQI', render: (row) => row.aqi },
            { key: 'pm25', label: 'PM2.5', render: (row) => row.pm25 },
            { key: 'pm10', label: 'PM10', render: (row) => row.pm10 }
          ]}
        />
      </section>
    </div>
  );
}
