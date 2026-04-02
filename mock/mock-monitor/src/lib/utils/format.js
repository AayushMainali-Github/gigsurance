export function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(value ?? 0);
}

export function formatLabel(value) {
  if (!value) return 'All';
  return value;
}
