import { ResponsiveContainer } from 'recharts';

export function ChartPanel({ title, caption, children }) {
  return (
    <section className="card panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          {caption ? <span className="panel-caption">{caption}</span> : null}
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
