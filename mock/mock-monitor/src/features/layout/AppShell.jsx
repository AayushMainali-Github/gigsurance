import { NavLink } from 'react-router-dom';
import { FilterBar } from './FilterBar';

const navItems = [
  ['Overview', '/overview'],
  ['Delivery Ops', '/delivery'],
  ['Weather', '/weather'],
  ['AQI', '/aqi'],
  ['Platforms', '/platforms'],
  ['Cities', '/cities'],
  ['Drivers', '/drivers'],
  ['Live Orders', '/live'],
  ['Analytics', '/analytics'],
  ['Maps', '/maps'],
  ['Alerts', '/alerts']
];

export function AppShell({ children }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">MM</div>
          <div>
            <div className="brand-title">Mock Monitor</div>
            <div className="brand-subtitle">Ops Console</div>
          </div>
        </div>
        <nav className="nav">
          {navItems.map(([label, to]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <h1>Operations Monitor</h1>
            <p>Initial phase shell over the mock API.</p>
          </div>
        </header>
        <FilterBar />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
