import type { MonthStartOption } from '@/context/OnboardingContext';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const WEEKDAYS_SHORT = WEEKDAYS.map((d) => d.slice(0, 3));

const DAY_MS = 86_400_000;

/** Local calendar date as YYYY-MM-DD. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses a YYYY-MM-DD string as a local date at midnight. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Builds a date, clamping the day to the last day of the month. */
export function clampDay(year: number, month: number, day: number): Date {
  return new Date(year, month, Math.min(Math.max(1, day), lastDayOfMonth(year, month)));
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthName(d: Date): string {
  return MONTHS[d.getMonth()];
}

export function monthShort(d: Date): string {
  return MONTHS_SHORT[d.getMonth()];
}

export function weekdayShort(d: Date): string {
  return WEEKDAYS_SHORT[d.getDay()];
}

export function isWithin(iso: string, start: Date, end: Date): boolean {
  const d = parseISODate(iso);
  return d >= startOfDay(start) && d <= startOfDay(end);
}

export interface BudgetPeriod {
  start: Date;
  /** Inclusive last day of the period. */
  end: Date;
  /** Month name the period mostly covers, e.g. "November". */
  label: string;
}

/** Budget period containing `now`, based on the user's "month starts on" setting. */
export function getBudgetPeriod(now: Date, monthStart: MonthStartOption): BudgetPeriod {
  const today = startOfDay(now);
  const y = today.getFullYear();
  const m = today.getMonth();
  let start: Date;
  let end: Date;

  if (monthStart === 'Last day') {
    const thisMonthLast = new Date(y, m + 1, 0);
    start = today >= thisMonthLast ? thisMonthLast : new Date(y, m, 0);
    end = addDays(new Date(start.getFullYear(), start.getMonth() + 2, 0), -1);
  } else {
    const day = monthStart === '15th' ? 15 : 1;
    start = today.getDate() >= day ? new Date(y, m, day) : new Date(y, m - 1, day);
    end = addDays(new Date(start.getFullYear(), start.getMonth() + 1, day), -1);
  }

  return { start, end, label: monthName(addDays(start, 14)) };
}

/** "Thu, Nov 19" (adds the year when it isn't the current year). */
export function formatShortDate(d: Date, now: Date = new Date()): string {
  const base = `${weekdayShort(d)}, ${monthShort(d)} ${d.getDate()}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base}, ${d.getFullYear()}`;
}

/** "Fri, Nov 20, 2026" */
export function formatFullDate(iso: string): string {
  const d = parseISODate(iso);
  return `${weekdayShort(d)}, ${monthShort(d)} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Today", "Yesterday", or "Wed, Nov 18". */
export function formatRelativeDay(iso: string, now: Date = new Date()): string {
  const d = parseISODate(iso);
  const diff = daysBetween(d, now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return formatShortDate(d, now);
}

/** "Today · Fri, Nov 20", "Yesterday · Thu, Nov 19", or "Wed, Nov 18". */
export function formatGroupLabel(iso: string, now: Date = new Date()): string {
  const d = parseISODate(iso);
  const diff = daysBetween(d, now);
  const short = formatShortDate(d, now);
  if (diff === 0) return `Today · ${short}`;
  if (diff === 1) return `Yesterday · ${short}`;
  return short;
}

/** "just now", "5 min ago", "today", "yesterday", "3 days ago". */
export function formatTimeAgo(isoDateTime: string, now: Date = new Date()): string {
  const then = new Date(isoDateTime);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const days = daysBetween(then, now);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function getGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
