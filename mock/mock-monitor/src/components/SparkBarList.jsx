export function SparkBarList({ title, items, valueKey, labelKey, formatter = (value) => value }) {
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);
  return (
    <section className="card panel">
      <div className="panel-header">
        <div><h2>{title}</h2></div>
        <span className="panel-meta">{items.length} items</span>
      </div>
      <div className="bar-list">
        {items.length ? items.map((item) => {
          const value = Number(item[valueKey] || 0);
          const width = Math.max(6, (value / maxValue) * 100);
          return (
            <div key={`${item[labelKey]}-${value}`} className="bar-row">
              <div className="bar-row-head">
                <span>{item[labelKey]}</span>
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
