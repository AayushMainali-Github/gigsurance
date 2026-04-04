import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';
import { formatNumber } from '../../lib/utils/format';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';
import { SparkBarList } from '../../components/SparkBarList';
import { ChartPanel } from '../../components/ChartPanel';

const chartGrid = '#F3F4F6';
const axisStroke = '#9CA3AF';
const tooltipStyle = {
  background: '#FFFFFF',
  border: '1px solid #F3F4F6',
  borderRadius: 12,
  color: '#111827',
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
};

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
  const trendRows = useMemo(() => {
    const trendMap = new Map();
    for (const row of rows) {
      if (!trendMap.has(row.dateKey)) {
        trendMap.set(row.dateKey, {
          dateKey: row.dateKey,
          gigs: 0,
          avgDurationMinutes: 0,
          avgAmountPaid: 0,
          disruptionScore: 0,
          weatherSeverityScore: 0,
          aqiSeverityScore: 0,
          samples: 0
        });
      }
      const bucket = trendMap.get(row.dateKey);
      bucket.gigs += Number(row.gigs || 0);
      bucket.avgDurationMinutes += Number(row.avgDurationMinutes || 0);
      bucket.avgAmountPaid += Number(row.avgAmountPaid || 0);
      bucket.disruptionScore += Number(row.disruptionScore || 0);
      bucket.weatherSeverityScore += Number(row.weatherSeverityScore || 0);
      bucket.aqiSeverityScore += Number(row.aqiSeverityScore || 0);
      bucket.samples += 1;
    }

    return Array.from(trendMap.values())
      .map((item) => ({
        dateKey: item.dateKey.slice(5),
        gigs: item.gigs,
        avgDurationMinutes: Number((item.avgDurationMinutes / item.samples).toFixed(2)),
        avgAmountPaid: Number((item.avgAmountPaid / item.samples).toFixed(2)),
        disruptionScore: Number((item.disruptionScore / item.samples).toFixed(3)),
        weatherSeverityScore: Number((item.weatherSeverityScore / item.samples).toFixed(3)),
        aqiSeverityScore: Number((item.aqiSeverityScore / item.samples).toFixed(3))
      }))
      .sort((left, right) => left.dateKey.localeCompare(right.dateKey));
  }, [rows]);

  const scatterRows = useMemo(
    () => rows.slice(0, 120).map((row) => ({
      city: row.city,
      platformName: row.platformName,
      x: Number(row.disruptionScore || 0),
      y: Number(row.avgDurationMinutes || 0),
      z: Number(row.avgAmountPaid || 0)
    })),
    [rows]
  );

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
        <ChartPanel
          title="Disruption vs Duration"
          caption="Trend of combined disruption and average delivery duration"
        >
          <ComposedChart data={trendRows}>
            <CartesianGrid stroke={chartGrid} vertical={false} />
            <XAxis dataKey="dateKey" stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="#6366F1" tick={{ fill: axisStroke, fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#F59E0B" tick={{ fill: axisStroke, fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
            />
            <Area yAxisId="left" type="monotone" dataKey="disruptionScore" stroke="#6366F1" fill="rgba(99,102,241,0.18)" />
            <Line yAxisId="right" type="monotone" dataKey="avgDurationMinutes" stroke="#F59E0B" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ChartPanel>

        <ChartPanel
          title="Gig Volume vs Payout"
          caption="How volume and average payout move through the window"
        >
          <ComposedChart data={trendRows}>
            <CartesianGrid stroke={chartGrid} vertical={false} />
            <XAxis dataKey="dateKey" stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="#4F46E5" tick={{ fill: axisStroke, fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#8B5CF6" tick={{ fill: axisStroke, fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
            />
            <Area yAxisId="left" type="monotone" dataKey="gigs" stroke="#4F46E5" fill="rgba(79,70,229,0.16)" />
            <Line yAxisId="right" type="monotone" dataKey="avgAmountPaid" stroke="#8B5CF6" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ChartPanel>

        <ChartPanel
          title="Disruption Correlation Cloud"
          caption="Each point is a city-day-platform slice"
        >
          <ScatterChart>
            <CartesianGrid stroke={chartGrid} />
            <XAxis
              type="number"
              dataKey="x"
              name="Disruption"
              stroke={axisStroke}
              tick={{ fill: axisStroke, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Avg Duration"
              stroke={axisStroke}
              tick={{ fill: axisStroke, fontSize: 11 }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={tooltipStyle}
              formatter={(value, name) => [value, name === 'x' ? 'Disruption' : name === 'y' ? 'Avg Duration' : name]}
            />
            <Scatter data={scatterRows} fill="#6366F1" />
          </ScatterChart>
        </ChartPanel>

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
