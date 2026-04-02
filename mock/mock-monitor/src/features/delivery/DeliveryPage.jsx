import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';
import { formatNumber } from '../../lib/utils/format';

export function DeliveryPage() {
  const { city, platformName, state } = useMonitorFilters();
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (platformName) params.set('platformName', platformName);
    if (state) params.set('state', state);
    params.set('limit', '20');
    params.set('sortBy', 'joinedAt');
    return params.toString();
  }, [city, platformName, state]);

  const driversQuery = useQuery({ queryKey: ['delivery-drivers', query], queryFn: () => api.getDeliveryDrivers(query) });
  const summaryQuery = useQuery({ queryKey: ['delivery-summary', query], queryFn: () => api.getDeliverySummary(query) });

  const drivers = driversQuery.data?.data || [];
  const driverCounts = summaryQuery.data?.data?.driverCounts || [];
  const historyStats = summaryQuery.data?.data?.historyStats || [];

  return (
    <div className="page-grid">
      <section className="card panel">
        <div className="panel-header"><h2>Driver Slice</h2><span>{formatNumber(driversQuery.data?.total || 0)} matching drivers</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Driver</th><th>Platform</th><th>City</th><th>Tier</th><th>Archetype</th></tr></thead>
            <tbody>
              {drivers.map((item) => (
                <tr key={`${item.platformName}-${item.platformDriverId}`}>
                  <td>{item.platformDriverId}</td><td>{item.platformName}</td><td>{item.city}</td><td>{item.cityTier}</td><td>{item.driverProfile?.archetype}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card panel">
        <div className="panel-header"><h2>Driver Counts by Platform</h2></div>
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

      <section className="card panel span-2">
        <div className="panel-header"><h2>Gig Metrics by Platform</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Platform</th><th>Gigs</th><th>Avg Pay</th><th>Avg Duration</th></tr></thead>
            <tbody>
              {historyStats.map((item) => (
                <tr key={item._id}><td>{item._id}</td><td>{formatNumber(item.gigs)}</td><td>{Number(item.avgAmountPaid || 0).toFixed(2)}</td><td>{Number(item.avgDurationMinutes || 0).toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
