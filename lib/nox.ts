import type { CategoryBudget, Transaction } from '@/context/BudgetContext';
import { addDays, BudgetPeriod, daysBetween, isWithin } from './dates';
import { formatMoney } from './format';

export interface NoxContext {
  sym: string;
  today: Date;
  transactions: Transaction[];
  periodTransactions: Transaction[];
  expenseCategories: CategoryBudget[];
  period: BudgetPeriod;
  previousPeriod: BudgetPeriod;
  totalBudget: number;
  totalSpent: number;
  leftToSpend: number;
  daysLeft: number;
  safeToSpendToday: number;
}

export interface NoxReply {
  text: string;
  breakdown?: { label: string; amount: string; ratio: number }[];
  /** Offered when the user asks about a purchase, so it can become a goal. */
  goal?: { title: string; target: number };
}

function money(ctx: NoxContext, amount: number, decimals = 0) {
  return formatMoney(amount, ctx.sym, decimals);
}

function spendingByCategory(txs: Transaction[]) {
  const totals = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function sumExpenses(txs: Transaction[], start: Date, end: Date) {
  return txs
    .filter((t) => t.type === 'expense' && isWithin(t.date, start, end))
    .reduce((sum, t) => sum + t.amount, 0);
}

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Short observation for the Home "Nox noticed" card, or null if nothing useful. */
export function getHomeInsight(ctx: NoxContext): string | null {
  const limited = ctx.expenseCategories
    .filter((c) => c.limit > 0)
    .map((c) => ({ ...c, pct: pct(c.spent, c.limit) }))
    .sort((a, b) => b.pct - a.pct);
  const hot = limited.find((c) => c.pct >= 70);
  const dayWord = ctx.daysLeft === 1 ? 'day' : 'days';

  if (hot) {
    if (hot.spent > hot.limit) {
      return `${hot.name} is ${money(ctx, hot.spent - hot.limit)} over its limit with ${ctx.daysLeft} ${dayWord} to go.`;
    }
    const perDay = (hot.limit - hot.spent) / ctx.daysLeft;
    return `${hot.name} is at ${hot.pct}% with ${ctx.daysLeft} ${dayWord} to go. Keeping it under ${money(ctx, perDay)} a day stays on budget.`;
  }

  if (ctx.totalBudget > 0) {
    const periodDays = daysBetween(ctx.period.start, ctx.period.end) + 1;
    const elapsedPct = pct(periodDays - ctx.daysLeft + 1, periodDays);
    const usedPct = pct(ctx.totalSpent, ctx.totalBudget);
    if (usedPct > elapsedPct + 10) {
      return `You've used ${usedPct}% of your budget, but only ${elapsedPct}% of the month has passed. Try to stay under ${money(ctx, ctx.safeToSpendToday)} a day.`;
    }
    return `You're on pace: ${usedPct}% of your budget used with ${elapsedPct}% of the month gone.`;
  }

  const top = spendingByCategory(ctx.periodTransactions)[0];
  if (top) {
    return `Most of your spending this month went to ${top.name} (${money(ctx, top.amount)}). Set a monthly budget and I can tell you what's safe to spend each day.`;
  }
  return null;
}

const STOP_WORDS = new Set([
  'can', 'i', 'afford', 'a', 'an', 'the', 'buy', 'to', 'for', 'should', 'get',
  'new', 'my', 'is', 'it', 'ok', 'okay', 'if', 'do', 'we', 'you', 'me', 'this',
  'month', 'worth', 'pesos', 'dollars',
]);

function extractItemName(question: string): string {
  const words = question
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return 'Wishlist item';
  const name = words.slice(0, 4).join(' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function leftSummary(ctx: NoxContext): string {
  if (ctx.totalBudget <= 0) {
    return `You've spent ${money(ctx, ctx.totalSpent, 2)} so far in ${ctx.period.label}. Set a monthly budget and I'll tell you how much is safe to spend each day.`;
  }
  const dayWord = ctx.daysLeft === 1 ? 'day' : 'days';
  return `You have ${money(ctx, ctx.leftToSpend, 2)} left for the next ${ctx.daysLeft} ${dayWord}, about ${money(ctx, ctx.safeToSpendToday)} a day.`;
}

/** Answers a question using only data stored on the device. */
export function answerQuestion(question: string, ctx: NoxContext): NoxReply {
  const lower = question.toLowerCase();
  const amountMatch = question.match(/(\d[\d,]*(?:\.\d+)?)/);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 0;

  // Affordability: "Can I afford a 2,500 jacket?"
  if ((/afford|buy|purchase/.test(lower)) && amount > 0) {
    const goal = { title: extractItemName(question), target: amount };
    if (ctx.totalBudget <= 0) {
      return {
        text: `You haven't set a monthly budget yet, so I can't say for sure. So far you've spent ${money(ctx, ctx.totalSpent, 2)} this month.`,
        goal,
      };
    }
    const remaining = ctx.leftToSpend - amount;
    if (remaining < 0) {
      return {
        text: `Not this month. It's ${money(ctx, -remaining)} more than the ${money(ctx, ctx.leftToSpend)} you have left. Saving for it might work better.`,
        goal,
      };
    }
    const perDay = remaining / ctx.daysLeft;
    const dayWord = ctx.daysLeft === 1 ? 'day' : 'days';
    return {
      text: `Yes, you can. You'd have ${money(ctx, remaining)} left for ${ctx.daysLeft} ${dayWord}, about ${money(ctx, perDay)} a day instead of ${money(ctx, ctx.safeToSpendToday)}.`,
      goal,
    };
  }

  if (ctx.transactions.length === 0) {
    return {
      text: "I don't have any transactions to look at yet. Add a few expenses and I can break down where your money goes.",
    };
  }

  // Where to cut back
  if (/cut|save|reduce|less|trim/.test(lower)) {
    const byCat = spendingByCategory(ctx.periodTransactions);
    if (byCat.length === 0) {
      return { text: `You haven't recorded any spending in ${ctx.period.label} yet.` };
    }
    const top = byCat[0];
    const share = pct(top.amount, ctx.totalSpent);
    return {
      text: `${top.name} is your biggest expense this month at ${money(ctx, top.amount)} (${share}% of your spending). Cutting it by 10% would save about ${money(ctx, top.amount * 0.1)}.`,
      breakdown: byCat.slice(0, 3).map((c) => ({
        label: c.name,
        amount: money(ctx, c.amount),
        ratio: ctx.totalSpent > 0 ? c.amount / ctx.totalSpent : 0,
      })),
    };
  }

  // Compare with the previous period, up to the same point in time
  if (/compare|last month|previous|before/.test(lower)) {
    const elapsed = daysBetween(ctx.period.start, ctx.today);
    const prevCutoff = addDays(ctx.previousPeriod.start, elapsed);
    const prevEnd = prevCutoff < ctx.previousPeriod.end ? prevCutoff : ctx.previousPeriod.end;
    const prevSpent = sumExpenses(ctx.transactions, ctx.previousPeriod.start, prevEnd);
    if (prevSpent === 0) {
      return {
        text: `I don't have any spending recorded for ${ctx.previousPeriod.label} to compare against. You've spent ${money(ctx, ctx.totalSpent, 2)} so far this month.`,
      };
    }
    const diff = ctx.totalSpent - prevSpent;
    const direction = diff <= 0 ? 'less' : 'more';
    return {
      text: `You've spent ${money(ctx, ctx.totalSpent)} so far, compared with ${money(ctx, prevSpent)} at this point in ${ctx.previousPeriod.label}. That's ${money(ctx, Math.abs(diff))} ${direction} (${pct(Math.abs(diff), prevSpent)}%).`,
    };
  }

  // A specific category: "How much did I spend on food?"
  const categoryNames = new Set<string>([
    ...ctx.expenseCategories.map((c) => c.name),
    ...ctx.periodTransactions.filter((t) => t.type === 'expense').map((t) => t.category),
  ]);
  const mentioned = [...categoryNames].find((name) => lower.includes(name.toLowerCase()));
  if (mentioned) {
    const txs = ctx.periodTransactions.filter(
      (t) => t.type === 'expense' && t.category.toLowerCase() === mentioned.toLowerCase()
    );
    const spent = txs.reduce((sum, t) => sum + t.amount, 0);
    const budget = ctx.expenseCategories.find(
      (c) => c.name.toLowerCase() === mentioned.toLowerCase()
    );
    const byTitle = new Map<string, number>();
    for (const t of txs) byTitle.set(t.title, (byTitle.get(t.title) ?? 0) + t.amount);
    const breakdown = [...byTitle.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, value]) => ({
        label,
        amount: money(ctx, value),
        ratio: spent > 0 ? value / spent : 0,
      }));
    const text =
      budget && budget.limit > 0
        ? `${money(ctx, spent)} so far, ${pct(spent, budget.limit)}% of your ${money(ctx, budget.limit)} ${mentioned} budget.`
        : `${money(ctx, spent)} on ${mentioned} so far this month across ${txs.length} ${txs.length === 1 ? 'entry' : 'entries'}.`;
    return { text, breakdown: breakdown.length > 0 ? breakdown : undefined };
  }

  if (/left|remaining|safe|budget|how much/.test(lower)) {
    return { text: leftSummary(ctx) };
  }

  return {
    text: `${leftSummary(ctx)} You can also ask where to cut back, or how this month compares to last.`,
  };
}
