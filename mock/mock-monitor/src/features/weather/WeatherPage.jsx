import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';

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

  return (
    <div className="page-grid">
      <section className="card panel">
        <div className="panel-header"><h2>Latest Weather</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>City</th><th>Condition</th><th>Temp</th><th>Severity</th></tr></thead>
            <tbody>
              {latestItems.map((item) => (
                <tr key={`${item.city}-${item.tsUnix}`}><td>{item.city}</td><td>{item.conditionMain}</td><td>{item.tempC}</td><td>{item.weatherSeverityScore}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card panel span-2">
        <div className="panel-header"><h2>Recent Weather Snapshots</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>City</th><th>Time</th><th>Rain</th><th>Wind</th><th>Heat Risk</th></tr></thead>
            <tbody>
              {snapshots.map((item) => (
                <tr key={`${item.city}-${item.tsUnix}`}><td>{item.city}</td><td>{item.tsUnix}</td><td>{item.rainMm}</td><td>{item.windKph}</td><td>{item.heatRisk}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
