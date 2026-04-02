import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';
import { formatNumber } from '../../lib/utils/format';
import { StatCard } from '../../components/StatCard';
import { PanelTable } from '../../components/PanelTable';

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
  const detail = detailQuery.data?.data;
  const recentHistory = detail?.history || [];

  return (
    <div className="dashboard-stack">
      <section className="metric-grid">
        <StatCard title="Visible Drivers" value={formatNumber(driversQuery.data?.total || 0)} subtitle="Current filtered result set" tone="accent" />
        <StatCard title="Selected Driver" value={detail?.platformDriverId || '-'} subtitle={detail?.platformName || 'No driver selected'} />
        <StatCard title="Recent History Rows" value={formatNumber(recentHistory.length)} subtitle="Loaded driver history sample" />
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
            { key: 'tier', label: 'Tier', render: (row) => row.tier },
            { key: 'archetype', label: 'Archetype', render: (row) => row.archetype },
            { key: 'shift', label: 'Shift', render: (row) => row.shift },
            { key: 'sensitivity', label: 'Sensitivity', render: (row) => row.sensitivity },
            { key: 'loyalty', label: 'Loyalty', render: (row) => row.loyalty }
          ]}
        />
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
