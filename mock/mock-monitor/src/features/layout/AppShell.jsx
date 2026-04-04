import { NavLink, useLocation } from 'react-router-dom';
import { FilterBar } from './FilterBar';

const navItems = [
  { label: 'Overview', to: '/overview', description: 'Network health and key aggregates' },
  { label: 'Delivery Ops', to: '/delivery', description: 'Fleet and payout activity' },
  { label: 'Weather', to: '/weather', description: 'Operational weather conditions' },
  { label: 'AQI', to: '/aqi', description: 'Air quality pressure by city' },
  { label: 'Platforms', to: '/platforms', description: 'Platform mix and coverage' },
  { label: 'Cities', to: '/cities', description: 'City-level operating view' },
  { label: 'Drivers', to: '/drivers', description: 'Driver profiles and exposure' },
  { label: 'Live Orders', to: '/live', description: 'Current order flow and alerts' },
  { label: 'Analytics', to: '/analytics', description: 'Joined performance relationships' },
  { label: 'Maps', to: '/maps', description: 'Geographic monitoring surface' },
  { label: 'Alerts', to: '/alerts', description: 'Signals requiring attention' }
];

const routeMeta = Object.fromEntries(
  navItems.map((item) => [item.to, { title: item.label, description: item.description }])
);

export function AppShell({ children }) {
  const location = useLocation();
  const currentRoute = routeMeta[location.pathname] || {
    title: 'Mock Monitor',
    description: 'Operational monitoring workspace'
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">MM</div>
          <div>
            <div className="brand-title">Mock Monitor</div>
            <div className="brand-subtitle">Monitoring Workspace</div>
          </div>
        </div>
        <div className="sidebar-intro card">
          <span className="eyebrow">Interface Refresh</span>
          <p>Cleaner read paths for weather, fleet, payout, and city-level mock signals.</p>
        </div>
        <nav className="nav">
          {navItems.map(({ label, to, description }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span className="nav-link-label">{label}</span>
              <span className="nav-link-description">{description}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">Mock Data Console</span>
            <h1>{currentRoute.title}</h1>
            <p>{currentRoute.description}</p>
          </div>
        </header>
        <FilterBar />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
