import { isValidElement } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Cloud,
  Layers3,
  LayoutList,
  Map,
  MapPin,
  Package,
  ShieldAlert,
  Truck,
  UserRound,
  Wind
} from 'lucide-react';

function getPanelIcon(title) {
  const normalized = String(title || '').toLowerCase();
  if (normalized.includes('city')) return MapPin;
  if (normalized.includes('weather')) return Cloud;
  if (normalized.includes('aqi')) return Wind;
  if (normalized.includes('platform')) return Layers3;
  if (normalized.includes('driver')) return UserRound;
  if (normalized.includes('alert')) return AlertTriangle;
  if (normalized.includes('map')) return Map;
  if (normalized.includes('delivery') || normalized.includes('gig') || normalized.includes('order')) return Truck;
  if (normalized.includes('risk') || normalized.includes('disruption')) return ShieldAlert;
  if (normalized.includes('snapshot')) return Activity;
  return LayoutList;
}

function getCellIcon(label) {
  const normalized = String(label || '').toLowerCase();
  if (normalized.includes('city') || normalized.includes('state')) return MapPin;
  if (normalized.includes('platform')) return Layers3;
  if (normalized.includes('driver') || normalized.includes('archetype') || normalized.includes('shift')) return UserRound;
  if (normalized.includes('weather')) return Cloud;
  if (normalized.includes('aqi') || normalized.includes('pm')) return Wind;
  if (normalized.includes('gig') || normalized.includes('delivery') || normalized.includes('eta')) return Truck;
  if (normalized.includes('alert') || normalized.includes('severity') || normalized.includes('risk') || normalized.includes('disruption')) return ShieldAlert;
  if (normalized.includes('category') || normalized.includes('type')) return Package;
  if (normalized.includes('date') || normalized.includes('time') || normalized.includes('timestamp')) return Activity;
  return Building2;
}

function isNumericColumn(label, value) {
  const normalized = String(label || '').toLowerCase();
  if (typeof value === 'number') return true;
  return ['drivers', 'gigs', 'pay', 'duration', 'aqi', 'severity', 'risk', 'disruption', 'orders', 'count', 'rows', 'live', 'temp'].some((token) => normalized.includes(token));
}

function renderTierBadge(value) {
  const normalized = String(value || '').toLowerCase();
  const tone = normalized === 'tier1' ? 'tier1' : normalized === 'tier2' ? 'tier2' : 'tier3';
  return <span className={`table-badge table-badge-${tone}`}>{String(value || '').toUpperCase()}</span>;
}

function renderCategoryBadge(value) {
  return <span className="table-badge table-badge-neutral">{String(value || '').replaceAll('_', ' ')}</span>;
}

function renderMetricChip(label, value) {
  const normalized = String(label || '').toLowerCase();
  const Icon = getCellIcon(label);
  const tone = normalized.includes('aqi')
    ? 'rose'
    : normalized.includes('weather') || normalized.includes('severity') || normalized.includes('risk')
      ? 'amber'
      : 'indigo';

  return (
    <span className={`metric-chip metric-chip-${tone}`}>
      <Icon size={14} strokeWidth={2} />
      <span>{String(value == null ? '-' : value)}</span>
    </span>
  );
}

function renderCell(column, value) {
  if (isValidElement(value)) return value;

  const label = column.label;
  const normalizedLabel = String(label || '').toLowerCase();
  const Icon = getCellIcon(label);
  const stringValue = value == null ? '-' : String(value);

  if (normalizedLabel.includes('tier')) return renderTierBadge(stringValue);
  if (normalizedLabel.includes('category')) return renderCategoryBadge(stringValue);
  if (['severity', 'risk', 'disruption', 'aqi'].some((token) => normalizedLabel.includes(token))) return renderMetricChip(label, stringValue);

  if (['city', 'state', 'platform', 'driver', 'gig', 'type', 'weather', 'alert'].some((token) => normalizedLabel.includes(token))) {
    return (
      <span className="cell-identity">
        <Icon size={14} strokeWidth={2} />
        <span>{stringValue}</span>
      </span>
    );
  }

  if (isNumericColumn(label, value)) {
    return <span className="cell-numeric">{stringValue}</span>;
  }

  return <span className="cell-secondary">{stringValue}</span>;
}

export function PanelTable({ title, caption, columns, rows, rowKey }) {
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
        <span className="panel-meta">{rows.length} rows</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => <th key={column.key}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={rowKey ? rowKey(row, index) : index}>
                {columns.map((column) => {
                  const rendered = column.render(row, index);
                  return <td key={column.key}>{renderCell(column, rendered)}</td>;
                })}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="empty-cell">No data for the current filter state.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
