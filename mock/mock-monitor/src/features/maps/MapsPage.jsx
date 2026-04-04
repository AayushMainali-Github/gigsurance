import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { Cloud, Map, ShoppingCart, TriangleAlert, Users, Wind } from 'lucide-react';
import { api } from '../../lib/api/client';
import { cityMeta } from '../../lib/cityMeta';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';
import { formatNumber } from '../../lib/utils/format';
import { useMonitorFilters } from '../../store/filters';

function enrichCity(cities, weather, aqi, liveBreakdown, disruptionRows) {
  const weatherMap = new Map((weather || []).map((item) => [item.city, item]));
  const aqiMap = new Map((aqi || []).map((item) => [item.city, item]));
  const liveMap = new Map((liveBreakdown || []).map((item) => [item._id, item]));
  const disruptionMap = new Map();
  for (const row of disruptionRows || []) {
    if (!disruptionMap.has(row.city)) disruptionMap.set(row.city, row);
  }
  return cityMeta.map((meta) => {
    const cityStats = (cities || []).find((item) => item.city === meta.city);
    return {
      ...meta,
      drivers: cityStats?.drivers || 0,
      cityTier: cityStats?.cityTier || meta.tier,
      weather: weatherMap.get(meta.city) || null,
      aqi: aqiMap.get(meta.city) || null,
      live: liveMap.get(meta.city) || null,
      disruption: disruptionMap.get(meta.city) || null
    };
  });
}

function getMarkerStyle(mode, city) {
  if (mode === 'weather') {
    const severity = Number(city.weather?.weatherSeverityScore || 0);
    return { radius: 6 + severity * 18, color: severity > 0.6 ? '#fb7185' : severity > 0.3 ? '#f59e0b' : '#38bdf8' };
  }
  if (mode === 'aqi') {
    const aqi = Number(city.aqi?.aqi || 0);
    return { radius: 6 + Math.min(aqi / 35, 16), color: aqi > 300 ? '#ef4444' : aqi > 180 ? '#f97316' : '#22c55e' };
  }
  if (mode === 'live') {
    const liveOrders = Number(city.live?.liveOrders || 0);
    return { radius: 6 + Math.min(liveOrders / 4, 18), color: liveOrders > 40 ? '#f97316' : liveOrders > 15 ? '#38bdf8' : '#94a3b8' };
  }
  if (mode === 'disruption') {
    const disruption = Number(city.disruption?.disruptionScore || 0);
    return { radius: 6 + disruption * 20, color: disruption > 0.75 ? '#ef4444' : disruption > 0.45 ? '#f59e0b' : '#22c55e' };
  }
  return { radius: 6 + Math.min((city.drivers || 0) / 800, 16), color: city.drivers > 3000 ? '#22c55e' : city.drivers > 1000 ? '#38bdf8' : '#94a3b8' };
}

export function MapsPage() {
  const { city, platformName, state } = useMonitorFilters();
  const [mode, setMode] = useState('drivers');
  const [selectedCity, setSelectedCity] = useState('Mumbai');
  const scopeQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (platformName) params.set('platformName', platformName);
    if (state) params.set('state', state);
    return params.toString();
  }, [city, platformName, state]);
  const liveQuery = useMemo(() => {
    const params = new URLSearchParams(scopeQuery);
    params.set('windowMs', String(2 * 60 * 60 * 1000));
    return params.toString();
  }, [scopeQuery]);
  const disruptionQuery = useMemo(() => {
    const params = new URLSearchParams(scopeQuery);
    params.set('days', '14');
    params.set('limit', '200');
    return params.toString();
  }, [scopeQuery]);

  const citiesQuery = useQuery({ queryKey: ['map-cities'], queryFn: api.getCities });
  const weatherQuery = useQuery({ queryKey: ['map-weather-latest'], queryFn: () => api.getWeatherLatest() });
  const aqiQuery = useQuery({ queryKey: ['map-aqi-latest'], queryFn: () => api.getAqiLatest() });
  const liveMetricsQuery = useQuery({ queryKey: ['map-live-metrics', liveQuery], queryFn: () => api.getLiveMetrics(liveQuery), refetchInterval: 30000 });
  const analyticsQuery = useQuery({ queryKey: ['map-analytics', disruptionQuery], queryFn: () => api.getAnalyticsCityDay(disruptionQuery) });
  const cityDashboardQuery = useQuery({ queryKey: ['map-city-dashboard', selectedCity], queryFn: () => api.getCityDashboard(selectedCity), enabled: Boolean(selectedCity) });

  const mappedCities = useMemo(
    () => enrichCity(
      citiesQuery.data?.data,
      weatherQuery.data?.data,
      aqiQuery.data?.data,
      liveMetricsQuery.data?.data?.cityBreakdown,
      analyticsQuery.data?.data
    ),
    [citiesQuery.data, weatherQuery.data, aqiQuery.data, liveMetricsQuery.data, analyticsQuery.data]
  );
  const selected = mappedCities.find((item) => item.city === selectedCity);
  const dashboard = cityDashboardQuery.data?.data;
  const liveSummary = liveMetricsQuery.data?.data?.summary || {};
  const liveCityOrders = Number(selected?.live?.liveOrders || 0);
  const selectedDisruption = selected?.disruption || null;
  const modeLabel = mode === 'drivers'
    ? 'Drivers'
    : mode === 'weather'
      ? 'Weather'
      : mode === 'aqi'
        ? 'AQI'
        : mode === 'live'
          ? 'Live Orders'
          : 'Disruption';
  const mapFeed = [...mappedCities]
    .sort((a, b) => {
      const aValue = mode === 'drivers'
        ? a.drivers
        : mode === 'weather'
          ? Number(a.weather?.weatherSeverityScore || 0)
          : mode === 'aqi'
            ? Number(a.aqi?.aqi || 0)
            : mode === 'live'
              ? Number(a.live?.liveOrders || 0)
              : Number(a.disruption?.disruptionScore || 0);
      const bValue = mode === 'drivers'
        ? b.drivers
        : mode === 'weather'
          ? Number(b.weather?.weatherSeverityScore || 0)
          : mode === 'aqi'
            ? Number(b.aqi?.aqi || 0)
            : mode === 'live'
              ? Number(b.live?.liveOrders || 0)
              : Number(b.disruption?.disruptionScore || 0);
      return bValue - aValue;
    })
    .slice(0, 12);

  return (
    <div className="dashboard-stack page-surface">
      <section className="hero card">
        <div>
          <span className="eyebrow">Geographic Monitoring</span>
          <h2>Map-based operations view across drivers, weather, AQI, and live load</h2>
          <p>Switch the map mode to inspect how network scale, environmental pressure, and live order concentration move across cities.</p>
        </div>
        <div className="hero-side">
          <div><span>Mapped Cities</span><strong>{formatNumber(mappedCities.length)}</strong></div>
          <div><span>Current Mode</span><strong>{modeLabel}</strong></div>
        </div>
      </section>
      <section className="metric-grid">
        <StatCard title="Mapped Cities" value={formatNumber(mappedCities.length)} subtitle="Cities rendered on the map" tone="accent" />
        <StatCard title="View Mode" value={modeLabel} subtitle="Drivers, weather, AQI, live, or disruption" />
        <StatCard title="Selected City" value={selectedCity} subtitle={selected?.state || 'No city selected'} />
        <StatCard title="Live Window Orders" value={formatNumber(liveSummary.activeOrders)} subtitle="Network-wide inferred in-transit load" />
      </section>

      <section className="page-grid map-layout">
        <section className="card panel span-2 map-panel">
          <div className="panel-header">
            <div className="panel-heading">
              <div className="panel-title-row">
                <span className="panel-icon"><Map size={16} strokeWidth={2} /></span>
                <h2>India Operations Map</h2>
              </div>
              <span className="panel-caption">Switch the signal layer to compare different operational dimensions.</span>
            </div>
            <div className="mode-switch">
              <button className={`mini-button ${mode === 'drivers' ? 'active-pill' : ''}`} onClick={() => setMode('drivers')}><Users size={16} strokeWidth={2} />Drivers</button>
              <button className={`mini-button ${mode === 'weather' ? 'active-pill' : ''}`} onClick={() => setMode('weather')}><Cloud size={16} strokeWidth={2} />Weather</button>
              <button className={`mini-button ${mode === 'aqi' ? 'active-pill' : ''}`} onClick={() => setMode('aqi')}><Wind size={16} strokeWidth={2} />AQI</button>
              <button className={`mini-button ${mode === 'live' ? 'active-pill' : ''}`} onClick={() => setMode('live')}><ShoppingCart size={16} strokeWidth={2} />Live</button>
              <button className={`mini-button ${mode === 'disruption' ? 'active-pill' : ''}`} onClick={() => setMode('disruption')}><TriangleAlert size={16} strokeWidth={2} />Disruption</button>
            </div>
          </div>
          <div className="map-frame">
            <MapContainer center={[22.5937, 78.9629]} zoom={5} scrollWheelZoom className="leaflet-host">
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              />
              {mappedCities.map((city) => {
                const style = getMarkerStyle(mode, city);
                return (
                  <CircleMarker
                    key={city.city}
                    center={[city.centerLat, city.centerLng]}
                    pathOptions={{ color: style.color, fillColor: style.color, fillOpacity: 0.48 }}
                    radius={style.radius}
                    eventHandlers={{ click: () => setSelectedCity(city.city) }}
                  >
                    <Popup>
                      <div className="map-popup">
                        <strong>{city.city}</strong>
                        <span className="map-popup-subtitle">{city.state}</span>
                        <div className="map-popup-grid">
                          <div className="map-popup-item">
                            <span>Drivers</span>
                            <b>{formatNumber(city.drivers)}</b>
                          </div>
                          <div className="map-popup-item">
                            <span>Live Orders</span>
                            <b>{formatNumber(city.live?.liveOrders || 0)}</b>
                          </div>
                          <div className="map-popup-item">
                            <span>Disruption</span>
                            <b>{city.disruption?.disruptionScore ?? '-'}</b>
                          </div>
                          <div className="map-popup-item">
                            <span>Weather</span>
                            <b>{city.weather?.weatherSeverityScore ?? '-'}</b>
                          </div>
                          <div className="map-popup-item map-popup-item-wide">
                            <span>AQI</span>
                            <b>{city.aqi?.aqi ?? '-'}</b>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </section>

        <PanelTable
          title="Selected City Snapshot"
          caption={selectedCity ? `Operational state for ${selectedCity}` : 'Select a city from the map'}
          rows={selectedCity ? [{
            city: selectedCity,
            tier: selected?.cityTier || selected?.tier || '-',
            drivers: dashboard?.driverCount || 0,
            liveOrders: liveCityOrders,
            disruption: selectedDisruption?.disruptionScore ?? '-',
            weather: dashboard?.latestWeather?.conditionMain || '-',
            aqi: dashboard?.latestAqi?.aqi ?? '-',
            category: dashboard?.latestAqi?.category || '-'
          }] : []}
          rowKey={(_, index) => index}
          columns={[
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'tier', label: 'Tier', render: (row) => row.tier },
            { key: 'drivers', label: 'Drivers', render: (row) => formatNumber(row.drivers) },
            { key: 'liveOrders', label: 'Live', render: (row) => formatNumber(row.liveOrders) },
            { key: 'disruption', label: 'Disruption', render: (row) => row.disruption },
            { key: 'weather', label: 'Weather', render: (row) => row.weather },
            { key: 'aqi', label: 'AQI', render: (row) => row.aqi },
            { key: 'category', label: 'Category', render: (row) => row.category }
          ]}
        />

        <PanelTable
          title="Selected City Detail"
          caption="Latest joined live and analytics view"
          rows={selectedCity ? [{
            platformMix: dashboard?.platformMix?.[0]?._id || '-',
            topPlatformDrivers: dashboard?.platformMix?.[0]?.drivers || 0,
            cityGigs: selectedDisruption?.gigs || 0,
            activeDrivers: selectedDisruption?.activeDrivers || 0,
            avgDuration: selectedDisruption?.avgDurationMinutes ?? '-',
            avgPay: selectedDisruption?.avgAmountPaid ?? '-'
          }] : []}
          rowKey={(_, index) => index}
          columns={[
            { key: 'platformMix', label: 'Top Platform', render: (row) => row.platformMix },
            { key: 'topPlatformDrivers', label: 'Top Platform Drivers', render: (row) => formatNumber(row.topPlatformDrivers) },
            { key: 'cityGigs', label: 'Recent Gigs', render: (row) => formatNumber(row.cityGigs) },
            { key: 'activeDrivers', label: 'Active Drivers', render: (row) => formatNumber(row.activeDrivers) },
            { key: 'avgDuration', label: 'Avg Duration', render: (row) => row.avgDuration },
            { key: 'avgPay', label: 'Avg Pay', render: (row) => row.avgPay }
          ]}
        />

        <PanelTable
          title="Map Feed"
          caption="Top cities by current map mode"
          rows={mapFeed}
          rowKey={(row) => row.city}
          columns={[
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'state', label: 'State', render: (row) => row.state },
            {
              key: 'value',
              label: mode === 'drivers' ? 'Drivers' : mode === 'weather' ? 'Weather Severity' : mode === 'aqi' ? 'AQI' : mode === 'live' ? 'Live Orders' : 'Disruption',
              render: (row) => mode === 'drivers'
                ? formatNumber(row.drivers)
                : mode === 'weather'
                  ? (row.weather?.weatherSeverityScore ?? '-')
                  : mode === 'aqi'
                    ? (row.aqi?.aqi ?? '-')
                    : mode === 'live'
                      ? formatNumber(row.live?.liveOrders || 0)
                      : (row.disruption?.disruptionScore ?? '-')
            }
          ]}
        />
      </section>
    </div>
  );
}
