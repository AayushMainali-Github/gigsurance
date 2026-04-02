import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { cityMeta } from '../../lib/cityMeta';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';
import { formatNumber } from '../../lib/utils/format';

function enrichCity(cities, weather, aqi) {
  const weatherMap = new Map((weather || []).map((item) => [item.city, item]));
  const aqiMap = new Map((aqi || []).map((item) => [item.city, item]));
  return cityMeta.map((meta) => {
    const cityStats = (cities || []).find((item) => item.city === meta.city);
    return {
      ...meta,
      drivers: cityStats?.drivers || 0,
      cityTier: cityStats?.cityTier || meta.tier,
      weather: weatherMap.get(meta.city) || null,
      aqi: aqiMap.get(meta.city) || null
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
  return { radius: 6 + Math.min((city.drivers || 0) / 800, 16), color: city.drivers > 3000 ? '#22c55e' : city.drivers > 1000 ? '#38bdf8' : '#94a3b8' };
}

export function MapsPage() {
  const [mode, setMode] = useState('drivers');
  const [selectedCity, setSelectedCity] = useState('Mumbai');
  const citiesQuery = useQuery({ queryKey: ['map-cities'], queryFn: api.getCities });
  const weatherQuery = useQuery({ queryKey: ['map-weather-latest'], queryFn: () => api.getWeatherLatest() });
  const aqiQuery = useQuery({ queryKey: ['map-aqi-latest'], queryFn: () => api.getAqiLatest() });
  const cityDashboardQuery = useQuery({ queryKey: ['map-city-dashboard', selectedCity], queryFn: () => api.getCityDashboard(selectedCity), enabled: Boolean(selectedCity) });

  const mappedCities = useMemo(
    () => enrichCity(citiesQuery.data?.data, weatherQuery.data?.data, aqiQuery.data?.data),
    [citiesQuery.data, weatherQuery.data, aqiQuery.data]
  );
  const selected = mappedCities.find((item) => item.city === selectedCity);
  const dashboard = cityDashboardQuery.data?.data;

  return (
    <div className="dashboard-stack">
      <section className="metric-grid">
        <StatCard title="Mapped Cities" value={formatNumber(mappedCities.length)} subtitle="Cities rendered on the map" tone="accent" />
        <StatCard title="View Mode" value={mode} subtitle="Drivers, weather, or AQI" />
        <StatCard title="Selected City" value={selectedCity} subtitle={selected?.state || 'No city selected'} />
        <StatCard title="Selected Drivers" value={formatNumber(dashboard?.driverCount || 0)} subtitle="Current city fleet count" />
      </section>

      <section className="page-grid map-layout">
        <section className="card panel span-2 map-panel">
          <div className="panel-header">
            <h2>India Operations Map</h2>
            <div className="mode-switch">
              <button className={`mini-button ${mode === 'drivers' ? 'active-pill' : ''}`} onClick={() => setMode('drivers')}>Drivers</button>
              <button className={`mini-button ${mode === 'weather' ? 'active-pill' : ''}`} onClick={() => setMode('weather')}>Weather</button>
              <button className={`mini-button ${mode === 'aqi' ? 'active-pill' : ''}`} onClick={() => setMode('aqi')}>AQI</button>
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
                        <div>{city.state}</div>
                        <div>Drivers: {formatNumber(city.drivers)}</div>
                        <div>Weather severity: {city.weather?.weatherSeverityScore ?? '-'}</div>
                        <div>AQI: {city.aqi?.aqi ?? '-'}</div>
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
            weather: dashboard?.latestWeather?.conditionMain || '-',
            aqi: dashboard?.latestAqi?.aqi ?? '-',
            category: dashboard?.latestAqi?.category || '-'
          }] : []}
          rowKey={(_, index) => index}
          columns={[
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'tier', label: 'Tier', render: (row) => row.tier },
            { key: 'drivers', label: 'Drivers', render: (row) => formatNumber(row.drivers) },
            { key: 'weather', label: 'Weather', render: (row) => row.weather },
            { key: 'aqi', label: 'AQI', render: (row) => row.aqi },
            { key: 'category', label: 'Category', render: (row) => row.category }
          ]}
        />

        <PanelTable
          title="Map Feed"
          caption="Top cities by current map mode"
          rows={[...mappedCities]
            .sort((a, b) => {
              const aValue = mode === 'drivers' ? a.drivers : mode === 'weather' ? Number(a.weather?.weatherSeverityScore || 0) : Number(a.aqi?.aqi || 0);
              const bValue = mode === 'drivers' ? b.drivers : mode === 'weather' ? Number(b.weather?.weatherSeverityScore || 0) : Number(b.aqi?.aqi || 0);
              return bValue - aValue;
            })
            .slice(0, 12)}
          rowKey={(row) => row.city}
          columns={[
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'state', label: 'State', render: (row) => row.state },
            { key: 'value', label: mode === 'drivers' ? 'Drivers' : mode === 'weather' ? 'Weather Severity' : 'AQI', render: (row) => mode === 'drivers' ? formatNumber(row.drivers) : mode === 'weather' ? (row.weather?.weatherSeverityScore ?? '-') : (row.aqi?.aqi ?? '-') }
          ]}
        />
      </section>
    </div>
  );
}
