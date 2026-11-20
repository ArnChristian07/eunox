import { addDays, startOfDay } from './dates';
import { MAX_MONEY_AMOUNT, roundMoney } from './format';

export interface ParsedReceipt {
  /** Best guess for the amount paid, or null when none was found. */
  amount: number | null;
  /** True when the amount came from a "total" line rather than a fallback guess. */
  amountFromTotalLine: boolean;
  merchant: string | null;
  /** Receipt date when one was found and looks plausible. */
  date: Date | null;
  /** Number of item lines that had a price, excluding totals, tax and payment lines. */
  itemCount: number;
  /** Cleaned-up text lines, top to bottom. */
  lines: string[];
}

// "1,234.56", "1.234,56", "1234.56", "₱ 348.00", "PHP348.00", "348.00-".
// Spaces are not treated as thousands separators: "2 174.00" is qty 2, price 174.00.
const MONEY_RE = /(?:^|[^\d.,])((?:\d{1,3}(?:[,.]\d{3})+|\d+)[.,]\d{2})(?![\d])/g;

const TOTAL_PRIORITY: { re: RegExp; weight: number }[] = [
  { re: /\bgrand\s*total\b/i, weight: 6 },
  { re: /\b(amount|amt|total|balance)\s*(due|payable|to\s*pay)\b/i, weight: 5 },
  { re: /\btotal\s*(amount|amt|sales?|php|usd|eur|inr)\b/i, weight: 5 },
  { re: /\bnet\s*(amount|total|amt)\b/i, weight: 4 },
  { re: /\btotal\b/i, weight: 3 },
  { re: /\b(amount|amt)\b/i, weight: 1 },
];

// Lines that contain a number but are not the amount paid.
const NOT_TOTAL_RE =
  /\b(sub\s*-?\s*total|subtotal|total\s*(items?|qty|quantity|pcs|savings?|discount|vat|tax)|vat(able)?|tax|change|cash|tender(ed)?|card|paid|payment|discount|less|points?|rounding|service\s*charge|tip|items?\s*sold|qty)\b/i;

const NON_ITEM_RE =
  /\b(total|sub\s*total|subtotal|vat|tax|change|cash|tender|card|discount|amount|balance|due|paid|payment|rounding|points?|exempt|zero\s*rated|sales)\b/i;

const NOT_MERCHANT_RE =
  /\b(receipt|invoice|official|tin|vat|reg|registered|tel|phone|fax|mobile|email|www|http|\.com|date|time|cashier|server|table|order|no\.|#|terminal|pos|min|sn|serial|permit|branch|address|street|st\.|ave|road|rd\.|blvd|city|brgy|barangay|floor|bldg|welcome|thank)\b/i;

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

/** Parses "1,234.56" / "1.234,56" / "1 234,56" into a number. */
export function parseMoneyToken(token: string): number | null {
  const cleaned = token.trim();
  const lastSep = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  if (lastSep < 0) return null;
  const whole = cleaned.slice(0, lastSep).replace(/[.,]/g, '');
  const dec = cleaned.slice(lastSep + 1);
  if (!/^\d+$/.test(whole) || !/^\d{2}$/.test(dec)) return null;
  const value = Number(`${whole}.${dec}`);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_MONEY_AMOUNT) return null;
  return roundMoney(value);
}

function amountsIn(line: string): number[] {
  const out: number[] = [];
  for (const match of line.matchAll(MONEY_RE)) {
    const value = parseMoneyToken(match[1]);
    if (value !== null) out.push(value);
  }
  return out;
}

function hasLetters(line: string, min = 3): boolean {
  return (line.match(/[A-Za-z]/g)?.length ?? 0) >= min;
}

function toTitleCase(text: string): string {
  if (text !== text.toUpperCase()) return text;
  const small = new Set(['of', 'and', 'the', 'de', 'ng', 'sa']);
  return text
    .toLowerCase()
    .split(' ')
    .map((word, i) =>
      i > 0 && small.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}

function findTotal(lines: string[]): { amount: number; fromTotal: boolean } | null {
  let best: { amount: number; weight: number; index: number } | null = null;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (NOT_TOTAL_RE.test(line)) continue;
    const rule = TOTAL_PRIORITY.find((r) => r.re.test(line));
    if (!rule) continue;

    // Amount on the same line, or on the next line when the label and value
    // were recognized as separate lines.
    let amounts = amountsIn(line);
    if (amounts.length === 0 && index + 1 < lines.length && !hasLetters(lines[index + 1])) {
      amounts = amountsIn(lines[index + 1]);
    }
    if (amounts.length === 0) continue;
    const amount = amounts[amounts.length - 1];

    // Prefer the strongest label; for equal labels, the lowest one on the receipt.
    if (!best || rule.weight > best.weight || (rule.weight === best.weight && index > best.index)) {
      best = { amount, weight: rule.weight, index };
    }
  }

  if (best) return { amount: best.amount, fromTotal: true };

  // Fallback: the largest amount that isn't on a cash / change / tax line.
  const candidates = lines
    .filter((line) => !NOT_TOTAL_RE.test(line))
    .flatMap(amountsIn);
  if (candidates.length === 0) return null;
  return { amount: Math.max(...candidates), fromTotal: false };
}

function findMerchant(lines: string[]): string | null {
  for (const raw of lines.slice(0, 6)) {
    const line = raw.replace(/[*=_~|]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!hasLetters(line)) continue;
    if (NOT_MERCHANT_RE.test(line)) continue;
    const digits = line.match(/\d/g)?.length ?? 0;
    if (digits > line.length / 3) continue;
    if (line.length > 40) continue;
    return toTitleCase(line);
  }
  return null;
}

function validDate(y: number, m: number, d: number): Date | null {
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  const date = new Date(y, m, d);
  if (date.getMonth() !== m || date.getDate() !== d) return null;
  return date;
}

function fullYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function isPlausible(date: Date, today: Date): boolean {
  const day = startOfDay(date);
  return day <= startOfDay(today) && day >= addDays(today, -400);
}

/** Finds the first plausible date on the receipt (not in the future, within ~13 months). */
export function findReceiptDate(lines: string[], today: Date): Date | null {
  const text = lines.join('\n');
  const candidates: Date[] = [];
  const push = (d: Date | null) => {
    if (d) candidates.push(d);
  };

  // 2026-11-20, 2026/11/20
  for (const m of text.matchAll(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
    push(validDate(+m[1], +m[2] - 1, +m[3]));
  }

  // 11/20/2026, 20/11/2026, 11-20-26
  for (const m of text.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|20\d{2})\b/g)) {
    const a = +m[1];
    const b = +m[2];
    const y = fullYear(+m[3]);
    const monthFirst = validDate(y, a - 1, b);
    const dayFirst = validDate(y, b - 1, a);
    // Month-first unless that's impossible or lands in the future.
    if (monthFirst && isPlausible(monthFirst, today)) push(monthFirst);
    else push(dayFirst);
  }

  // Nov 20, 2026 / November 20 2026
  for (const m of text.matchAll(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{2}|20\d{2})\b/g)) {
    const month = MONTHS[m[1].slice(0, 4).toLowerCase()] ?? MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (month !== undefined) push(validDate(fullYear(+m[3]), month, +m[2]));
  }

  // 20 Nov 2026 / 20-Nov-26
  for (const m of text.matchAll(/\b(\d{1,2})[\s-]+([A-Za-z]{3,9})\.?[\s-]+(\d{2}|20\d{2})\b/g)) {
    const month = MONTHS[m[2].slice(0, 4).toLowerCase()] ?? MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (month !== undefined) push(validDate(fullYear(+m[3]), month, +m[1]));
  }

  return candidates.find((d) => isPlausible(d, today)) ?? null;
}

function countItems(lines: string[]): number {
  return lines.filter(
    (line) => hasLetters(line) && !NON_ITEM_RE.test(line) && amountsIn(line).length > 0
  ).length;
}

/** Splits recognized text blocks into trimmed, non-empty lines. */
export function toLines(blocks: string[]): string[] {
  return blocks
    .flatMap((block) => block.split(/\r?\n/))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function parseReceipt(blocks: string[], today: Date): ParsedReceipt {
  const lines = toLines(blocks);
  const total = findTotal(lines);
  return {
    amount: total?.amount ?? null,
    amountFromTotalLine: total?.fromTotal ?? false,
    merchant: findMerchant(lines),
    date: findReceiptDate(lines, today),
    itemCount: countItems(lines),
    lines,
  };
}

const CATEGORY_KEYWORDS: { category: string; re: RegExp }[] = [
  {
    category: 'Food',
    re: /\b(restaurant|resto|cafe|caf[eé]|coffee|bakery|bakeshop|bread|pizza|burger|grill|kitchen|eatery|diner|food|foods|jollibee|mcdonald'?s|kfc|chowking|mang inasal|starbucks|7-?eleven|ministop|grocery|supermarket|market|mart|puregold|savemore|robinsons|walter|meal|rice|chicken|noodle|tea|milk ?tea|drinks?)\b/i,
  },
  {
    category: 'Transport',
    re: /\b(shell|petron|caltex|seaoil|phoenix|gas(oline)?|diesel|fuel|unleaded|parking|toll|grab|taxi|uber|lyft|transport|bus|train|lrt|mrt|jeep|angkas|autosweep|easytrip)\b/i,
  },
  {
    category: 'Health',
    re: /\b(pharmacy|drug|drugstore|mercury|watsons|rose ?pharmacy|generika|southstar|clinic|hospital|medical|dental|optical|medicine|tablet|capsule|mg\b|laboratory|diagnostic)\b/i,
  },
  {
    category: 'Bills',
    re: /\b(meralco|maynilad|manila water|electric|electricity|water ?bill|internet|pldt|globe|smart|converge|sky ?cable|telecom|utility|utilities|bayad|billing|statement of account|rent)\b/i,
  },
  {
    category: 'Shopping',
    re: /\b(sm store|department|mall|uniqlo|h&m|zara|clothing|apparel|shoes?|hardware|ace hardware|wilcon|handyman|national bookstore|bookstore|lazada|shopee|ikea|appliance|electronics|gadget)\b/i,
  },
  {
    category: 'Fun',
    re: /\b(cinema|movie|theater|theatre|ticket|concert|netflix|spotify|steam|game|games|arcade|timezone|bar|pub|karaoke|ktv|bowling|resort|museum)\b/i,
  },
];

/**
 * Picks a category for the receipt from the user's own categories.
 * Reuses the category of a past expense with the same merchant first,
 * then falls back to keyword matching on the receipt text.
 */
export function guessCategory(
  receipt: ParsedReceipt,
  categoryNames: string[],
  history: { title: string; category: string; type: string }[]
): string | null {
  const byLower = new Map(categoryNames.map((n) => [n.toLowerCase(), n]));

  if (receipt.merchant) {
    const merchant = receipt.merchant.toLowerCase();
    const past = history.find(
      (t) => t.type === 'expense' && t.title.toLowerCase() === merchant
    );
    if (past && byLower.has(past.category.toLowerCase())) {
      return byLower.get(past.category.toLowerCase()) ?? null;
    }
  }

  // The merchant name is the strongest signal; the full text is the fallback.
  const sources = [receipt.merchant ?? '', receipt.lines.join(' ')];
  for (const source of sources) {
    if (!source) continue;
    // A user category whose name appears in the text.
    for (const name of categoryNames) {
      if (name.length >= 3 && new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(source)) {
        return name;
      }
    }
    for (const { category, re } of CATEGORY_KEYWORDS) {
      if (re.test(source) && byLower.has(category.toLowerCase())) {
        return byLower.get(category.toLowerCase()) ?? null;
      }
    }
  }
  return null;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
