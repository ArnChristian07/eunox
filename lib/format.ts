export const MAX_MONEY_AMOUNT = 999_999_999.99;

/** Converts a major-unit amount (e.g. 12.34) to integer minor units (1234). */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  const cents = Math.round(amount * 100);
  return cents === 0 ? 0 : cents;
}

/** Converts integer minor units (1234) back to major units (12.34), avoiding -0. */
export function fromCents(cents: number): number {
  if (!Number.isFinite(cents) || cents === 0) return 0;
  return Math.round(cents) / 100;
}

/** Rounds a monetary amount to 2 decimal places using integer minor units. */
export function roundMoney(amount: number): number {
  return fromCents(toCents(amount));
}

/** Exact addition of two monetary amounts in integer minor units. */
export function addMoney(a: number, b: number): number {
  return fromCents(toCents(a) + toCents(b));
}

/** Exact subtraction of two monetary amounts in integer minor units. */
export function subMoney(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b));
}

/** Exact summation of monetary amounts in integer minor units. */
export function sumMoney(amounts: readonly number[]): number {
  let totalCents = 0;
  for (const amt of amounts) {
    totalCents += toCents(amt);
  }
  return fromCents(totalCents);
}

/** True when amount is finite, within bounds, and strictly greater than 0 cents. */
export function isValidPositiveAmount(amount: number): boolean {
  if (!Number.isFinite(amount)) return false;
  const cents = toCents(amount);
  return cents > 0 && Math.abs(amount) <= MAX_MONEY_AMOUNT;
}

/** True when amount is finite and within bounds (may be negative or zero). */
export function isValidFiniteAmount(amount: number): boolean {
  return Number.isFinite(amount) && Math.abs(amount) <= MAX_MONEY_AMOUNT;
}

/**
 * Splits a monetary amount into sign, formatted whole part, and 2-digit decimal part.
 * Safely handles negative values (never drops '-' on -0.50) and avoids -0.
 */
export function splitMoneyParts(amount: number): {
  sign: string;
  whole: string;
  dec: string;
} {
  const cents = toCents(amount);
  const sign = cents < 0 ? '-' : '';
  const absCents = Math.abs(cents);
  const wholeNum = Math.floor(absCents / 100);
  const decNum = absCents % 100;
  return {
    sign,
    whole: wholeNum.toLocaleString('en-US'),
    dec: String(decNum).padStart(2, '0'),
  };
}

export function formatMoney(amount: number, symbol: string, decimals = 2): string {
  const rounded = decimals === 2 ? roundMoney(amount) : amount;
  const normalized = Object.is(rounded, -0) || rounded === 0 ? 0 : rounded;
  const sign = normalized < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(normalized).toLocaleString('en-US', {
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

/**
 * Parses user-typed amounts like "1,250.50" or "₱300".
 * Rejects negative inputs unless `allowNegative` is true, rejects multiple decimal points,
 * rejects scientific notation, and rounds to 2 decimal places capped at MAX_MONEY_AMOUNT.
 * Returns 0 when invalid.
 */
export function parseAmount(
  text: string,
  options?: { allowNegative?: boolean }
): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const isNegative = trimmed.startsWith('-');
  if (isNegative && !options?.allowNegative) return 0;

  // Reject scientific notation (e.g. "1e-17", "1e22")
  if (/[eE]/.test(trimmed)) return 0;

  // Strip currency symbols, spaces, and thousands commas, keeping digits and dots
  const unsigned = (isNegative ? trimmed.slice(1) : trimmed).replace(/[^0-9.]/g, '');
  if (!unsigned) return 0;

  // Reject multiple decimal points (e.g. "12.34.56")
  const dotParts = unsigned.split('.');
  if (dotParts.length > 2) return 0;

  const normalized =
    dotParts.length === 2 ? `${dotParts[0] || '0'}.${dotParts[1].slice(0, 2)}` : dotParts[0];
  const value = Number(normalized);
  if (!Number.isFinite(value) || value > MAX_MONEY_AMOUNT) return 0;

  const signed = isNegative ? -value : value;
  return roundMoney(signed);
}
