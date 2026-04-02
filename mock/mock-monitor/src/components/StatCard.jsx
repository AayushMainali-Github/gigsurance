export function StatCard({ title, value, subtitle, tone = 'default' }) {
  return (
    <article className={`stat-card card tone-${tone}`}>
      <span className="stat-title">{title}</span>
      <strong className="stat-value">{value}</strong>
      {subtitle ? <span className="stat-subtitle">{subtitle}</span> : null}
    </article>
  );
}
