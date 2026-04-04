const demoCards = [
  {
    id: 'one',
    label: 'Demo One',
    title: 'Finance Admin Panel',
    description: 'Open the company finance console for premiums, payouts, reviews, and cash posture.',
    href: import.meta.env.VITE_DEMO_LINK_ONE || '#'
  },
  {
    id: 'two',
    label: 'Demo Two',
    title: 'Mock Monitor Panel',
    description: 'Open the operational mock monitor for live-ish delivery, disruption, weather, and AQI data.',
    href: import.meta.env.VITE_DEMO_LINK_TWO || '#'
  }
];

function LinkCard({ label, title, description, href }) {
  const disabled = !href || href === '#';

  return (
    <article className="demo-card">
      <span className="demo-card-label">{label}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <a
        className={`demo-card-link${disabled ? ' is-disabled' : ''}`}
        href={disabled ? undefined : href}
        target={disabled ? undefined : '_blank'}
        rel={disabled ? undefined : 'noreferrer'}
        aria-disabled={disabled}
      >
        {disabled ? 'Link not set' : 'Open demo'}
      </a>
    </article>
  );
}

export function App() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <span className="eyebrow">GIGSurance demos</span>
        <h1>Choose a demo surface.</h1>
        <p>
          Simple launch page for the two admin-facing demos. Links are driven by the local
          environment file.
        </p>
      </section>

      <section className="card-grid">
        {demoCards.map((card) => (
          <LinkCard key={card.id} {...card} />
        ))}
      </section>
    </main>
  );
}
