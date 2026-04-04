export function DetailPanel({ title, caption, item, fields, emptyMessage = 'Select a row to inspect it.' }) {
  return (
    <section className="card panel">
      <div className="panel-header">
        <div className="panel-heading">
          <div className="panel-title-row">
            <h2>{title}</h2>
          </div>
          {caption ? <span className="panel-caption">{caption}</span> : null}
        </div>
      </div>
      <div className="detail-panel-body">
        {!item ? (
          <p className="panel-copy">{emptyMessage}</p>
        ) : (
          <div className="detail-grid">
            {fields.map((field) => (
              <div key={field.key} className="detail-item">
                <span>{field.label}</span>
                <strong>{field.render ? field.render(item) : item[field.key] ?? '-'}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function DetailActions({ title = 'Actions', caption, children }) {
  return (
    <section className="card panel">
      <div className="panel-header">
        <div className="panel-heading">
          <div className="panel-title-row">
            <h2>{title}</h2>
          </div>
          {caption ? <span className="panel-caption">{caption}</span> : null}
        </div>
      </div>
      <div className="detail-panel-body">
        <div className="action-stack">
          {children}
        </div>
      </div>
    </section>
  );
}
