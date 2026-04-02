const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function request(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

export const api = {
  getOverview: () => request('/api/overview'),
  getPlatforms: () => request('/api/platforms'),
  getCities: () => request('/api/cities'),
  getCityDashboard: (city) => request(`/api/cities/${encodeURIComponent(city)}/dashboard`),
  getDeliveryDrivers: (query = '') => request(`/api/delivery/drivers${query ? `?${query}` : ''}`),
  getDeliverySummary: (query = '') => request(`/api/delivery/summary${query ? `?${query}` : ''}`),
  getWeatherLatest: (city) => request(`/api/weather/latest${city ? `?city=${encodeURIComponent(city)}` : ''}`),
  getAqiLatest: (city) => request(`/api/aqi/latest${city ? `?city=${encodeURIComponent(city)}` : ''}`),
  getWeatherSnapshots: (query = '') => request(`/api/weather/snapshots${query ? `?${query}` : ''}`),
  getAqiSnapshots: (query = '') => request(`/api/aqi/snapshots${query ? `?${query}` : ''}`)
};
