// Currency formatter
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-US');

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

// Format as currency
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

// Format as compact currency (e.g., $1.2M)
export function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(value);
}

// Format as signed currency with + for positive
export function formatSignedCurrency(value: number): string {
  const formatted = currencyFormatter.format(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted.replace('$', '$')}`;
}

// Format as percentage
export function formatPercent(value: number): string {
  return percentFormatter.format(value / 100);
}

// Format as signed percentage with + for positive
export function formatSignedPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// Format large numbers
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

// Format compact numbers (e.g., 1.2M)
export function formatCompactNumber(value: number): string {
  return compactNumberFormatter.format(value);
}

// Format volume
export function formatVolume(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

// Format market cap
export function formatMarketCap(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  return formatCurrency(value);
}

// Format date
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format date and time
export function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

// Format stock price change for display
export function formatPriceChange(change: number, changePercent: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${formatCurrency(change).replace('$', '$')} (${sign}${changePercent.toFixed(2)}%)`;
}
