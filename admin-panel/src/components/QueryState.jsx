export function QueryState({ isLoading, error, children }) {
  if (isLoading) {
    return (
      <section className="card panel">
        <div className="panel-header">
          <div className="panel-heading">
            <span className="eyebrow">Loading</span>
            <h2>Fetching live backend data</h2>
          </div>
        </div>
        <div className="panel-body">
          <p className="panel-copy">The admin surface is pulling the latest finance and operations records.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card panel">
        <div className="panel-header">
          <div className="panel-heading">
            <span className="eyebrow">Error</span>
            <h2>Backend data is unavailable</h2>
          </div>
        </div>
        <div className="panel-body">
          <p className="panel-copy">{error.message}</p>
        </div>
      </section>
    );
  }

  return children;
}
