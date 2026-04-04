import { formatDisplayValue } from '../lib/utils/format';

export function SparkBarList({ title, caption, rows, valueKey = 'value', labelKey = 'label' }) {
  const maxValue = rows.length ? Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1) : 1;

  return (
    <section className="card panel">
      <div className="panel-header">
        <div className="panel-heading">
          <div className="panel-title-row">
            <h2>{title}</h2>
          </div>
          {caption ? <span className="panel-caption">{caption}</span> : null}
        </div>
        <span className="panel-meta">{rows.length} rows</span>
      </div>
      <div className="bar-list panel-scroll-body-bars">
        {rows.length ? rows.map((row, index) => {
          const width = `${Math.max(8, (Number(row[valueKey] || 0) / maxValue) * 100)}%`;
          return (
            <div className="bar-row" key={row.id || row[labelKey] || index}>
              <div className="bar-row-head">
                <span className="bar-row-label">{formatDisplayValue(row[labelKey])}</span>
                <strong>{formatDisplayValue(row.displayValue ?? row[valueKey])}</strong>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width }} />
              </div>
            </div>
          );
        }) : (
          <div className="empty-state-inline">No ranked data in the current slice.</div>
        )}
      </div>
    </section>
  );
}
