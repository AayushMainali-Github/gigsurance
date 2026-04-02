export function PanelTable({ title, caption, columns, rows, rowKey }) {
  return (
    <section className="card panel">
      <div className="panel-header">
        <h2>{title}</h2>
        {caption ? <span className="panel-caption">{caption}</span> : null}
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
                {columns.map((column) => <td key={column.key}>{column.render(row, index)}</td>)}
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
