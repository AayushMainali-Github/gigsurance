import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Cloud,
  Coins,
  Gauge,
  Layers3,
  MapPin,
  Package,
  Truck,
  Users,
  Wind
} from 'lucide-react';

const iconMap = [
  { match: ['driver', 'user'], icon: Users, badge: 'indigo' },
  { match: ['city', 'map'], icon: MapPin, badge: 'emerald' },
  { match: ['weather', 'rain'], icon: Cloud, badge: 'amber' },
  { match: ['aqi', 'air'], icon: Wind, badge: 'rose' },
  { match: ['platform'], icon: Layers3, badge: 'violet' },
  { match: ['alert', 'critical', 'warning'], icon: AlertTriangle, badge: 'rose' },
  { match: ['gig', 'delivery', 'pickup', 'order'], icon: Truck, badge: 'indigo' },
  { match: ['pay', 'payout'], icon: Coins, badge: 'violet' },
  { match: ['duration', 'latency'], icon: Activity, badge: 'amber' },
  { match: ['severity', 'risk', 'disruption'], icon: Gauge, badge: 'amber' },
  { match: ['snapshot', 'metric'], icon: BarChart3, badge: 'violet' },
  { match: ['bson', 'size'], icon: Package, badge: 'indigo' },
  { match: ['selected'], icon: Building2, badge: 'emerald' }
];

function getCardPresentation(title, tone) {
  const normalized = String(title || '').toLowerCase();
  const found = iconMap.find((item) => item.match.some((token) => normalized.includes(token)));
  if (found) return found;
  if (tone === 'accent') return { icon: BarChart3, badge: 'indigo' };
  return { icon: Activity, badge: 'slate' };
}

export function StatCard({ title, value, subtitle, tone = 'default' }) {
  const { icon: Icon, badge } = getCardPresentation(title, tone);

  return (
    <article className={`stat-card card tone-${tone}`}>
      <div className={`stat-icon-badge badge-${badge}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <span className="stat-title">{title}</span>
      <strong className="stat-value">{value}</strong>
      {subtitle ? <span className="stat-subtitle">{subtitle}</span> : null}
    </article>
  );
}
