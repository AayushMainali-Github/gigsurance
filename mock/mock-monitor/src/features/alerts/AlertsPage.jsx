import { useMemo } from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bell, Cloud, Truck, Wind } from 'lucide-react';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';
import { formatNumber } from '../../lib/utils/format';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';
import { SparkBarList } from '../../components/SparkBarList';

function buildScopeQuery({ city, platformName, state }) {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (platformName) params.set('platformName', platformName);
  if (state) params.set('state', state);
  return params.toString();
}

function severityClass(level) {
  if (level === 'critical') return 'status-critical';
  if (level === 'high') return 'status-high';
  if (level === 'medium') return 'status-pending';
  return 'status-complete';
}

function severityIcon(level) {
  if (level === 'critical') return AlertTriangle;
  if (level === 'high') return Bell;
  return AlertTriangle;
}

function buildAlerts({ weather, aqi, liveSummary, cityBreakdown, platformBreakdown, scope }) {
  const alerts = [];

  for (const item of weather) {
    if (Number(item.weatherSeverityScore || 0) >= 0.88) {
      alerts.push({
        id: `weather-critical-${item.city}`,
        type: 'weather',
        severity: 'critical',
        city: item.city,
        platform: scope.platformName || 'multi-platform',
        title: `Severe weather pressure in ${item.city}`,
        metric: `${item.conditionMain} | severity ${Number(item.weatherSeverityScore).toFixed(3)}`,
        detail: `Rain ${item.rainMm} mm, wind ${item.windKph} kph, heat risk ${item.heatRisk}.`,
        tsUnix: item.tsUnix
      });
    } else if (Number(item.weatherSeverityScore || 0) >= 0.7) {
      alerts.push({
        id: `weather-high-${item.city}`,
        type: 'weather',
        severity: 'high',
        city: item.city,
        platform: scope.platformName || 'multi-platform',
        title: `Weather disruption watch for ${item.city}`,
        metric: `${item.conditionMain} | severity ${Number(item.weatherSeverityScore).toFixed(3)}`,
        detail: `Storm risk ${item.stormRisk}, visibility ${item.visibilityKm} km.`,
        tsUnix: item.tsUnix
      });
    }
  }

  for (const item of aqi) {
    if (item.category === 'severe' || Number(item.aqi || 0) >= 380) {
      alerts.push({
        id: `aqi-critical-${item.city}`,
        type: 'aqi',
        severity: 'critical',
        city: item.city,
        platform: scope.platformName || 'multi-platform',
        title: `AQI emergency conditions in ${item.city}`,
        metric: `AQI ${item.aqi} | ${item.category}`,
        detail: `PM2.5 ${item.pm25}, PM10 ${item.pm10}, severity ${item.severityScore}.`,
        tsUnix: item.tsUnix
      });
    } else if (item.category === 'very_poor' || Number(item.aqi || 0) >= 240) {
      alerts.push({
        id: `aqi-high-${item.city}`,
        type: 'aqi',
        severity: 'high',
        city: item.city,
        platform: scope.platformName || 'multi-platform',
        title: `Air quality deterioration in ${item.city}`,
        metric: `AQI ${item.aqi} | ${item.category}`,
        detail: `Exposure is likely to reduce attendance for sensitive drivers.`,
        tsUnix: item.tsUnix
      });
    }
  }

  if (Number(liveSummary.activeOrders || 0) >= 150) {
    alerts.push({
      id: 'live-capacity-surge',
      type: 'live',
      severity: 'high',
      city: scope.city || 'network',
      platform: scope.platformName || 'all platforms',
      title: 'High live order concurrency',
      metric: `${formatNumber(liveSummary.activeOrders)} active orders`,
      detail: `Recent deliveries ${formatNumber(liveSummary.recentlyDelivered || 0)}, pickups ${formatNumber(liveSummary.recentPickups || 0)}.`,
      tsUnix: Date.now()
    });
  }

  if (Number(liveSummary.avgDuration || 0) >= 60) {
    alerts.push({
      id: 'live-duration-spike',
      type: 'delivery',
      severity: 'medium',
      city: scope.city || 'network',
      platform: scope.platformName || 'all platforms',
      title: 'Live delivery duration elevated',
      metric: `${Number(liveSummary.avgDuration).toFixed(2)} min average`,
      detail: `Durations in the active window are running above expected fast-cycle norms.`,
      tsUnix: Date.now()
    });
  }

  const hottestCity = cityBreakdown[0];
  if (hottestCity && Number(hottestCity.liveOrders || 0) >= 40) {
    alerts.push({
      id: `city-load-${hottestCity._id}`,
      type: 'capacity',
      severity: 'medium',
      city: hottestCity._id,
      platform: scope.platformName || 'multi-platform',
      title: `Order concentration rising in ${hottestCity._id}`,
      metric: `${formatNumber(hottestCity.liveOrders)} live orders`,
      detail: `This city is leading the live order load in the current rolling window.`,
      tsUnix: Date.now()
    });
  }

  const dominantPlatform = platformBreakdown[0];
  if (dominantPlatform && Number(dominantPlatform.liveOrders || 0) >= 50) {
    alerts.push({
      id: `platform-load-${dominantPlatform._id}`,
      type: 'platform',
      severity: 'medium',
      city: scope.city || 'network',
      platform: dominantPlatform._id,
      title: `${dominantPlatform._id} is dominating live order flow`,
      metric: `${formatNumber(dominantPlatform.liveOrders)} live orders`,
      detail: `This can reflect surge concentration or platform-heavy demand skew.`,
      tsUnix: Date.now()
    });
  }

  const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };
  return alerts.sort((left, right) => {
    const severityDiff = severityRank[right.severity] - severityRank[left.severity];
    if (severityDiff) return severityDiff;
    return Number(right.tsUnix || 0) - Number(left.tsUnix || 0);
  });
}

export function AlertsPage() {
  const { city, platformName, state } = useMonitorFilters();
  const scope = { city, platformName, state };
  const liveQuery = useMemo(() => {
    const params = new URLSearchParams(buildScopeQuery(scope));
    params.set('windowMs', String(2 * 60 * 60 * 1000));
    return params.toString();
  }, [city, platformName, state]);

  const weatherQuery = useQuery({
    queryKey: ['alerts-weather-latest', city],
    queryFn: () => api.getWeatherLatest(city || undefined),
    refetchInterval: 60000
  });
  const aqiQuery = useQuery({
    queryKey: ['alerts-aqi-latest', city],
    queryFn: () => api.getAqiLatest(city || undefined),
    refetchInterval: 60000
  });
  const liveMetricsQuery = useQuery({
    queryKey: ['alerts-live-metrics', liveQuery],
    queryFn: () => api.getLiveMetrics(liveQuery),
    refetchInterval: 30000
  });

  const weather = Array.isArray(weatherQuery.data?.data) ? weatherQuery.data.data : weatherQuery.data?.data ? [weatherQuery.data.data] : [];
  const aqi = Array.isArray(aqiQuery.data?.data) ? aqiQuery.data.data : aqiQuery.data?.data ? [aqiQuery.data.data] : [];
  const liveData = liveMetricsQuery.data?.data || {};
  const alerts = buildAlerts({
    weather,
    aqi,
    liveSummary: liveData.summary || {},
    cityBreakdown: liveData.cityBreakdown || [],
    platformBreakdown: liveData.platformBreakdown || [],
    scope
  });

  const criticalCount = alerts.filter((item) => item.severity === 'critical').length;
  const highCount = alerts.filter((item) => item.severity === 'high').length;
  const mediumCount = alerts.filter((item) => item.severity === 'medium').length;
  const typeMix = ['weather', 'aqi', 'live', 'delivery', 'capacity', 'platform']
    .map((type) => ({ type, alerts: alerts.filter((item) => item.type === type).length }))
    .filter((item) => item.alerts > 0);

  return (
    <div className="dashboard-stack page-surface">
      <section className="hero card">
        <div>
          <span className="eyebrow">Operational Alerts</span>
          <h2>Derived risk feed across environment and delivery flow</h2>
          <p>The current alert stack is synthesized from live order pressure, latest weather state, and latest AQI state for the selected scope.</p>
        </div>
        <div className="hero-side">
          <div><span>Scope</span><strong>{city || state || 'Network'}</strong></div>
          <div><span>Platform</span><strong>{platformName || 'All'}</strong></div>
        </div>
      </section>

      <section className="metric-grid">
        <StatCard title="Total Alerts" value={formatNumber(alerts.length)} subtitle="Current derived alert feed" tone="accent" />
        <StatCard title="Critical" value={formatNumber(criticalCount)} subtitle="Immediate operational pressure" />
        <StatCard title="High" value={formatNumber(highCount)} subtitle="Elevated risk signals" />
        <StatCard title="Medium" value={formatNumber(mediumCount)} subtitle="Emerging conditions to watch" />
      </section>

      <section className="page-grid">
        <SparkBarList title="Alerts by Type" items={typeMix} valueKey="alerts" labelKey="type" formatter={formatNumber} />
        <PanelTable
          title="Priority Feed"
          caption="Highest severity alerts first"
          rows={alerts.slice(0, 12)}
          rowKey={(row) => row.id}
          columns={[
            {
              key: 'severity',
              label: 'Severity',
              render: (row) => {
                const Icon = severityIcon(row.severity);
                return <span className={`status-pill ${severityClass(row.severity)}`}><Icon size={14} strokeWidth={2} />{row.severity}</span>;
              }
            },
            { key: 'title', label: 'Alert', render: (row) => row.title },
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'metric', label: 'Metric', render: (row) => row.metric },
            { key: 'time', label: 'Time', render: (row) => dayjs(row.tsUnix).format('DD MMM HH:mm') }
          ]}
        />
        <section className="card panel">
          <div className="panel-header">
            <div className="panel-heading">
              <div className="panel-title-row">
                <span className="panel-icon"><Bell size={16} strokeWidth={2} /></span>
                <h2>Alert Logic</h2>
              </div>
              <span className="panel-caption">Current frontend-derived rules</span>
            </div>
          </div>
          <div className="live-notes">
            <div className="live-note special-note">
              <Cloud size={16} strokeWidth={2} />
              <strong>Weather</strong>
              <span>Triggers on high severity, storm, and visibility deterioration.</span>
            </div>
            <div className="live-note special-note">
              <Wind size={16} strokeWidth={2} />
              <strong>AQI</strong>
              <span>Triggers on very poor and severe air quality bands with stronger priority for severe conditions.</span>
            </div>
            <div className="live-note special-note">
              <Truck size={16} strokeWidth={2} />
              <strong>Delivery</strong>
              <span>Triggers on unusually high concurrency, duration elevation, and concentrated city or platform pressure.</span>
            </div>
          </div>
        </section>
        <PanelTable
          title="Full Alert Ledger"
          caption="Operational details for all current alerts"
          rows={alerts}
          rowKey={(row) => `${row.id}-ledger`}
          columns={[
            {
              key: 'severity',
              label: 'Severity',
              render: (row) => {
                const Icon = severityIcon(row.severity);
                return <span className={`status-pill ${severityClass(row.severity)}`}><Icon size={14} strokeWidth={2} />{row.severity}</span>;
              }
            },
            { key: 'type', label: 'Type', render: (row) => row.type },
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'platform', label: 'Platform', render: (row) => row.platform },
            { key: 'detail', label: 'Detail', render: (row) => row.detail }
          ]}
        />
      </section>
    </div>
  );
}
