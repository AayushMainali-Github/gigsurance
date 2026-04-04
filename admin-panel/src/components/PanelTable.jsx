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
import { formatDisplayValue, formatLabel } from '../lib/utils/format';

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
  return <span className={`table-badge table-badge-${tone}`}>{formatLabel(value)}</span>;
}

function renderCategoryBadge(value) {
  return <span className="table-badge table-badge-neutral">{formatLabel(value)}</span>;
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
      <span>{formatDisplayValue(value)}</span>
    </span>
  );
}

function renderCell(column, value) {
  if (isValidElement(value)) return value;

  const label = column.label;
  const normalizedLabel = String(label || '').toLowerCase();
  const Icon = getCellIcon(label);
  const stringValue = value == null ? '-' : String(value);
  const displayValue = formatDisplayValue(stringValue);

  if (normalizedLabel.includes('tier')) return renderTierBadge(stringValue);
  if (normalizedLabel.includes('category')) return renderCategoryBadge(stringValue);
  if (normalizedLabel.includes('status')) return renderCategoryBadge(stringValue);
  if (['severity', 'risk', 'disruption', 'aqi'].some((token) => normalizedLabel.includes(token))) return renderMetricChip(label, stringValue);
  if (normalizedLabel.includes('type')) return renderCategoryBadge(stringValue);

  if (['city', 'state', 'platform', 'driver', 'gig', 'type', 'weather', 'alert'].some((token) => normalizedLabel.includes(token))) {
    return (
      <span className="cell-identity">
        <Icon size={14} strokeWidth={2} />
        <span>{displayValue}</span>
      </span>
    );
  }

  if (isNumericColumn(label, value)) {
    return <span className="cell-numeric">{stringValue}</span>;
  }

  return <span className="cell-secondary">{displayValue}</span>;
}

export function PanelTable({
  title,
  caption,
  columns,
  rows,
  rowKey,
  onRowClick,
  selectedRowKey,
  pagination
}) {
  const Icon = getPanelIcon(title);
  const totalRows = pagination?.total ?? rows.length;
  const currentPage = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 1;
  const startRow = totalRows ? ((currentPage - 1) * (pagination?.limit ?? rows.length)) + 1 : 0;
  const endRow = totalRows ? Math.min(startRow + rows.length - 1, totalRows) : 0;

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
        <span className="panel-meta">{totalRows} total</span>
      </div>
      <div className="table-wrap panel-scroll-body">
        <table className="panel-table">
          <thead>
            <tr>
              {columns.map((column) => <th key={column.key}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr
                key={rowKey ? rowKey(row, index) : index}
                className={selectedRowKey != null && selectedRowKey === (rowKey ? rowKey(row, index) : index) ? 'table-row-selected' : ''}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onRowClick(row, index);
                  }
                } : undefined}
              >
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
      {pagination ? (
        <div className="panel-pagination">
          <span className="panel-pagination-copy">
            Showing {startRow}-{endRow} of {totalRows}
          </span>
          <div className="panel-pagination-controls">
            <button type="button" className="mini-button" onClick={() => pagination.onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
              Previous
            </button>
            <span className="panel-pagination-copy">Page {currentPage} of {totalPages}</span>
            <button type="button" className="mini-button" onClick={() => pagination.onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
