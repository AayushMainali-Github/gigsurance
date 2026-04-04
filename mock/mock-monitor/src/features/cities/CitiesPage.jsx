import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';
import { formatNumber } from '../../lib/utils/format';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';

export function CitiesPage() {
  const { city: filteredCity, state } = useMonitorFilters();
  const [selectedCity, setSelectedCity] = useState('');
  const citiesQuery = useQuery({ queryKey: ['cities-page'], queryFn: api.getCities });
  const cities = citiesQuery.data?.data || [];
  const filteredCities = useMemo(() => cities.filter((item) => (!filteredCity || item.city === filteredCity) && (!state || item.state === state)), [cities, filteredCity, state]);
  const activeCity = selectedCity || filteredCity || filteredCities[0]?.city;
  const dashboardQuery = useQuery({ queryKey: ['city-dashboard', activeCity], queryFn: () => api.getCityDashboard(activeCity), enabled: Boolean(activeCity) });
  const summaryQuery = useQuery({ queryKey: ['city-summary', activeCity], queryFn: () => api.getDeliveryCitySummary(activeCity), enabled: Boolean(activeCity) });

  const dashboard = dashboardQuery.data?.data;
  const summary = summaryQuery.data?.data;

  return (
    <div className="dashboard-stack">
      <section className="hero card">
        <div>
          <span className="eyebrow">City Monitoring</span>
          <h2>Operational coverage by city, environment, and platform mix</h2>
          <p>Review city-level fleet presence, current environmental conditions, and the dominant platforms in the selected geography.</p>
        </div>
        <div className="hero-side">
          <div><span>Visible Cities</span><strong>{formatNumber(filteredCities.length)}</strong></div>
          <div><span>Active City</span><strong>{activeCity || 'None'}</strong></div>
        </div>
      </section>
      <section className="metric-grid">
        <StatCard title="Visible Cities" value={formatNumber(filteredCities.length)} subtitle="Cities in current filter state" tone="accent" />
        <StatCard title="Selected City Drivers" value={formatNumber(summary?.drivers || dashboard?.driverCount || 0)} subtitle={activeCity || 'No city selected'} />
        <StatCard title="Latest AQI" value={dashboard?.latestAqi?.aqi ?? '-'} subtitle={dashboard?.latestAqi?.category || 'No AQI loaded'} />
        <StatCard title="Latest Weather" value={dashboard?.latestWeather?.conditionMain || '-'} subtitle={dashboard?.latestWeather ? `${dashboard.latestWeather.tempC} C` : 'No weather loaded'} />
      </section>

      <section className="page-grid">
        <PanelTable
          title="City List"
          caption="Click a city by using the selector in the first column"
          rows={filteredCities}
          rowKey={(row) => row.city}
          columns={[
            { key: 'pick', label: 'Pick', render: (row) => <button className="mini-button" onClick={() => setSelectedCity(row.city)}>{row.city === activeCity ? 'Active' : 'Open'}</button> },
            { key: 'city', label: 'City', render: (row) => row.city },
            { key: 'state', label: 'State', render: (row) => row.state },
            { key: 'tier', label: 'Tier', render: (row) => String(row.cityTier || '').toUpperCase() },
            { key: 'drivers', label: 'Drivers', render: (row) => formatNumber(row.drivers) }
          ]}
        />
        <PanelTable
          title="Platform Mix"
          caption={activeCity ? `Current platform mix in ${activeCity}` : 'Select a city'}
          rows={dashboard?.platformMix || []}
          rowKey={(row) => row._id}
          columns={[
            { key: 'platform', label: 'Platform', render: (row) => row._id },
            { key: 'drivers', label: 'Drivers', render: (row) => formatNumber(row.drivers) }
          ]}
        />
        <PanelTable
          title="City Delivery Summary"
          caption={activeCity ? `Delivery profile for ${activeCity}` : 'Select a city'}
          rows={summary?.platformMix || []}
          rowKey={(row) => row._id}
          columns={[
            { key: 'platform', label: 'Platform', render: (row) => row._id },
            { key: 'drivers', label: 'Drivers', render: (row) => formatNumber(row.drivers) }
          ]}
        />
        <PanelTable
          title="Environmental Snapshot"
          caption={activeCity ? `Latest city conditions for ${activeCity}` : 'Select a city'}
          rows={activeCity ? [{
            weather: dashboard?.latestWeather?.conditionMain || '-',
            temp: dashboard?.latestWeather?.tempC ?? '-',
            aqi: dashboard?.latestAqi?.aqi ?? '-',
            category: dashboard?.latestAqi?.category || '-'
          }] : []}
          rowKey={(_, index) => index}
          columns={[
            { key: 'weather', label: 'Weather', render: (row) => row.weather },
            { key: 'temp', label: 'Temp', render: (row) => row.temp },
            { key: 'aqi', label: 'AQI', render: (row) => row.aqi },
            { key: 'category', label: 'AQI Category', render: (row) => row.category }
          ]}
        />
      </section>
    </div>
  );
}
