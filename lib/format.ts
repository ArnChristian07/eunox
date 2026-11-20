export function formatMoney(amount: number, symbol: string, decimals = 2): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** 1240 -> "1.2k", 16200 -> "16.2k", 950 -> "950". */
export function formatCompactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (abs >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return Math.round(n).toLocaleString('en-US');
}

/** Parses user-typed amounts like "1,250.50" or "₱300". Returns 0 when invalid. */
export function parseAmount(text: string): number {
  const value = parseFloat(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) ? value : 0;
}
