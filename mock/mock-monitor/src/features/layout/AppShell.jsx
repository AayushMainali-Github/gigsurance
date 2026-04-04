import {
  Bell,
  BarChart3,
  Cloud,
  Layers3,
  LayoutDashboard,
  Map,
  MapPin,
  ShoppingCart,
  Truck,
  Users,
  Wind
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { FilterBar } from './FilterBar';

const navItems = [
  { label: 'Overview', to: '/overview', description: 'Network health and key aggregates', icon: LayoutDashboard, group: 'core' },
  { label: 'Delivery Ops', to: '/delivery', description: 'Fleet and payout activity', icon: Truck, group: 'core' },
  { label: 'Live Orders', to: '/live', description: 'Current order flow and alerts', icon: ShoppingCart, group: 'core' },
  { label: 'Drivers', to: '/drivers', description: 'Driver profiles and exposure', icon: Users, group: 'core' },
  { label: 'Cities', to: '/cities', description: 'City-level operating view', icon: MapPin, group: 'network' },
  { label: 'Platforms', to: '/platforms', description: 'Platform mix and coverage', icon: Layers3, group: 'network' },
  { label: 'Weather', to: '/weather', description: 'Operational weather conditions', icon: Cloud, group: 'signals' },
  { label: 'AQI', to: '/aqi', description: 'Air quality pressure by city', icon: Wind, group: 'signals' },
  { label: 'Analytics', to: '/analytics', description: 'Joined performance relationships', icon: BarChart3, group: 'insight' },
  { label: 'Maps', to: '/maps', description: 'Geographic monitoring surface', icon: Map, group: 'insight' },
  { label: 'Alerts', to: '/alerts', description: 'Signals requiring attention', icon: Bell, group: 'insight' }
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
            <div className="brand-title">
              Mock Monitor
              <span className="brand-status-dot" aria-hidden="true" />
            </div>
            <div className="brand-subtitle">Monitoring Workspace</div>
          </div>
        </div>
        <div className="sidebar-intro card">
          <span className="eyebrow">Interface Refresh</span>
          <p>Cleaner read paths for weather, fleet, payout, and city-level mock signals.</p>
        </div>
        <nav className="nav">
          {navItems.map(({ label, to, description, icon: Icon, group }, index) => (
            <div key={to}>
              {index > 0 && navItems[index - 1].group !== group ? <div className="nav-divider" /> : null}
              <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <span className="nav-link-main">
                  <Icon size={16} strokeWidth={2} />
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
