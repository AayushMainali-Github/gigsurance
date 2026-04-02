import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';

export function WeatherPage() {
  const { city, state } = useMonitorFilters();
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (state) params.set('state', state);
    params.set('limit', '20');
    params.set('sortBy', 'tsUnix');
    return params.toString();
  }, [city, state]);

  const latestQuery = useQuery({ queryKey: ['weather-latest-page', city], queryFn: () => api.getWeatherLatest(city || undefined) });
  const snapshotsQuery = useQuery({ queryKey: ['weather-snapshots', query], queryFn: () => api.getWeatherSnapshots(query) });
  const latestItems = Array.isArray(latestQuery.data?.data) ? latestQuery.data.data.slice(0, 10) : latestQuery.data?.data ? [latestQuery.data.data] : [];
  const snapshots = snapshotsQuery.data?.data || [];
  const avgSeverity = latestItems.length ? (latestItems.reduce((sum, item) => sum + Number(item.weatherSeverityScore || 0), 0) / latestItems.length).toFixed(3) : '0.000';
  const avgRain = snapshots.length ? (snapshots.reduce((sum, item) => sum + Number(item.rainMm || 0), 0) / snapshots.length).toFixed(2) : '0.00';

  return (
    <div className="dashboard-stack">
      <section className="metric-grid">
        <StatCard title="Latest Cities Visible" value={String(latestItems.length)} subtitle="Latest weather cards in current scope" tone="accent" />
        <StatCard title="Avg Severity" value={avgSeverity} subtitle="Across the latest visible cities" />
        <StatCard title="Avg Rain" value={avgRain} subtitle="Across recent snapshot rows" />
        <StatCard title="Recent Rows" value={String(snapshots.length)} subtitle="Weather rows in the current list" />
      </section>

      <section className="page-grid">
        <PanelTable
          title="Latest Weather"
          caption="Most recent city readings"
          rows={latestItems}
          rowKey={(row) => `${row.city}-${row.tsUnix}`}
          columns={[
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'condition', label: 'Condition', render: (row) => row.conditionMain },
            { key: 'temp', label: 'Temp', render: (row) => `${row.tempC} C` },
            { key: 'severity', label: 'Severity', render: (row) => row.weatherSeverityScore }
          ]}
        />
        <PanelTable
          title="Recent Weather Snapshots"
          caption="Recent operational weather rows"
          rows={snapshots}
          rowKey={(row) => `${row.city}-${row.tsUnix}`}
          columns={[
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'time', label: 'Time', render: (row) => row.tsUnix },
            { key: 'rain', label: 'Rain', render: (row) => row.rainMm },
            { key: 'wind', label: 'Wind', render: (row) => row.windKph },
            { key: 'heat', label: 'Heat Risk', render: (row) => row.heatRisk }
          ]}
        />
      </section>
    </div>
  );
}
