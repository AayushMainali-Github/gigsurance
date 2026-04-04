import { NavLink, useLocation } from 'react-router-dom';
import { FilterBar } from './FilterBar';

const navItems = [
  { label: 'Overview', to: '/overview', description: 'Network health and key aggregates', group: 'core' },
  { label: 'Delivery Ops', to: '/delivery', description: 'Fleet and payout activity', group: 'core' },
  { label: 'Live Orders', to: '/live', description: 'Current order flow and alerts', group: 'core' },
  { label: 'Drivers', to: '/drivers', description: 'Driver profiles and exposure', group: 'core' },
  { label: 'Cities', to: '/cities', description: 'City-level operating view', group: 'network' },
  { label: 'Platforms', to: '/platforms', description: 'Platform mix and coverage', group: 'network' },
  { label: 'Weather', to: '/weather', description: 'Operational weather conditions', group: 'signals' },
  { label: 'AQI', to: '/aqi', description: 'Air quality pressure by city', group: 'signals' },
  { label: 'Analytics', to: '/analytics', description: 'Joined performance relationships', group: 'insight' },
  { label: 'Maps', to: '/maps', description: 'Geographic monitoring surface', group: 'insight' },
  { label: 'Alerts', to: '/alerts', description: 'Signals requiring attention', group: 'insight' }
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
          <div className="brand-copy">
            <div className="brand-title">
              Gigsurance mock-monitor
            </div>
            <div className="brand-subtitle">Monitoring Workspace</div>
          </div>
        </div>
        <nav className="nav">
          {navItems.map(({ label, to, description, group }, index) => (
            <div key={to}>
              {index > 0 && navItems[index - 1].group !== group ? <div className="nav-divider" /> : null}
              <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <span className="nav-link-main">
                  <span className="nav-link-label">{label}</span>
                </span>
                <span className="nav-link-description">{description}</span>
              </NavLink>
            </div>
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
