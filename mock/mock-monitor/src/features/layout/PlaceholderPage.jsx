import { FileStack } from 'lucide-react';

export function PlaceholderPage({ title, description }) {
  return (
    <section className="card placeholder-card">
      <div className="panel-title-row">
        <span className="panel-icon"><FileStack size={18} strokeWidth={2} /></span>
        <h2>{title}</h2>
      </div>
      <p>{description}</p>
    </section>
  );
}
