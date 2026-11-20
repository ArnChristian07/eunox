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
import {
  addMoney,
  fromCents,
  isValidFiniteAmount,
  isValidPositiveAmount,
  roundMoney,
  subMoney,
  sumMoney,
  toCents,
} from '@/lib/format';
import {
  loadJSONSafe,
  removeKeys,
  saveJSONStrict,
  STORAGE_KEYS,
} from '@/lib/storage';

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
  /** Display name of the wallet (kept synced with walletId). */
  wallet: string;
  /** Immutable foreign key referencing WalletRecord.id. */
  walletId?: string;
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
  fromId?: string;
  toId?: string;
  amount: number;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** ISO timestamp for deterministic ordering of same-day transfers. */
  createdAt?: string;
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
  walletId?: string;
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

interface PersistedBudget extends BudgetSnapshot {
  seeded: boolean;
  lastBackup: BackupInfo | null;
  hideAmountsOnHome: boolean;
  noxSuggestionsEnabled: boolean;
}

interface BudgetContextValue {
  /** False until saved data has been read from storage. */
  hydrated: boolean;
  /** Non-null when AsyncStorage read or write failed. */
  storageError: string | null;
  clearStorageError: () => void;
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
  /**
   * Adds a category. With `movePastMatches`, past entries of the same type whose
   * title or note mentions the name are moved into it. Returns how many moved,
   * or -1 when the name is empty or already taken.
   */
  addCategory: (
    name: string,
    limit: number,
    type?: CategoryType,
    options?: { movePastMatches?: boolean }
  ) => number;
  updateCategory: (id: string, name: string, limit: number) => void;
  deleteCategory: (id: string) => void;
  reorderCategory: (id: string, direction: 'up' | 'down') => void;
  addWallet: (wallet: Omit<WalletRecord, 'id'>) => void;
  updateWallet: (
    id: string,
    updates: Partial<Pick<WalletRecord, 'name' | 'subtitle' | 'iconType'>>
  ) => void;
  setDefaultWallet: (id: string) => void;
  /** Returns an error message when the wallet cannot be deleted. */
  deleteWallet: (id: string) => string | null;
  /** Returns an error message on invalid transfer, or null on success. */
  transferBetweenWallets: (fromId: string, toId: string, amount: number) => string | null;
  deleteTransfer: (id: string) => void;
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<Omit<SavingsGoal, 'id'>>) => void;
  deleteGoal: (id: string) => void;
  /** Positive adds to the goal, negative takes money out. */
  contributeToGoal: (goalId: string, amount: number) => void;
  addBill: (bill: Omit<RecurringBill, 'id' | 'paidMonths'>) => void;
  updateBill: (
    id: string,
    updates: Partial<Omit<RecurringBill, 'id' | 'paidMonths'>>
  ) => void;
  deleteBill: (id: string) => void;
  markBillPaid: (billId: string) => void;
  recordBackup: (info: BackupInfo) => void;
  exportSnapshot: () => BudgetSnapshot;
  restoreSnapshot: (data: unknown) => boolean;
  /** Erases all budget data on this phone. */
  resetAll: () => void;
  hideAmountsOnHome: boolean;
  setHideAmountsOnHome: (v: boolean) => void;
  noxSuggestionsEnabled: boolean;
  setNoxSuggestionsEnabled: (v: boolean) => void;
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

const SNAPSHOT_VERSION = 2;

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

function resolveWallet(
  wallets: readonly WalletRecord[],
  walletId?: string,
  walletName?: string
): WalletRecord | undefined {
  if (walletId) {
    const byId = wallets.find((w) => w.id === walletId);
    if (byId) return byId;
  }
  if (walletName) {
    return wallets.find((w) => sameName(w.name, walletName));
  }
  return undefined;
}

function matchesWallet(
  wallet: WalletRecord,
  refId?: string,
  refName?: string
): boolean {
  if (refId) return refId === wallet.id;
  if (refName) return sameName(refName, wallet.name);
  return false;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeWallets(raw: unknown[]): WalletRecord[] {
  const valid: WalletRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const w = item as Partial<WalletRecord>;
    if (typeof w.id !== 'string' || !w.id.trim()) continue;
    if (typeof w.name !== 'string' || !w.name.trim()) continue;
    const initialBalance =
      typeof w.initialBalance === 'number' && isValidFiniteAmount(w.initialBalance)
        ? roundMoney(w.initialBalance)
        : 0;
    const iconType =
      w.iconType === 'cash' || w.iconType === 'ewallet' || w.iconType === 'bank'
        ? w.iconType
        : 'cash';
    valid.push({
      id: w.id,
      name: w.name.trim(),
      subtitle: typeof w.subtitle === 'string' ? w.subtitle : '',
      initialBalance,
      isDefault: !!w.isDefault,
      iconType,
    });
  }
  if (valid.length > 0 && !valid.some((w) => w.isDefault)) {
    valid[0] = { ...valid[0], isDefault: true };
  }
  return valid;
}

function sanitizeTransactions(
  raw: unknown[],
  wallets: readonly WalletRecord[]
): Transaction[] {
  const valid: Transaction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Partial<Transaction>;
    if (typeof t.id !== 'string' || !t.id.trim()) continue;
    if (typeof t.title !== 'string') continue;
    if (typeof t.category !== 'string') continue;
    if (typeof t.amount !== 'number' || !isValidPositiveAmount(t.amount)) continue;
    if (t.type !== 'expense' && t.type !== 'income' && t.type !== 'transfer') continue;
    if (typeof t.date !== 'string' || !ISO_DATE_RE.test(t.date)) continue;
    const matched = resolveWallet(wallets, t.walletId, t.wallet);
    valid.push({
      id: t.id,
      title: t.title,
      category: t.category,
      amount: roundMoney(t.amount),
      type: t.type,
      date: t.date,
      createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
      wallet: matched?.name ?? (typeof t.wallet === 'string' ? t.wallet : wallets[0]?.name ?? ''),
      walletId: matched?.id ?? t.walletId,
      repeat: typeof t.repeat === 'string' ? t.repeat : undefined,
      note: typeof t.note === 'string' ? t.note : undefined,
      noxSource: typeof t.noxSource === 'string' ? t.noxSource : undefined,
    });
  }
  return valid;
}

function sanitizeTransfers(
  raw: unknown[],
  wallets: readonly WalletRecord[]
): TransferRecord[] {
  const valid: TransferRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const tr = item as Partial<TransferRecord>;
    if (typeof tr.id !== 'string' || !tr.id.trim()) continue;
    if (typeof tr.amount !== 'number' || !isValidPositiveAmount(tr.amount)) continue;
    if (typeof tr.date !== 'string' || !ISO_DATE_RE.test(tr.date)) continue;
    const fromW = resolveWallet(wallets, tr.fromId, tr.from);
    const toW = resolveWallet(wallets, tr.toId, tr.to);
    if (!fromW && typeof tr.from !== 'string') continue;
    if (!toW && typeof tr.to !== 'string') continue;
    valid.push({
      id: tr.id,
      from: fromW?.name ?? (tr.from as string),
      to: toW?.name ?? (tr.to as string),
      fromId: fromW?.id ?? tr.fromId,
      toId: toW?.id ?? tr.toId,
      amount: roundMoney(tr.amount),
      date: tr.date,
      createdAt: typeof tr.createdAt === 'string' ? tr.createdAt : undefined,
    });
  }
  return valid;
}

function sanitizeBills(
  raw: unknown[],
  wallets: readonly WalletRecord[]
): RecurringBill[] {
  const valid: RecurringBill[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const b = item as Partial<RecurringBill>;
    if (typeof b.id !== 'string' || !b.id.trim()) continue;
    if (typeof b.title !== 'string') continue;
    if (typeof b.amount !== 'number' || !isValidPositiveAmount(b.amount)) continue;
    if (typeof b.dueDay !== 'number' || b.dueDay < 1 || b.dueDay > 31) continue;
    const matched = resolveWallet(wallets, b.walletId, b.wallet);
    valid.push({
      id: b.id,
      title: b.title,
      wallet: matched?.name ?? (typeof b.wallet === 'string' ? b.wallet : wallets[0]?.name ?? ''),
      walletId: matched?.id ?? b.walletId,
      amount: roundMoney(b.amount),
      dueDay: Math.round(b.dueDay),
      paidMonths: Array.isArray(b.paidMonths)
        ? b.paidMonths.filter((m): m is string => typeof m === 'string')
        : [],
    });
  }
  return valid;
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
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Seed starter categories once, after the user picks "Simple" in onboarding.
  const seededRef = useRef(false);
  // Prevents resetAll() from immediately re-persisting empty defaults after removeKeys().
  const skipNextPersistRef = useRef(false);

  const clearStorageError = useCallback(() => {
    setStorageError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadJSONSafe<Partial<PersistedBudget>>(STORAGE_KEYS.budget).then((result) => {
      if (cancelled) return;
      if (result.status === 'error') {
        // Do NOT mark hydrated on read failure so auto-save never overwrites disk data.
        setStorageError(
          'Could not read saved budget data. Writes are paused to protect your records.'
        );
        return;
      }
      if (result.status === 'ok') {
        const saved = result.data;
        const nextWallets =
          Array.isArray(saved.wallets) && saved.wallets.length > 0
            ? sanitizeWallets(saved.wallets)
            : [DEFAULT_WALLET];
        const effectiveWallets = nextWallets.length > 0 ? nextWallets : [DEFAULT_WALLET];
        setWalletRecords(effectiveWallets);

        if (Array.isArray(saved.transactions)) {
          setTransactions(sanitizeTransactions(saved.transactions, effectiveWallets));
        }
        if (Array.isArray(saved.categories)) setCategoryRecords(saved.categories);
        if (Array.isArray(saved.transfers)) {
          setTransfers(sanitizeTransfers(saved.transfers, effectiveWallets));
        }
        if (Array.isArray(saved.goals)) setGoals(saved.goals);
        if (Array.isArray(saved.bills)) {
          setBills(sanitizeBills(saved.bills, effectiveWallets));
        }
        setLastBackup(saved.lastBackup ?? null);
        if (typeof saved.hideAmountsOnHome === 'boolean') {
          setHideAmountsOnHome(saved.hideAmountsOnHome);
        }
        if (typeof saved.noxSuggestionsEnabled === 'boolean') {
          setNoxSuggestionsEnabled(saved.noxSuggestionsEnabled);
        }
        seededRef.current = !!saved.seeded;
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    let cancelled = false;
    const data: PersistedBudget = {
      version: SNAPSHOT_VERSION,
      transactions,
      categories: categoryRecords,
      wallets: walletRecords,
      transfers,
      goals,
      bills,
      seeded: seededRef.current,
      lastBackup,
      hideAmountsOnHome,
      noxSuggestionsEnabled,
    };
    saveJSONStrict(STORAGE_KEYS.budget, data)
      .then(() => {
        if (!cancelled) setStorageError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setStorageError(
            'Could not save your latest changes to device storage. Free up space and try again.'
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    hydrated,
    transactions,
    categoryRecords,
    walletRecords,
    transfers,
    goals,
    bills,
    lastBackup,
    hideAmountsOnHome,
    noxSuggestionsEnabled,
  ]);

  useEffect(() => {
    if (!hydrated || !hasCompletedOnboarding || seededRef.current) return;
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
  }, [hydrated, hasCompletedOnboarding, starterMode]);

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
      sumMoney(
        periodTransactions
          .filter((t) => t.type === 'expense')
          .map((t) => t.amount)
      ),
    [periodTransactions]
  );
  const totalIncome = useMemo(
    () =>
      sumMoney(
        periodTransactions
          .filter((t) => t.type === 'income')
          .map((t) => t.amount)
      ),
    [periodTransactions]
  );
  const leftToSpend = Math.max(0, subMoney(totalBudget, totalSpent));
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
          spent: sumMoney(matching.map((t) => t.amount)),
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
        let balanceCents = toCents(w.initialBalance);
        for (const t of transactions) {
          if (!matchesWallet(w, t.walletId, t.wallet)) continue;
          const amtCents = toCents(t.amount);
          if (t.type === 'income') balanceCents += amtCents;
          else if (t.type === 'expense') balanceCents -= amtCents;
        }
        for (const tr of transfers) {
          const amtCents = toCents(tr.amount);
          if (matchesWallet(w, tr.fromId, tr.from)) balanceCents -= amtCents;
          if (matchesWallet(w, tr.toId, tr.to)) balanceCents += amtCents;
        }
        return { ...w, balance: fromCents(balanceCents) };
      }),
    [walletRecords, transactions, transfers]
  );
  const defaultWallet = wallets.find((w) => w.isDefault) ?? wallets[0];

  const addTransaction = useCallback(
    (tx: NewTransaction): string => {
      if (tx.type === 'transfer') return '';
      if (!isValidPositiveAmount(tx.amount)) return '';
      const matchedWallet =
        resolveWallet(walletRecords, tx.walletId, tx.wallet) ??
        walletRecords.find((w) => w.isDefault) ??
        walletRecords[0];
      if (!matchedWallet) return '';
      const id = makeId('tx');
      setTransactions((prev) => [
        {
          ...tx,
          amount: roundMoney(tx.amount),
          wallet: matchedWallet.name,
          walletId: matchedWallet.id,
          id,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      return id;
    },
    [walletRecords]
  );

  const updateTransaction = useCallback(
    (id: string, updates: Partial<NewTransaction>) => {
      if (updates.type === 'transfer') return;
      if (updates.amount !== undefined && !isValidPositiveAmount(updates.amount)) {
        return;
      }

      let resolvedWallet: WalletRecord | undefined;
      if (updates.walletId !== undefined || updates.wallet !== undefined) {
        resolvedWallet = resolveWallet(walletRecords, updates.walletId, updates.wallet);
        if (!resolvedWallet) return;
      }

      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id !== id) return tx;
          const next: Transaction = {
            ...tx,
            ...updates,
            amount:
              updates.amount !== undefined ? roundMoney(updates.amount) : tx.amount,
          };
          if (resolvedWallet) {
            next.wallet = resolvedWallet.name;
            next.walletId = resolvedWallet.id;
          }
          // If type switched without a compatible category, keep it consistent.
          if (
            updates.type &&
            updates.type !== tx.type &&
            updates.category === undefined
          ) {
            const firstMatch = categoryRecords.find((c) => c.type === updates.type);
            if (firstMatch) next.category = firstMatch.name;
          }
          return next;
        })
      );
    },
    [walletRecords, categoryRecords]
  );

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }, []);

  const moveBudget = useCallback(
    (fromName: string, toName: string, amount: number) => {
      if (!isValidPositiveAmount(amount)) return;
      const rounded = roundMoney(amount);
      setCategoryRecords((prev) =>
        prev.map((cat) => {
          if (cat.type !== 'expense') return cat;
          if (sameName(cat.name, fromName)) {
            return { ...cat, limit: Math.max(0, subMoney(cat.limit, rounded)) };
          }
          if (sameName(cat.name, toName)) {
            return { ...cat, limit: addMoney(cat.limit, rounded) };
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
    (
      name: string,
      limit: number,
      type: CategoryType = 'expense',
      options?: { movePastMatches?: boolean }
    ): number => {
      const trimmed = name.trim();
      if (!trimmed) return -1;
      if (categoryRecords.some((c) => c.type === type && sameName(c.name, trimmed))) {
        return -1;
      }
      setCategoryRecords((prev) => [
        ...prev,
        { id: makeId('cat'), name: trimmed, limit, type },
      ]);
      if (!options?.movePastMatches) return 0;
      const needle = trimmed.toLowerCase();
      const matches = (t: Transaction) =>
        t.type === type &&
        !sameName(t.category, trimmed) &&
        `${t.title} ${t.note ?? ''}`.toLowerCase().includes(needle);
      const moved = transactions.filter(matches).length;
      if (moved > 0) {
        setTransactions((prev) =>
          prev.map((t) => (matches(t) ? { ...t, category: trimmed } : t))
        );
      }
      return moved;
    },
    [categoryRecords, transactions]
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

  const deleteCategory = useCallback((id: string) => {
    // Past entries keep their category label so history stays readable.
    setCategoryRecords((prev) => prev.filter((c) => c.id !== id));
  }, []);

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
    const trimmed = wallet.name.trim();
    if (!trimmed) return;
    const initialBalance = isValidFiniteAmount(wallet.initialBalance)
      ? roundMoney(wallet.initialBalance)
      : 0;
    setWalletRecords((prev) => {
      if (prev.some((w) => sameName(w.name, trimmed))) return prev;
      return [
        ...prev,
        {
          ...wallet,
          name: trimmed,
          initialBalance,
          id: makeId('w'),
          isDefault: prev.some((w) => w.isDefault) ? wallet.isDefault : true,
        },
      ];
    });
  }, []);

  const updateWallet = useCallback(
    (
      id: string,
      updates: Partial<Pick<WalletRecord, 'name' | 'subtitle' | 'iconType'>>
    ) => {
      const existing = walletRecords.find((w) => w.id === id);
      if (!existing) return;
      const nextName = updates.name?.trim() || existing.name;
      if (
        !sameName(nextName, existing.name) &&
        walletRecords.some((w) => w.id !== id && sameName(w.name, nextName))
      ) {
        return;
      }
      setWalletRecords((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updates, name: nextName } : w))
      );
      // Keep display names synced alongside immutable wallet IDs.
      if (nextName !== existing.name) {
        setTransactions((prev) =>
          prev.map((t) =>
            matchesWallet(existing, t.walletId, t.wallet)
              ? { ...t, wallet: nextName, walletId: existing.id }
              : t
          )
        );
        setTransfers((prev) =>
          prev.map((tr) => ({
            ...tr,
            from: matchesWallet(existing, tr.fromId, tr.from) ? nextName : tr.from,
            fromId: matchesWallet(existing, tr.fromId, tr.from) ? existing.id : tr.fromId,
            to: matchesWallet(existing, tr.toId, tr.to) ? nextName : tr.to,
            toId: matchesWallet(existing, tr.toId, tr.to) ? existing.id : tr.toId,
          }))
        );
        setBills((prev) =>
          prev.map((b) =>
            matchesWallet(existing, b.walletId, b.wallet)
              ? { ...b, wallet: nextName, walletId: existing.id }
              : b
          )
        );
      }
    },
    [walletRecords]
  );

  const setDefaultWallet = useCallback((id: string) => {
    setWalletRecords((prev) => prev.map((w) => ({ ...w, isDefault: w.id === id })));
  }, []);

  const deleteWallet = useCallback(
    (id: string): string | null => {
      const wallet = walletRecords.find((w) => w.id === id);
      if (!wallet) return null;
      if (walletRecords.length <= 1) return 'You need at least one wallet.';
      const used =
        transactions.filter((t) => matchesWallet(wallet, t.walletId, t.wallet)).length +
        transfers.filter(
          (tr) =>
            matchesWallet(wallet, tr.fromId, tr.from) ||
            matchesWallet(wallet, tr.toId, tr.to)
        ).length;
      if (used > 0) {
        return `${wallet.name} has ${used} ${used === 1 ? 'entry' : 'entries'}. Move or delete them first.`;
      }
      if (bills.some((b) => matchesWallet(wallet, b.walletId, b.wallet))) {
        return `${wallet.name} pays a recurring bill. Change that bill's wallet first.`;
      }
      setWalletRecords((prev) => {
        const rest = prev.filter((w) => w.id !== id);
        if (wallet.isDefault && rest.length > 0) {
          rest[0] = { ...rest[0], isDefault: true };
        }
        return rest;
      });
      return null;
    },
    [walletRecords, transactions, transfers, bills]
  );

  const transferBetweenWallets = useCallback(
    (fromId: string, toId: string, amount: number): string | null => {
      if (!fromId || !toId || fromId === toId) {
        return 'Pick two different wallets.';
      }
      if (!isValidPositiveAmount(amount)) {
        return 'Enter a valid amount greater than 0.';
      }
      const fromWallet = walletRecords.find((w) => w.id === fromId);
      const toWallet = walletRecords.find((w) => w.id === toId);
      if (!fromWallet || !toWallet) {
        return 'One of the selected wallets no longer exists.';
      }
      const now = new Date();
      setTransfers((prev) => [
        {
          id: makeId('tr'),
          from: fromWallet.name,
          to: toWallet.name,
          fromId: fromWallet.id,
          toId: toWallet.id,
          amount: roundMoney(amount),
          date: toISODate(now),
          createdAt: now.toISOString(),
        },
        ...prev,
      ]);
      return null;
    },
    [walletRecords]
  );

  const deleteTransfer = useCallback((id: string) => {
    setTransfers((prev) => prev.filter((tr) => tr.id !== id));
  }, []);

  const addGoal = useCallback((goal: Omit<SavingsGoal, 'id'>) => {
    setGoals((prev) => [
      ...prev,
      {
        ...goal,
        saved: isValidFiniteAmount(goal.saved) ? Math.max(0, roundMoney(goal.saved)) : 0,
        target: isValidFiniteAmount(goal.target) ? Math.max(0, roundMoney(goal.target)) : 0,
        id: makeId('g'),
      },
    ]);
  }, []);

  const updateGoal = useCallback(
    (id: string, updates: Partial<Omit<SavingsGoal, 'id'>>) => {
      setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    },
    []
  );

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const contributeToGoal = useCallback((goalId: string, amount: number) => {
    if (!isValidFiniteAmount(amount) || toCents(amount) === 0) return;
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? {
              ...g,
              saved: Math.max(0, Math.min(g.target, addMoney(g.saved, amount))),
            }
          : g
      )
    );
  }, []);

  const addBill = useCallback((bill: Omit<RecurringBill, 'id' | 'paidMonths'>) => {
    setBills((prev) => [...prev, { ...bill, id: makeId('b'), paidMonths: [] }]);
  }, []);

  const updateBill = useCallback(
    (id: string, updates: Partial<Omit<RecurringBill, 'id' | 'paidMonths'>>) => {
      setBills((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    },
    []
  );

  const deleteBill = useCallback((id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
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
      version: SNAPSHOT_VERSION,
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

    const cleanWallets = sanitizeWallets(snap.wallets as unknown[]);
    if (cleanWallets.length === 0) return false;

    const cleanTransactions = sanitizeTransactions(
      snap.transactions as unknown[],
      cleanWallets
    );
    const cleanTransfers = sanitizeTransfers(
      snap.transfers as unknown[],
      cleanWallets
    );
    const cleanBills = sanitizeBills(snap.bills as unknown[], cleanWallets);

    // Reject snapshots with corrupted/invalid financial records rather than partial import.
    if (
      cleanTransactions.length !== (snap.transactions as unknown[]).length ||
      cleanTransfers.length !== (snap.transfers as unknown[]).length ||
      cleanBills.length !== (snap.bills as unknown[]).length
    ) {
      return false;
    }

    setTransactions(cleanTransactions);
    setCategoryRecords(snap.categories as CategoryRecord[]);
    setWalletRecords(cleanWallets);
    setTransfers(cleanTransfers);
    setGoals(snap.goals as SavingsGoal[]);
    setBills(cleanBills);
    seededRef.current = true;
    return true;
  }, []);

  const resetAll = useCallback(() => {
    skipNextPersistRef.current = true;
    setTransactions([]);
    setCategoryRecords([]);
    setWalletRecords([DEFAULT_WALLET]);
    setTransfers([]);
    setGoals([]);
    setBills([]);
    setLastBackup(null);
    setHideAmountsOnHome(false);
    setNoxSuggestionsEnabled(true);
    setStorageError(null);
    seededRef.current = false;
    removeKeys([STORAGE_KEYS.budget]);
  }, []);

  const value = useMemo<BudgetContextValue>(
    () => ({
      hydrated,
      storageError,
      clearStorageError,
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
      deleteCategory,
      reorderCategory,
      addWallet,
      updateWallet,
      setDefaultWallet,
      deleteWallet,
      transferBetweenWallets,
      deleteTransfer,
      addGoal,
      updateGoal,
      deleteGoal,
      contributeToGoal,
      addBill,
      updateBill,
      deleteBill,
      markBillPaid,
      recordBackup,
      exportSnapshot,
      restoreSnapshot,
      resetAll,
      hideAmountsOnHome,
      setHideAmountsOnHome,
      noxSuggestionsEnabled,
      setNoxSuggestionsEnabled,
    }),
    [
      hydrated,
      storageError,
      clearStorageError,
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
      deleteCategory,
      reorderCategory,
      addWallet,
      updateWallet,
      setDefaultWallet,
      deleteWallet,
      transferBetweenWallets,
      deleteTransfer,
      addGoal,
      updateGoal,
      deleteGoal,
      contributeToGoal,
      addBill,
      updateBill,
      deleteBill,
      markBillPaid,
      recordBackup,
      exportSnapshot,
      restoreSnapshot,
      resetAll,
      hideAmountsOnHome,
      noxSuggestionsEnabled,
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
