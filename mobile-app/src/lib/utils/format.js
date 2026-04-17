export function titleCase(value) {
  if (!value) return '';

  return String(value)
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

export function formatTierLabel(value) {
  if (!value) return '';
  const normalized = String(value).trim().toLowerCase();

  if (normalized === 'tier1') return 'Tier 1';
  if (normalized === 'tier2') return 'Tier 2';
  if (normalized === 'tier3') return 'Tier 3';

  return titleCase(normalized);
}

export function formatStatusLabel(value) {
  if (!value) return 'Unknown';
  return titleCase(value);
}

export function formatPlatformLabel(value) {
  if (!value) return 'Unknown Platform';
  return titleCase(value);
}

export function formatCurrencyInr(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return 'Rs 0';
  }

  return `Rs ${Number(value)}`;
}

export function getStatusTone(status) {
  const normalized = String(status || '').toLowerCase();

  if (['active', 'approved', 'paid', 'linked', 'enrolled', 'success'].includes(normalized)) {
    return 'success';
  }

  if (['held', 'paused', 'pending', 'investigating', 'review', 'warning'].includes(normalized)) {
    return 'warning';
  }

  if (['failed', 'cancelled', 'not eligible', 'not_eligible', 'suspended', 'danger'].includes(normalized)) {
    return 'danger';
  }

  if (['quoted', 'current', 'info'].includes(normalized)) {
    return 'info';
  }

  return 'neutral';
}
