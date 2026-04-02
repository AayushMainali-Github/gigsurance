import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';

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

  return (
    <div className="page-grid">
      <section className="card panel">
        <div className="panel-header"><h2>Latest AQI</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>City</th><th>AQI</th><th>Category</th><th>Severity</th></tr></thead>
            <tbody>
              {latestItems.map((item) => (
                <tr key={`${item.city}-${item.tsUnix}`}><td>{item.city}</td><td>{item.aqi}</td><td>{item.category}</td><td>{item.severityScore}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card panel span-2">
        <div className="panel-header"><h2>Recent AQI Snapshots</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>City</th><th>Time</th><th>AQI</th><th>PM2.5</th><th>PM10</th></tr></thead>
            <tbody>
              {snapshots.map((item) => (
                <tr key={`${item.city}-${item.tsUnix}`}><td>{item.city}</td><td>{item.tsUnix}</td><td>{item.aqi}</td><td>{item.pm25}</td><td>{item.pm10}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
