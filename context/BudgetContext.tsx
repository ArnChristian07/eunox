import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useOnboarding } from './OnboardingContext';
import {
  addDays,
  BudgetPeriod,
  clampDay,
  daysBetween,
  getBudgetPeriod,
  isWithin,
  monthKey,
  parseISODate,
  startOfDay,
  toISODate,
} from '@/lib/dates';

export type TransactionType = 'expense' | 'income' | 'transfer';
export type CategoryType = 'expense' | 'income';

export interface Transaction {
  id: string;
  title: string;
  category: string;
  amount: number;
  type: TransactionType;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** ISO timestamp used to order entries recorded on the same day. */
  createdAt: string;
  wallet: string;
  repeat?: string;
  note?: string;
  noxSource?: string;
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;

export interface CategoryRecord {
  id: string;
  name: string;
  limit: number;
  type: CategoryType;
}

/** Category with spending derived from the current budget period. */
export interface CategoryBudget extends CategoryRecord {
  spent: number;
  count: number;
}

export interface WalletRecord {
  id: string;
  name: string;
  subtitle: string;
  initialBalance: number;
  isDefault?: boolean;
  iconType: 'cash' | 'ewallet' | 'bank';
}

/** Wallet with its balance derived from transactions and transfers. */
export interface WalletItem extends WalletRecord {
  balance: number;
}

export interface TransferRecord {
  id: string;
  from: string;
  to: string;
  amount: number;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  subtitle: string;
  saved: number;
  target: number;
}

export interface RecurringBill {
  id: string;
  title: string;
  wallet: string;
  amount: number;
  /** Day of month the bill is due (clamped to the month's last day). */
  dueDay: number;
  /** Month keys (YYYY-MM) in which the bill was paid. */
  paidMonths: string[];
}

export interface BillStatus {
  bill: RecurringBill;
  dueDate: Date;
  paid: boolean;
  daysUntilDue: number;
}

export interface BackupInfo {
  at: string;
  fileName: string;
  sizeKb: number;
}

export interface BudgetSnapshot {
  version: number;
  transactions: Transaction[];
  categories: CategoryRecord[];
  wallets: WalletRecord[];
  transfers: TransferRecord[];
  goals: SavingsGoal[];
  bills: RecurringBill[];
}

export function getBillStatus(bill: RecurringBill, now: Date = new Date()): BillStatus {
  const today = startOfDay(now);
  const dueDate = clampDay(today.getFullYear(), today.getMonth(), bill.dueDay);
  return {
    bill,
    dueDate,
    paid: bill.paidMonths.includes(monthKey(today)),
    daysUntilDue: daysBetween(today, dueDate),
  };
}

export function describeBillDue(status: BillStatus): string {
  if (status.paid) return 'Paid';
  const d = status.daysUntilDue;
  if (d < 0) return `Overdue by ${-d} day${d === -1 ? '' : 's'}`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due in ${d} days`;
}

interface BudgetContextValue {
  today: Date;
  period: BudgetPeriod;
  previousPeriod: BudgetPeriod;
  totalBudget: number;
  totalSpent: number;
  totalIncome: number;
  leftToSpend: number;
  daysLeft: number;
  safeToSpendToday: number;
  /** All transactions, newest first. */
  transactions: Transaction[];
  /** Transactions inside the current budget period, newest first. */
  periodTransactions: Transaction[];
  categories: CategoryBudget[];
  expenseCategories: CategoryBudget[];
  incomeCategories: CategoryBudget[];
  wallets: WalletItem[];
  defaultWallet: WalletItem | undefined;
  transfers: TransferRecord[];
  goals: SavingsGoal[];
  bills: RecurringBill[];
  lastBackup: BackupInfo | null;
  addTransaction: (tx: NewTransaction) => string;
  updateTransaction: (id: string, updates: Partial<NewTransaction>) => void;
  deleteTransaction: (id: string) => void;
  moveBudget: (fromName: string, toName: string, amount: number) => void;
  raiseCategoryLimit: (categoryName: string, newLimit: number) => void;
  addCategory: (name: string, limit: number, type?: CategoryType) => void;
  updateCategory: (id: string, name: string, limit: number) => void;
  reorderCategory: (id: string, direction: 'up' | 'down') => void;
  addWallet: (wallet: Omit<WalletRecord, 'id'>) => void;
  transferBetweenWallets: (fromId: string, toId: string, amount: number) => void;
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  contributeToGoal: (goalId: string, amount: number) => void;
  addBill: (bill: Omit<RecurringBill, 'id' | 'paidMonths'>) => void;
  markBillPaid: (billId: string) => void;
  recordBackup: (info: BackupInfo) => void;
  exportSnapshot: () => BudgetSnapshot;
  restoreSnapshot: (data: unknown) => boolean;
  hideAmountsOnHome: boolean;
  setHideAmountsOnHome: (v: boolean) => void;
  noxSuggestionsEnabled: boolean;
  setNoxSuggestionsEnabled: (v: boolean) => void;
  appLockEnabled: boolean;
  setAppLockEnabled: (v: boolean) => void;
}

const STARTER_EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Health',
  'Fun',
];
const STARTER_INCOME_CATEGORIES = ['Salary', 'Other income'];

const DEFAULT_WALLET: WalletRecord = {
  id: 'w-cash',
  name: 'Cash wallet',
  subtitle: 'Default for new expenses',
  initialBalance: 0,
  isDefault: true,
  iconType: 'cash',
};

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const { monthlyBudget, monthStart, starterMode, hasCompletedOnboarding } =
    useOnboarding();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryRecords, setCategoryRecords] = useState<CategoryRecord[]>([]);
  const [walletRecords, setWalletRecords] = useState<WalletRecord[]>([
    DEFAULT_WALLET,
  ]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [lastBackup, setLastBackup] = useState<BackupInfo | null>(null);
  const [hideAmountsOnHome, setHideAmountsOnHome] = useState(false);
  const [noxSuggestionsEnabled, setNoxSuggestionsEnabled] = useState(true);
  const [appLockEnabled, setAppLockEnabled] = useState(true);

  // Seed starter categories once, after the user picks "Simple" in onboarding.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!hasCompletedOnboarding || seededRef.current) return;
    seededRef.current = true;
    if (starterMode !== 'simple') return;
    setCategoryRecords((prev) =>
      prev.length > 0
        ? prev
        : [
            ...STARTER_EXPENSE_CATEGORIES.map((name) => ({
              id: `cat-${slug(name)}`,
              name,
              limit: 0,
              type: 'expense' as const,
            })),
            ...STARTER_INCOME_CATEGORIES.map((name) => ({
              id: `cat-${slug(name)}`,
              name,
              limit: 0,
              type: 'income' as const,
            })),
          ]
    );
  }, [hasCompletedOnboarding, starterMode]);

  // Re-evaluated every render so date-based values roll over at midnight.
  const todayKey = toISODate(new Date());
  const today = useMemo(() => parseISODate(todayKey), [todayKey]);
  const period = useMemo(() => getBudgetPeriod(today, monthStart), [today, monthStart]);
  const previousPeriod = useMemo(
    () => getBudgetPeriod(addDays(period.start, -1), monthStart),
    [period, monthStart]
  );
  const daysLeft = Math.max(1, daysBetween(today, period.end) + 1);

  const totalBudget = useMemo(() => {
    const parsed = Number((monthlyBudget || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [monthlyBudget]);

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort((a, b) =>
        a.date === b.date
          ? b.createdAt.localeCompare(a.createdAt)
          : b.date.localeCompare(a.date)
      ),
    [transactions]
  );

  const periodTransactions = useMemo(
    () =>
      sortedTransactions.filter((t) => isWithin(t.date, period.start, period.end)),
    [sortedTransactions, period]
  );

  const totalSpent = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions]
  );
  const totalIncome = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions]
  );
  const leftToSpend = Math.max(0, totalBudget - totalSpent);
  const safeToSpendToday =
    totalBudget > 0 ? Math.floor(leftToSpend / daysLeft) : 0;

  const categories = useMemo<CategoryBudget[]>(
    () =>
      categoryRecords.map((c) => {
        const matching = periodTransactions.filter(
          (t) => t.type === c.type && sameName(t.category, c.name)
        );
        return {
          ...c,
          spent: matching.reduce((sum, t) => sum + t.amount, 0),
          count: matching.length,
        };
      }),
    [categoryRecords, periodTransactions]
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories]
  );

  const wallets = useMemo<WalletItem[]>(
    () =>
      walletRecords.map((w) => {
        let balance = w.initialBalance;
        for (const t of transactions) {
          if (t.wallet !== w.name) continue;
          if (t.type === 'income') balance += t.amount;
          else if (t.type === 'expense') balance -= t.amount;
        }
        for (const tr of transfers) {
          if (tr.from === w.name) balance -= tr.amount;
          if (tr.to === w.name) balance += tr.amount;
        }
        return { ...w, balance };
      }),
    [walletRecords, transactions, transfers]
  );
  const defaultWallet = wallets.find((w) => w.isDefault) ?? wallets[0];

  const addTransaction = useCallback((tx: NewTransaction): string => {
    const id = makeId('tx');
    setTransactions((prev) => [
      { ...tx, id, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    return id;
  }, []);

  const updateTransaction = useCallback(
    (id: string, updates: Partial<NewTransaction>) => {
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
      );
    },
    []
  );

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }, []);

  const moveBudget = useCallback(
    (fromName: string, toName: string, amount: number) => {
      if (amount <= 0) return;
      setCategoryRecords((prev) =>
        prev.map((cat) => {
          if (cat.type !== 'expense') return cat;
          if (sameName(cat.name, fromName)) {
            return { ...cat, limit: Math.max(0, cat.limit - amount) };
          }
          if (sameName(cat.name, toName)) {
            return { ...cat, limit: cat.limit + amount };
          }
          return cat;
        })
      );
    },
    []
  );

  const raiseCategoryLimit = useCallback(
    (categoryName: string, newLimit: number) => {
      setCategoryRecords((prev) =>
        prev.map((cat) =>
          cat.type === 'expense' && sameName(cat.name, categoryName)
            ? { ...cat, limit: Math.ceil(newLimit) }
            : cat
        )
      );
    },
    []
  );

  const addCategory = useCallback(
    (name: string, limit: number, type: CategoryType = 'expense') => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setCategoryRecords((prev) =>
        prev.some((c) => c.type === type && sameName(c.name, trimmed))
          ? prev
          : [...prev, { id: makeId('cat'), name: trimmed, limit, type }]
      );
    },
    []
  );

  const updateCategory = useCallback(
    (id: string, name: string, limit: number) => {
      const existing = categoryRecords.find((c) => c.id === id);
      if (!existing) return;
      const nextName = name.trim() || existing.name;
      setCategoryRecords((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: nextName, limit } : c))
      );
      // Keep past transactions attached to the renamed category.
      if (!sameName(nextName, existing.name)) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.type === existing.type && sameName(t.category, existing.name)
              ? { ...t, category: nextName }
              : t
          )
        );
      }
    },
    [categoryRecords]
  );

  const reorderCategory = useCallback((id: string, direction: 'up' | 'down') => {
    setCategoryRecords((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const type = prev[idx].type;
      const step = direction === 'up' ? -1 : 1;
      let target = idx + step;
      while (target >= 0 && target < prev.length && prev[target].type !== type) {
        target += step;
      }
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  }, []);

  const addWallet = useCallback((wallet: Omit<WalletRecord, 'id'>) => {
    setWalletRecords((prev) => [
      ...prev,
      {
        ...wallet,
        id: makeId('w'),
        isDefault: prev.some((w) => w.isDefault) ? wallet.isDefault : true,
      },
    ]);
  }, []);

  const transferBetweenWallets = useCallback(
    (fromId: string, toId: string, amount: number) => {
      if (fromId === toId || amount <= 0) return;
      const fromWallet = walletRecords.find((w) => w.id === fromId);
      const toWallet = walletRecords.find((w) => w.id === toId);
      if (!fromWallet || !toWallet) return;
      setTransfers((prev) => [
        {
          id: makeId('tr'),
          from: fromWallet.name,
          to: toWallet.name,
          amount,
          date: toISODate(new Date()),
        },
        ...prev,
      ]);
    },
    [walletRecords]
  );

  const addGoal = useCallback((goal: Omit<SavingsGoal, 'id'>) => {
    setGoals((prev) => [...prev, { ...goal, id: makeId('g') }]);
  }, []);

  const contributeToGoal = useCallback((goalId: string, amount: number) => {
    if (amount <= 0) return;
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g
      )
    );
  }, []);

  const addBill = useCallback((bill: Omit<RecurringBill, 'id' | 'paidMonths'>) => {
    setBills((prev) => [...prev, { ...bill, id: makeId('b'), paidMonths: [] }]);
  }, []);

  const markBillPaid = useCallback(
    (billId: string) => {
      const bill = bills.find((b) => b.id === billId);
      const key = monthKey(new Date());
      if (!bill || bill.paidMonths.includes(key)) return;
      setBills((prev) =>
        prev.map((b) =>
          b.id === billId ? { ...b, paidMonths: [...b.paidMonths, key] } : b
        )
      );
      const billsCategory =
        categoryRecords.find((c) => c.type === 'expense' && sameName(c.name, 'Bills'))
          ?.name ?? 'Bills';
      addTransaction({
        title: bill.title,
        category: billsCategory,
        amount: bill.amount,
        type: 'expense',
        date: toISODate(new Date()),
        wallet: bill.wallet,
        repeat: 'Monthly',
        note: 'Recurring bill',
      });
    },
    [bills, categoryRecords, addTransaction]
  );

  const recordBackup = useCallback((info: BackupInfo) => {
    setLastBackup(info);
  }, []);

  const exportSnapshot = useCallback(
    (): BudgetSnapshot => ({
      version: 2,
      transactions,
      categories: categoryRecords,
      wallets: walletRecords,
      transfers,
      goals,
      bills,
    }),
    [transactions, categoryRecords, walletRecords, transfers, goals, bills]
  );

  const restoreSnapshot = useCallback((data: unknown): boolean => {
    if (!data || typeof data !== 'object') return false;
    const snap = data as Partial<BudgetSnapshot>;
    const arrays = [
      snap.transactions,
      snap.categories,
      snap.wallets,
      snap.transfers,
      snap.goals,
      snap.bills,
    ];
    if (!arrays.every(Array.isArray)) return false;
    if ((snap.wallets as WalletRecord[]).length === 0) return false;
    setTransactions(snap.transactions as Transaction[]);
    setCategoryRecords(snap.categories as CategoryRecord[]);
    setWalletRecords(snap.wallets as WalletRecord[]);
    setTransfers(snap.transfers as TransferRecord[]);
    setGoals(snap.goals as SavingsGoal[]);
    setBills(snap.bills as RecurringBill[]);
    seededRef.current = true;
    return true;
  }, []);

  const value = useMemo<BudgetContextValue>(
    () => ({
      today,
      period,
      previousPeriod,
      totalBudget,
      totalSpent,
      totalIncome,
      leftToSpend,
      daysLeft,
      safeToSpendToday,
      transactions: sortedTransactions,
      periodTransactions,
      categories,
      expenseCategories,
      incomeCategories,
      wallets,
      defaultWallet,
      transfers,
      goals,
      bills,
      lastBackup,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      moveBudget,
      raiseCategoryLimit,
      addCategory,
      updateCategory,
      reorderCategory,
      addWallet,
      transferBetweenWallets,
      addGoal,
      contributeToGoal,
      addBill,
      markBillPaid,
      recordBackup,
      exportSnapshot,
      restoreSnapshot,
      hideAmountsOnHome,
      setHideAmountsOnHome,
      noxSuggestionsEnabled,
      setNoxSuggestionsEnabled,
      appLockEnabled,
      setAppLockEnabled,
    }),
    [
      today,
      period,
      previousPeriod,
      totalBudget,
      totalSpent,
      totalIncome,
      leftToSpend,
      daysLeft,
      safeToSpendToday,
      sortedTransactions,
      periodTransactions,
      categories,
      expenseCategories,
      incomeCategories,
      wallets,
      defaultWallet,
      transfers,
      goals,
      bills,
      lastBackup,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      moveBudget,
      raiseCategoryLimit,
      addCategory,
      updateCategory,
      reorderCategory,
      addWallet,
      transferBetweenWallets,
      addGoal,
      contributeToGoal,
      addBill,
      markBillPaid,
      recordBackup,
      exportSnapshot,
      restoreSnapshot,
      hideAmountsOnHome,
      noxSuggestionsEnabled,
      appLockEnabled,
    ]
  );

  return (
    <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
  );
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error('useBudget must be used within BudgetProvider');
  }
  return ctx;
}
