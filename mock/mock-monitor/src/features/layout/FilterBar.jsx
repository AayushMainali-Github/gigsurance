import { formatDisplayValue } from '../../lib/utils/format';
import { Building2, MapPin, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api/client';
import { useMonitorFilters } from '../../store/filters';

export function FilterBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { city, platformName, state, setFilter, setFilters, resetFilters } = useMonitorFilters();
  const citiesQuery = useQuery({ queryKey: ['cities-filter'], queryFn: api.getCities });
  const platformsQuery = useQuery({ queryKey: ['platforms-filter'], queryFn: api.getPlatforms });

  const cities = citiesQuery.data?.data || [];
  const platforms = platformsQuery.data?.data || [];
  const states = Array.from(new Set(cities.map((item) => item.state))).sort();

  useEffect(() => {
    setFilters({
      city: searchParams.get('city') || '',
      platformName: searchParams.get('platformName') || '',
      state: searchParams.get('state') || ''
    });
  }, [searchParams, setFilters]);

  function updateFilter(key, value) {
    setFilter(key, value);
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    resetFilters();
    setSearchParams({}, { replace: true });
  }

  return (
    <section className="filter-bar card">
      <div className="filter-copy panel-heading">
        <span className="eyebrow">Scope</span>
        <p>Focus the monitor by city, platform, or state. All data views update in place.</p>
      </div>
      <div className="filter-group">
        <label><MapPin size={14} strokeWidth={2} /> City</label>
        <select value={city} onChange={(event) => updateFilter('city', event.target.value)}>
          <option value="">All cities</option>
          {cities.map((item) => (
            <option key={item.city} value={item.city}>{formatDisplayValue(item.city)}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label><Building2 size={14} strokeWidth={2} /> Platform</label>
        <select value={platformName} onChange={(event) => updateFilter('platformName', event.target.value)}>
          <option value="">All platforms</option>
          {platforms.map((item) => (
            <option key={item} value={item}>{formatDisplayValue(item)}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label><MapPin size={14} strokeWidth={2} /> State</label>
        <select value={state} onChange={(event) => updateFilter('state', event.target.value)}>
          <option value="">All states</option>
          {states.map((item) => (
            <option key={item} value={item}>{formatDisplayValue(item)}</option>
          ))}
        </select>
      </div>
      <button className="reset-button" onClick={clearFilters}>
        <RotateCcw size={16} strokeWidth={2} />
        <span>Reset Filters</span>
      </button>
    </section>
  );
}
