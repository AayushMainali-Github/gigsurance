import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';
import { formatNumber } from '../../lib/utils/format';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';
import { SparkBarList } from '../../components/SparkBarList';

function buildQuery({ city, platformName, state }) {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (platformName) params.set('platformName', platformName);
  if (state) params.set('state', state);
  params.set('days', '60');
  return params.toString();
}

export function AnalyticsPage() {
  const { city, platformName, state } = useMonitorFilters();
  const baseQuery = useMemo(() => buildQuery({ city, platformName, state }), [city, platformName, state]);
  const cityDayQuery = useMemo(() => {
    const params = new URLSearchParams(baseQuery);
    params.set('limit', '120');
    return params.toString();
  }, [baseQuery]);
  const correlationQuery = useMemo(() => {
    const params = new URLSearchParams(baseQuery);
    params.set('limit', '300');
    return params.toString();
  }, [baseQuery]);

  const cityDay = useQuery({
    queryKey: ['analytics-city-day', cityDayQuery],
    queryFn: () => api.getAnalyticsCityDay(cityDayQuery)
  });
  const correlations = useQuery({
    queryKey: ['analytics-correlations', correlationQuery],
    queryFn: () => api.getAnalyticsCorrelations(correlationQuery)
  });

  const rows = cityDay.data?.data || [];
  const summary = correlations.data?.data?.summary || {};
  const topDisruptionDays = correlations.data?.data?.topDisruptionDays || [];
  const topDurationDays = correlations.data?.data?.topDurationDays || [];
  const cityRollups = correlations.data?.data?.cityRollups || [];

  return (
    <div className="dashboard-stack">
      <section className="hero card">
        <div>
          <span className="eyebrow">Analytics</span>
          <h2>City-day disruption and delivery impact analysis</h2>
          <p>This view joins delivery history with weather and AQI snapshots by city-day to expose payout, duration, and disruption relationships.</p>
        </div>
        <div className="hero-side">
          <div><span>Window</span><strong>60 days</strong></div>
          <div><span>Rows Analyzed</span><strong>{formatNumber(summary.rowsAnalyzed)}</strong></div>
        </div>
      </section>

      <section className="metric-grid">
        <StatCard title="Total Gigs" value={formatNumber(summary.totalGigs)} subtitle="Across joined city-day rows" tone="accent" />
        <StatCard title="Avg Duration" value={Number(summary.avgDurationMinutes || 0).toFixed(2)} subtitle="Per city-day-platform slice" />
        <StatCard title="Avg Disruption" value={Number(summary.avgDisruptionScore || 0).toFixed(3)} subtitle="Weather plus AQI blended score" />
        <StatCard title="High Disruption Days" value={formatNumber(summary.highDisruptionDays)} subtitle="Rows with elevated combined disruption" />
      </section>

      <section className="page-grid">
        <SparkBarList title="Top Cities by Gigs" items={cityRollups} valueKey="gigs" labelKey="city" formatter={formatNumber} />
        <PanelTable
          title="Top Disruption Days"
          caption="Highest combined weather and AQI pressure"
          rows={topDisruptionDays}
          rowKey={(row) => `${row.city}-${row.platformName}-${row.dateKey}-d`}
          columns={[
            { key: 'dateKey', label: 'Date', render: (row) => row.dateKey },
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'platform', label: 'Platform', render: (row) => row.platformName },
            { key: 'disruption', label: 'Disruption', render: (row) => Number(row.disruptionScore || 0).toFixed(3) },
            { key: 'weather', label: 'Weather', render: (row) => Number(row.weatherSeverityScore || 0).toFixed(3) },
            { key: 'aqi', label: 'AQI', render: (row) => Number(row.aqiSeverityScore || 0).toFixed(3) }
          ]}
        />
        <PanelTable
          title="Top Duration Days"
          caption="Longest average delivery durations"
          rows={topDurationDays}
          rowKey={(row) => `${row.city}-${row.platformName}-${row.dateKey}-t`}
          columns={[
            { key: 'dateKey', label: 'Date', render: (row) => row.dateKey },
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'platform', label: 'Platform', render: (row) => row.platformName },
            { key: 'duration', label: 'Avg Duration', render: (row) => Number(row.avgDurationMinutes || 0).toFixed(2) },
            { key: 'pay', label: 'Avg Pay', render: (row) => Number(row.avgAmountPaid || 0).toFixed(2) }
          ]}
        />
        <PanelTable
          title="City-Day Ledger"
          caption="Joined delivery, weather, and AQI slices"
          rows={rows}
          rowKey={(row) => `${row.city}-${row.platformName}-${row.dateKey}`}
          columns={[
            { key: 'dateKey', label: 'Date', render: (row) => row.dateKey },
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'platform', label: 'Platform', render: (row) => row.platformName },
            { key: 'gigs', label: 'Gigs', render: (row) => formatNumber(row.gigs) },
            { key: 'activeDrivers', label: 'Active Drivers', render: (row) => formatNumber(row.activeDrivers) },
            { key: 'duration', label: 'Avg Duration', render: (row) => Number(row.avgDurationMinutes || 0).toFixed(2) },
            { key: 'pay', label: 'Avg Pay', render: (row) => Number(row.avgAmountPaid || 0).toFixed(2) },
            { key: 'weather', label: 'Weather', render: (row) => Number(row.weatherSeverityScore || 0).toFixed(3) },
            { key: 'aqi', label: 'AQI', render: (row) => Number(row.aqiSeverityScore || 0).toFixed(3) },
            { key: 'disruption', label: 'Disruption', render: (row) => Number(row.disruptionScore || 0).toFixed(3) }
          ]}
        />
      </section>
    </div>
  );
}
