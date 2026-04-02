import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';

export function FilterBar() {
  const { city, platformName, state, setFilter, resetFilters } = useMonitorFilters();
  const citiesQuery = useQuery({ queryKey: ['cities-filter'], queryFn: api.getCities });
  const platformsQuery = useQuery({ queryKey: ['platforms-filter'], queryFn: api.getPlatforms });

  const cities = citiesQuery.data?.data || [];
  const platforms = platformsQuery.data?.data || [];
  const states = Array.from(new Set(cities.map((item) => item.state))).sort();

  return (
    <section className="filter-bar card">
      <div className="filter-group">
        <label>City</label>
        <select value={city} onChange={(event) => setFilter('city', event.target.value)}>
          <option value="">All cities</option>
          {cities.map((item) => (
            <option key={item.city} value={item.city}>{item.city}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Platform</label>
        <select value={platformName} onChange={(event) => setFilter('platformName', event.target.value)}>
          <option value="">All platforms</option>
          {platforms.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>State</label>
        <select value={state} onChange={(event) => setFilter('state', event.target.value)}>
          <option value="">All states</option>
          {states.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>
      <button className="reset-button" onClick={resetFilters}>Reset Filters</button>
    </section>
  );
}
