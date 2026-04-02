export function PlaceholderPage({ title, description }) {
  return (
    <section className="card placeholder-card">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
