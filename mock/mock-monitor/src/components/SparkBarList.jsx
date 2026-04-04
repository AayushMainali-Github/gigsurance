import { BarChart3, Building2, Cloud, Layers3, MapPin, Shapes, Wind } from 'lucide-react';

function getPanelIcon(title) {
  const normalized = String(title || '').toLowerCase();
  if (normalized.includes('platform')) return Layers3;
  if (normalized.includes('city')) return MapPin;
  if (normalized.includes('weather')) return Cloud;
  if (normalized.includes('aqi')) return Wind;
  if (normalized.includes('tier')) return Shapes;
  if (normalized.includes('directory')) return Building2;
  return BarChart3;
}

export function SparkBarList({ title, items, valueKey, labelKey, formatter = (value) => value }) {
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);
  const Icon = getPanelIcon(title);

  return (
    <section className="card panel">
      <div className="panel-header">
        <div className="panel-heading">
          <div className="panel-title-row">
            <span className="panel-icon"><Icon size={16} strokeWidth={2} /></span>
            <h2>{title}</h2>
          </div>
        </div>
        <span className="panel-meta">{items.length} items</span>
      </div>
      <div className="bar-list">
        {items.length ? items.map((item) => {
          const value = Number(item[valueKey] || 0);
          const width = Math.max(6, (value / maxValue) * 100);
          return (
            <div key={`${item[labelKey]}-${value}`} className="bar-row">
              <div className="bar-row-head">
                <span className="bar-row-label">{item[labelKey]}</span>
                <strong>{formatter(value)}</strong>
              </div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${width}%` }} /></div>
            </div>
          );
        }) : <div className="empty-state-inline">No distribution data available.</div>}
      </div>
    </section>
  );
}
