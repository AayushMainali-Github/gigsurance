import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { formatNumber } from '../../lib/utils/format';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';
import { SparkBarList } from '../../components/SparkBarList';

function avgSeverity(items, key) {
  if (!items.length) return 0;
  return (items.reduce((sum, item) => sum + Number(item[key] || 0), 0) / items.length).toFixed(3);
}

export function OverviewPage() {
  const overviewQuery = useQuery({ queryKey: ['overview'], queryFn: api.getOverview });
  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.getCities });
  const weatherQuery = useQuery({ queryKey: ['weather-latest'], queryFn: () => api.getWeatherLatest() });
  const aqiQuery = useQuery({ queryKey: ['aqi-latest'], queryFn: () => api.getAqiLatest() });
  const summaryQuery = useQuery({ queryKey: ['delivery-summary'], queryFn: () => api.getDeliverySummary() });

  const overview = overviewQuery.data?.data;
  const cities = citiesQuery.data?.data || [];
  const weather = weatherQuery.data?.data || [];
  const aqi = aqiQuery.data?.data || [];
  const driverCounts = summaryQuery.data?.data?.driverCounts || [];
  const historyStats = summaryQuery.data?.data?.historyStats || [];
  const topCities = cities.slice(0, 8);
  const worstWeather = weather.slice(0, 6);
  const worstAqi = aqi.slice(0, 6);
  const tierMix = ['tier1', 'tier2', 'tier3'].map((tier) => ({
    tier,
    drivers: cities.filter((item) => item.cityTier === tier).reduce((sum, item) => sum + item.drivers, 0)
  }));

  return (
    <div className="dashboard-stack">
      <section className="hero card">
        <div>
          <span className="eyebrow">Network Snapshot</span>
          <h2>System-wide operational posture</h2>
          <p>Fast view of fleet size, environmental pressure, and platform distribution across the seeded mock network.</p>
        </div>
        <div className="hero-side">
          <div><span>Avg Weather Severity</span><strong>{avgSeverity(weather, 'weatherSeverityScore')}</strong></div>
          <div><span>Avg AQI Severity</span><strong>{avgSeverity(aqi, 'severityScore')}</strong></div>
        </div>
      </section>

      <section className="metric-grid">
        <StatCard title="Drivers" value={formatNumber(overview?.drivers)} subtitle="Total driver docs in deliverydrivers" tone="accent" />
        <StatCard title="Tracked Cities" value={formatNumber(citiesQuery.data?.count)} subtitle="Cities with current fleet presence" />
        <StatCard title="Weather Snapshots" value={formatNumber(overview?.weatherSnapshots)} subtitle="Stored weather records" />
        <StatCard title="AQI Snapshots" value={formatNumber(overview?.aqiSnapshots)} subtitle="Stored AQI records" />
      </section>

      <section className="page-grid">
        <SparkBarList title="Platform Share" items={driverCounts} valueKey="drivers" labelKey="_id" formatter={formatNumber} />
        <SparkBarList title="Tier Distribution" items={tierMix} valueKey="drivers" labelKey="tier" formatter={formatNumber} />
        <PanelTable
          title="Top Cities"
          caption="Largest fleet footprints"
          rows={topCities}
          rowKey={(row) => row.city}
          columns={[
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'state', label: 'State', render: (row) => row.state },
            { key: 'tier', label: 'Tier', render: (row) => row.cityTier },
            { key: 'drivers', label: 'Drivers', render: (row) => formatNumber(row.drivers) }
          ]}
        />
        <PanelTable
          title="Worst Weather Right Now"
          caption="Highest severity snapshots"
          rows={worstWeather}
          rowKey={(row) => `${row.city}-${row.tsUnix}`}
          columns={[
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'condition', label: 'Condition', render: (row) => row.conditionMain },
            { key: 'temp', label: 'Temp', render: (row) => `${row.tempC} C` },
            { key: 'severity', label: 'Severity', render: (row) => row.weatherSeverityScore }
          ]}
        />
        <PanelTable
          title="Worst AQI Right Now"
          caption="Most polluted cities in latest snapshot"
          rows={worstAqi}
          rowKey={(row) => `${row.city}-${row.tsUnix}`}
          columns={[
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'aqi', label: 'AQI', render: (row) => row.aqi },
            { key: 'category', label: 'Category', render: (row) => row.category },
            { key: 'severity', label: 'Severity', render: (row) => row.severityScore }
          ]}
        />
        <PanelTable
          title="Gig Economics"
          caption="Average performance by platform"
          rows={historyStats}
          rowKey={(row) => row._id}
          columns={[
            { key: 'platform', label: 'Platform', render: (row) => row._id },
            { key: 'gigs', label: 'Gigs', render: (row) => formatNumber(row.gigs) },
            { key: 'pay', label: 'Avg Pay', render: (row) => Number(row.avgAmountPaid || 0).toFixed(2) },
            { key: 'duration', label: 'Avg Duration', render: (row) => Number(row.avgDurationMinutes || 0).toFixed(2) }
          ]}
        />
      </section>
    </div>
  );
}
