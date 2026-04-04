export function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(value ?? 0);
}

export function formatLabel(value) {
  if (!value) return 'All';
  const normalized = String(value).replaceAll('_', ' ').trim();
  if (!normalized) return 'All';
  return normalized
    .replace(/tier\s*(\d+)/gi, 'Tier $1')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
