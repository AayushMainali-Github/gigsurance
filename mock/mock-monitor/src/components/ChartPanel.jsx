import { BarChart3, Cloud, GitBranch, Map, ScatterChart, ShieldAlert, Truck, Wind } from 'lucide-react';
import { ResponsiveContainer } from 'recharts';

function getPanelIcon(title) {
  const normalized = String(title || '').toLowerCase();
  if (normalized.includes('weather')) return Cloud;
  if (normalized.includes('aqi')) return Wind;
  if (normalized.includes('delivery') || normalized.includes('gig')) return Truck;
  if (normalized.includes('correlation') || normalized.includes('scatter')) return ScatterChart;
  if (normalized.includes('map')) return Map;
  if (normalized.includes('disruption') || normalized.includes('risk')) return ShieldAlert;
  if (normalized.includes('trend')) return GitBranch;
  return BarChart3;
}

export function ChartPanel({ title, caption, children }) {
  const Icon = getPanelIcon(title);

  return (
    <section className="card panel">
      <div className="panel-header">
        <div className="panel-heading">
          <div className="panel-title-row">
            <span className="panel-icon"><Icon size={16} strokeWidth={2} /></span>
            <h2>{title}</h2>
          </div>
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
