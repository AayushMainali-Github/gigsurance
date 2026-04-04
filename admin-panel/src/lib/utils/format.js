export function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(value ?? 0);
}

export function formatCurrency(value) {
  return `Rs ${formatNumber(value ?? 0)}`;
}

export function formatLabel(value) {
  if (!value) return 'All';
  const normalized = String(value).replaceAll('_', ' ').trim();
  if (!normalized) return 'All';
  return normalized
    .replace(/tier\s*(\d+)/gi, 'Tier $1')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bAqi\b/g, 'AQI')
    .replace(/\bApi\b/g, 'API')
    .replace(/\bId\b/g, 'ID')
    .replace(/\bMm\b/g, 'MM');
}

export function formatDisplayValue(value) {
  if (value == null) return '-';
  if (typeof value === 'number') return String(value);

  const normalized = String(value).trim();
  if (!normalized) return '-';

  if (/^-?\d+(\.\d+)?$/.test(normalized)) return normalized;

  return formatLabel(normalized);
}
