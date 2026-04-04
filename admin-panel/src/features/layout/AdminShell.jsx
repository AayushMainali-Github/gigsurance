import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Overview', to: '/overview', description: 'Finance posture and company state', group: 'money' },
  { label: 'Premiums', to: '/premiums', description: 'Premium queue and invoices', group: 'money' },
  { label: 'Payouts', to: '/payouts', description: 'Payout queue and liabilities', group: 'money' },
  { label: 'Finance', to: '/finance', description: 'Profit, margin, and balances', group: 'money' },
  { label: 'Reviews', to: '/reviews', description: 'Trust and review visibility', group: 'money' }
];

const routeMeta = Object.fromEntries(navItems.map((item) => [item.to, item]));

export function AdminShell() {
  const location = useLocation();
  const currentRoute = routeMeta[location.pathname] || {
    label: 'Admin Panel',
    description: 'Finance and insurance operations workspace'
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AP</div>
          <div className="brand-copy">
            <div className="brand-title">Gigsurance admin-panel</div>
            <div className="brand-subtitle">Company Finance Workspace</div>
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
            <span className="eyebrow">Company Console</span>
            <h1>{currentRoute.label}</h1>
            <p>{currentRoute.description}</p>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
