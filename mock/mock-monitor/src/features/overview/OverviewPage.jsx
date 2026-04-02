import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { formatNumber } from '../../lib/utils/format';

function MetricCard({ title, value, subtitle }) {
  return (
    <article className="metric-card card">
      <span className="metric-title">{title}</span>
      <strong className="metric-value">{value}</strong>
      <span className="metric-subtitle">{subtitle}</span>
    </article>
  );
}

export function OverviewPage() {
  const overviewQuery = useQuery({ queryKey: ['overview'], queryFn: api.getOverview });
  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.getCities });
  const weatherQuery = useQuery({ queryKey: ['weather-latest'], queryFn: () => api.getWeatherLatest() });
  const aqiQuery = useQuery({ queryKey: ['aqi-latest'], queryFn: () => api.getAqiLatest() });
  const summaryQuery = useQuery({ queryKey: ['delivery-summary'], queryFn: () => api.getDeliverySummary() });

  const overview = overviewQuery.data?.data;
  const topCities = (citiesQuery.data?.data || []).slice(0, 8);
  const worstWeather = (weatherQuery.data?.data || []).slice(0, 6);
  const worstAqi = (aqiQuery.data?.data || []).slice(0, 6);
  const driverCounts = summaryQuery.data?.data?.driverCounts || [];

  return (
    <div className="page-grid">
      <section className="metric-grid">
        <MetricCard title="Drivers" value={formatNumber(overview?.drivers)} subtitle="Total seeded driver documents" />
        <MetricCard title="Weather Snapshots" value={formatNumber(overview?.weatherSnapshots)} subtitle="Stored environmental readings" />
        <MetricCard title="AQI Snapshots" value={formatNumber(overview?.aqiSnapshots)} subtitle="Stored AQI readings" />
        <MetricCard title="Tracked Cities" value={formatNumber(citiesQuery.data?.count)} subtitle="Cities with driver presence" />
      </section>

      <section className="card panel">
        <div className="panel-header"><h2>Top Cities</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>City</th><th>State</th><th>Tier</th><th>Drivers</th></tr></thead>
            <tbody>
              {topCities.map((item) => (
                <tr key={item.city}><td>{item.city}</td><td>{item.state}</td><td>{item.cityTier}</td><td>{formatNumber(item.drivers)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card panel">
        <div className="panel-header"><h2>Platform Mix</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Platform</th><th>Drivers</th></tr></thead>
            <tbody>
              {driverCounts.map((item) => (
                <tr key={item._id}><td>{item._id}</td><td>{formatNumber(item.drivers)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card panel">
        <div className="panel-header"><h2>Worst Weather Now</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>City</th><th>Condition</th><th>Severity</th></tr></thead>
            <tbody>
              {worstWeather.map((item) => (
                <tr key={`${item.city}-${item.tsUnix}`}><td>{item.city}</td><td>{item.conditionMain}</td><td>{item.weatherSeverityScore}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card panel">
        <div className="panel-header"><h2>Worst AQI Now</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>City</th><th>AQI</th><th>Category</th></tr></thead>
            <tbody>
              {worstAqi.map((item) => (
                <tr key={`${item.city}-${item.tsUnix}`}><td>{item.city}</td><td>{item.aqi}</td><td>{item.category}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
