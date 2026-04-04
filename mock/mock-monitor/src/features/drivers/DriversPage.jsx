import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';
import { formatNumber } from '../../lib/utils/format';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';
import { ChartPanel } from '../../components/ChartPanel';

function riskTone(riskBand) {
  if (riskBand === 'high') return 'status-critical';
  if (riskBand === 'medium') return 'status-high';
  return 'status-live';
}

export function DriversPage() {
  const { city, platformName, state } = useMonitorFilters();
  const [selectedDriver, setSelectedDriver] = useState(null);
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (platformName) params.set('platformName', platformName);
    if (state) params.set('state', state);
    params.set('limit', '30');
    params.set('sortBy', 'joinedAt');
    return params.toString();
  }, [city, platformName, state]);

  const driversQuery = useQuery({ queryKey: ['drivers-page', query], queryFn: () => api.getDeliveryDrivers(query) });
  const drivers = driversQuery.data?.data || [];
  const activeDriver = selectedDriver || (drivers[0] ? { platformName: drivers[0].platformName, platformDriverId: drivers[0].platformDriverId } : null);
  const detailQuery = useQuery({
    queryKey: ['driver-detail', activeDriver?.platformName, activeDriver?.platformDriverId],
    queryFn: () => api.getDeliveryDriver(activeDriver.platformName, activeDriver.platformDriverId, 100),
    enabled: Boolean(activeDriver)
  });
  const riskQuery = useQuery({
    queryKey: ['driver-risk', activeDriver?.platformName, activeDriver?.platformDriverId],
    queryFn: () => api.getDriverRisk(activeDriver.platformName, activeDriver.platformDriverId, 600),
    enabled: Boolean(activeDriver)
  });
  const detail = detailQuery.data?.data;
  const recentHistory = detail?.history || [];
  const risk = riskQuery.data?.data;
  const riskSummary = risk?.summary || {};
  const dailyTrend = risk?.dailyTrend || [];

  return (
    <div className="dashboard-stack">
      <section className="hero card">
        <div>
          <span className="eyebrow">Driver Monitoring</span>
          <h2>Profiles, exposure, and recent behavior</h2>
          <p>Move from the driver list into a focused profile view with clearer risk context, trend lines, and recent gig history.</p>
        </div>
        <div className="hero-side">
          <div><span>Drivers In View</span><strong>{formatNumber(driversQuery.data?.total || 0)}</strong></div>
          <div><span>Selected Risk Band</span><strong>{riskSummary.riskBand || 'None'}</strong></div>
        </div>
      </section>
      <section className="metric-grid">
        <StatCard title="Visible Drivers" value={formatNumber(driversQuery.data?.total || 0)} subtitle="Current filtered result set" tone="accent" />
        <StatCard title="Selected Driver" value={detail?.platformDriverId || '-'} subtitle={detail?.platformName || 'No driver selected'} />
        <StatCard title="Risk Score" value={Number(riskSummary.riskScore || 0).toFixed(3)} subtitle={riskSummary.riskBand || 'No risk band'} />
        <StatCard title="BSON Size" value={formatNumber(detail?.bsonSizeBytes || 0)} subtitle="Current document size in bytes" />
      </section>

      <section className="page-grid">
        <PanelTable
          title="Driver Browser"
          caption="Pick a driver from the current filtered set"
          rows={drivers}
          rowKey={(row) => `${row.platformName}-${row.platformDriverId}`}
          columns={[
            { key: 'pick', label: 'Pick', render: (row) => <button className="mini-button" onClick={() => setSelectedDriver({ platformName: row.platformName, platformDriverId: row.platformDriverId })}>{row.platformDriverId === detail?.platformDriverId ? 'Active' : 'Open'}</button> },
            { key: 'driver', label: 'Driver', render: (row) => row.platformDriverId },
            { key: 'platform', label: 'Platform', render: (row) => row.platformName },
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'archetype', label: 'Archetype', render: (row) => row.driverProfile?.archetype }
          ]}
        />
        <PanelTable
          title="Driver Profile"
          caption={detail ? `Profile view for ${detail.platformDriverId}` : 'Select a driver'}
          rows={detail ? [{
            city: detail.city,
            tier: detail.cityTier,
            archetype: detail.driverProfile?.archetype,
            shift: detail.driverProfile?.preferredShift,
            sensitivity: detail.driverProfile?.weatherSensitivity,
            loyalty: detail.driverProfile?.platformLoyaltyScore
          }] : []}
          rowKey={(_, index) => index}
          columns={[
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'tier', label: 'Tier', render: (row) => String(row.tier || '').toUpperCase() },
            { key: 'archetype', label: 'Archetype', render: (row) => row.archetype },
            { key: 'shift', label: 'Shift', render: (row) => row.shift },
            { key: 'sensitivity', label: 'Sensitivity', render: (row) => row.sensitivity },
            { key: 'loyalty', label: 'Loyalty', render: (row) => row.loyalty }
          ]}
        />
        <PanelTable
          title="Risk Summary"
          caption={risk ? `Exposure profile for ${detail?.platformDriverId}` : 'Select a driver'}
          rows={risk ? [{
            riskBand: riskSummary.riskBand,
            totalGigs: riskSummary.totalGigs,
            avgPay: riskSummary.avgPay,
            avgDuration: riskSummary.avgDuration,
            weatherExposure: riskSummary.weatherExposureRate,
            aqiExposure: riskSummary.aqiExposureRate
          }] : []}
          rowKey={(_, index) => index}
          columns={[
            { key: 'riskBand', label: 'Risk', render: (row) => <span className={`status-pill ${riskTone(row.riskBand)}`}>{row.riskBand}</span> },
            { key: 'totalGigs', label: 'Gigs', render: (row) => formatNumber(row.totalGigs) },
            { key: 'avgPay', label: 'Avg Pay', render: (row) => Number(row.avgPay || 0).toFixed(2) },
            { key: 'avgDuration', label: 'Avg Duration', render: (row) => Number(row.avgDuration || 0).toFixed(2) },
            { key: 'weatherExposure', label: 'Weather Exp', render: (row) => Number(row.weatherExposure || 0).toFixed(3) },
            { key: 'aqiExposure', label: 'AQI Exp', render: (row) => Number(row.aqiExposure || 0).toFixed(3) }
          ]}
        />
        <ChartPanel
          title="Daily Gig Trend"
          caption="Recent gig volume and average duration"
        >
          <LineChart data={dailyTrend}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
            <XAxis dataKey="dateKey" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="#22c55e" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#f97316" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12 }} />
            <Line yAxisId="left" type="monotone" dataKey="gigs" stroke="#22c55e" strokeWidth={2.5} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="avgDuration" stroke="#f97316" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ChartPanel>
        <ChartPanel
          title="Exposure Trend"
          caption="Recent weather exposure against average payout"
        >
          <AreaChart data={dailyTrend}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
            <XAxis dataKey="dateKey" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="#38bdf8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#facc15" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12 }} />
            <Area yAxisId="left" type="monotone" dataKey="avgWeather" stroke="#38bdf8" fill="rgba(56,189,248,0.25)" />
            <Line yAxisId="right" type="monotone" dataKey="avgPay" stroke="#facc15" strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ChartPanel>
        <PanelTable
          title="Recent Driver History"
          caption={detail ? `Latest ${recentHistory.length} gigs` : 'Select a driver'}
          rows={recentHistory.slice(-20).reverse()}
          rowKey={(row) => row.gigId}
          columns={[
            { key: 'gig', label: 'Gig', render: (row) => row.gigId },
            { key: 'date', label: 'Date', render: (row) => row.dateKey },
            { key: 'pay', label: 'Pay', render: (row) => row.amountPaid },
            { key: 'duration', label: 'Duration', render: (row) => row.durationMinutes },
            { key: 'aqi', label: 'AQI Hint', render: (row) => row.aqiBandHint }
          ]}
        />
      </section>
    </div>
  );
}
