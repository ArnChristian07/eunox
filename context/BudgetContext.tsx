import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useOnboarding } from './OnboardingContext';

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  title: string;
  category: string;
  amount: number;
  type: TransactionType;
  dateLabel: string;
  dateGroup?: string;
  fullDate?: string;
  wallet: string;
  repeat?: string;
  note?: string;
  noxSource?: string;
}

export interface CategoryBudget {
  id: string;
  name: string;
  spent: number;
  limit: number;
  type?: 'expense' | 'income';
}

export interface WalletItem {
  id: string;
  name: string;
  subtitle: string;
  balance: number;
  isDefault?: boolean;
  iconType: 'cash' | 'ewallet' | 'bank';
}

export interface TransferRecord {
  id: string;
  from: string;
  to: string;
  amount: number;
  dateLabel: string;
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
  month: string;
  day: string;
  title: string;
  wallet: string;
  amount: number;
  paid: boolean;
  dueLabel?: string;
  section: 'this' | 'next';
}

interface BudgetContextValue {
  totalBudget: number;
  totalSpent: number;
  leftToSpend: number;
  daysLeft: number;
  safeToSpendToday: number;
  transactions: Transaction[];
  categories: CategoryBudget[];
  wallets: WalletItem[];
  transfers: TransferRecord[];
  goals: SavingsGoal[];
  bills: RecurringBill[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => string;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  moveBudget: (fromName: string, toName: string, amount: number) => void;
  raiseCategoryLimit: (categoryName: string, newLimit: number) => void;
  addCategory: (name: string, limit: number) => void;
  updateCategory: (id: string, name: string, limit: number) => void;
  reorderCategory: (id: string, direction: 'up' | 'down') => void;
  addWallet: (wallet: Omit<WalletItem, 'id'>) => void;
  transferBetweenWallets: (fromId: string, toId: string, amount: number) => void;
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  contributeToGoal: (goalId: string, amount: number) => void;
  addBill: (bill: Omit<RecurringBill, 'id'>) => void;
  markBillPaid: (billId: string) => void;
  movedSuggestion: boolean;
  hideAmountsOnHome: boolean;
  setHideAmountsOnHome: (v: boolean) => void;
  noxSuggestionsEnabled: boolean;
  setNoxSuggestionsEnabled: (v: boolean) => void;
  appLockEnabled: boolean;
  setAppLockEnabled: (v: boolean) => void;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    title: 'Weekly groceries',
    category: 'Food',
    amount: 1240,
    type: 'expense',
    dateLabel: 'Today',
    dateGroup: 'Today · Fri, Nov 20',
    fullDate: 'Fri, Nov 20, 2026',
    wallet: 'Cash wallet',
    repeat: 'Never',
  },
  {
    id: '2',
    title: 'Jeepney and tricycle',
    category: 'Transport',
    amount: 86,
    type: 'expense',
    dateLabel: 'Today',
    dateGroup: 'Today · Fri, Nov 20',
    fullDate: 'Fri, Nov 20, 2026',
    wallet: 'Cash wallet',
    repeat: 'Never',
  },
  {
    id: '3',
    title: 'Lunch',
    category: 'Food',
    amount: 180,
    type: 'expense',
    dateLabel: 'Yesterday',
    dateGroup: 'Yesterday · Thu, Nov 19',
    fullDate: 'Thu, Nov 19, 2026',
    wallet: 'Cash wallet',
    repeat: 'Never',
    note: 'With classmates after the exam',
    noxSource: 'lunch 180 yesterday',
  },
  {
    id: '4',
    title: 'Freelance payment',
    category: 'Income',
    amount: 3500,
    type: 'income',
    dateLabel: 'Yesterday',
    dateGroup: 'Yesterday · Thu, Nov 19',
    fullDate: 'Thu, Nov 19, 2026',
    wallet: 'E-wallet',
    repeat: 'Never',
  },
  {
    id: '5',
    title: 'Mobile load',
    category: 'Bills',
    amount: 299,
    type: 'expense',
    dateLabel: 'Yesterday',
    dateGroup: 'Yesterday · Thu, Nov 19',
    fullDate: 'Thu, Nov 19, 2026',
    wallet: 'E-wallet',
    repeat: 'Never',
  },
  {
    id: '6',
    title: 'Electric bill',
    category: 'Bills',
    amount: 2150,
    type: 'expense',
    dateLabel: 'Wed, Nov 18',
    dateGroup: 'Wed, Nov 18',
    fullDate: 'Wed, Nov 18, 2026',
    wallet: 'Bank savings',
    repeat: 'Monthly',
  },
  {
    id: '7',
    title: 'Movie night',
    category: 'Fun',
    amount: 500,
    type: 'expense',
    dateLabel: 'Wed, Nov 18',
    dateGroup: 'Wed, Nov 18',
    fullDate: 'Wed, Nov 18, 2026',
    wallet: 'E-wallet',
    repeat: 'Never',
  },
];

const INITIAL_CATEGORIES: CategoryBudget[] = [
  { id: 'food', name: 'Food', spent: 4920, limit: 6000 },
  { id: 'transport', name: 'Transport', spent: 1850, limit: 3000 },
  { id: 'bills', name: 'Bills', spent: 4299, limit: 5000 },
  { id: 'shopping', name: 'Shopping', spent: 1610, limit: 3500 },
  { id: 'health', name: 'Health', spent: 400.5, limit: 1500 },
  { id: 'fun', name: 'Fun', spent: 500, limit: 3000 },
];

const INITIAL_WALLETS: WalletItem[] = [
  {
    id: 'w1',
    name: 'Cash wallet',
    subtitle: 'Default for new expenses',
    balance: 2340,
    isDefault: true,
    iconType: 'cash',
  },
  {
    id: 'w2',
    name: 'E-wallet',
    subtitle: 'Load, bills, online',
    balance: 6900,
    iconType: 'ewallet',
  },
  {
    id: 'w3',
    name: 'Bank savings',
    subtitle: 'Not counted in monthly budget',
    balance: 22000,
    iconType: 'bank',
  },
];

const INITIAL_TRANSFERS: TransferRecord[] = [
  {
    id: 'tr-1',
    from: 'Cash wallet',
    to: 'E-wallet',
    amount: 1000,
    dateLabel: 'Tue, Nov 17',
  },
];

const INITIAL_GOALS: SavingsGoal[] = [
  {
    id: 'g1',
    title: 'New laptop',
    subtitle: 'By June 2027 · about ₱3,143 a month',
    saved: 18000,
    target: 40000,
  },
  {
    id: 'g2',
    title: 'Emergency fund',
    subtitle: 'No deadline',
    saved: 4000,
    target: 10000,
  },
  {
    id: 'g3',
    title: 'Jacket',
    subtitle: 'From your chat with Nox · after Dec 1',
    saved: 0,
    target: 2500,
  },
];

const INITIAL_BILLS: RecurringBill[] = [
  {
    id: 'b1',
    month: 'NOV',
    day: '18',
    title: 'Electric bill',
    wallet: 'Bank savings',
    amount: 2150,
    paid: true,
    section: 'this',
  },
  {
    id: 'b2',
    month: 'NOV',
    day: '19',
    title: 'Mobile load',
    wallet: 'E-wallet',
    amount: 299,
    paid: true,
    section: 'this',
  },
  {
    id: 'b3',
    month: 'NOV',
    day: '25',
    title: 'Home internet',
    wallet: 'E-wallet',
    amount: 1699,
    paid: false,
    dueLabel: 'Due in 5 days',
    section: 'this',
  },
  {
    id: 'b4',
    month: 'NOV',
    day: '28',
    title: 'Music subscription',
    wallet: 'E-wallet',
    amount: 169,
    paid: false,
    dueLabel: 'Due in 8 days',
    section: 'this',
  },
  {
    id: 'b5',
    month: 'DEC',
    day: '1',
    title: 'Dorm rent',
    wallet: 'Bank savings',
    amount: 4500,
    paid: false,
    dueLabel: 'Monthly',
    section: 'next',
  },
];

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const { monthlyBudget } = useOnboarding();
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [categories, setCategories] = useState<CategoryBudget[]>(INITIAL_CATEGORIES);
  const [wallets, setWallets] = useState<WalletItem[]>(INITIAL_WALLETS);
  const [transfers, setTransfers] = useState<TransferRecord[]>(INITIAL_TRANSFERS);
  const [goals, setGoals] = useState<SavingsGoal[]>(INITIAL_GOALS);
  const [bills, setBills] = useState<RecurringBill[]>(INITIAL_BILLS);
  const [movedSuggestion, setMovedSuggestion] = useState(false);
  const [hideAmountsOnHome, setHideAmountsOnHome] = useState(false);
  const [noxSuggestionsEnabled, setNoxSuggestionsEnabled] = useState(true);
  const [appLockEnabled, setAppLockEnabled] = useState(true);

  const totalBudget = useMemo(() => {
    const parsed = Number((monthlyBudget || '22000').replace(/[^0-9.]/g, ''));
    return parsed > 0 ? parsed : 22000;
  }, [monthlyBudget]);

  const totalSpent = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.spent, 0),
    [categories]
  );

  const daysLeft = 11;
  const leftToSpend = Math.max(0, totalBudget - totalSpent);
  const safeToSpendToday = Math.round(leftToSpend / daysLeft);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>): string => {
    const id = Date.now().toString();
    const newTx: Transaction = {
      ...tx,
      id,
      dateGroup: tx.dateGroup ?? 'Today · Fri, Nov 20',
      fullDate: tx.fullDate ?? 'Fri, Nov 20, 2026',
      repeat: tx.repeat ?? 'Never',
    };
    setTransactions((prev) => [newTx, ...prev]);

    if (tx.type === 'expense') {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.name.toLowerCase() === tx.category.toLowerCase()
            ? { ...cat, spent: cat.spent + tx.amount }
            : cat
        )
      );
      setWallets((prev) =>
        prev.map((w) =>
          w.name === tx.wallet
            ? { ...w, balance: Math.max(0, w.balance - tx.amount) }
            : w
        )
      );
    } else if (tx.type === 'income') {
      setWallets((prev) =>
        prev.map((w) =>
          w.name === tx.wallet ? { ...w, balance: w.balance + tx.amount } : w
        )
      );
    }
    return id;
  }, []);

  const updateTransaction = useCallback(
    (id: string, updates: Partial<Transaction>) => {
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
      );
    },
    []
  );

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => {
      const target = prev.find((tx) => tx.id === id);
      if (target && target.type === 'expense') {
        setCategories((cats) =>
          cats.map((cat) =>
            cat.name.toLowerCase() === target.category.toLowerCase()
              ? { ...cat, spent: Math.max(0, cat.spent - target.amount) }
              : cat
          )
        );
        setWallets((ws) =>
          ws.map((w) =>
            w.name === target.wallet
              ? { ...w, balance: w.balance + target.amount }
              : w
          )
        );
      }
      return prev.filter((tx) => tx.id !== id);
    });
  }, []);

  const moveBudget = useCallback(
    (fromName: string, toName: string, amount: number) => {
      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.name === fromName) {
            return { ...cat, limit: Math.max(0, cat.limit - amount) };
          }
          if (cat.name === toName) {
            return { ...cat, limit: cat.limit + amount };
          }
          return cat;
        })
      );
      setMovedSuggestion(true);
    },
    []
  );

  const raiseCategoryLimit = useCallback(
    (categoryName: string, newLimit: number) => {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.name === categoryName ? { ...cat, limit: newLimit } : cat
        )
      );
    },
    []
  );

  const addCategory = useCallback((name: string, limit: number) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => [
      ...prev,
      { id: `cat-${Date.now()}`, name: trimmed, spent: 0, limit },
    ]);
  }, []);

  const updateCategory = useCallback((id: string, name: string, limit: number) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name, limit } : c))
    );
  }, []);

  const reorderCategory = useCallback((id: string, direction: 'up' | 'down') => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  }, []);

  const addWallet = useCallback((wallet: Omit<WalletItem, 'id'>) => {
    setWallets((prev) => [
      ...prev,
      { ...wallet, id: `w-${Date.now()}` },
    ]);
  }, []);

  const transferBetweenWallets = useCallback(
    (fromId: string, toId: string, amount: number) => {
      if (fromId === toId || amount <= 0) return;
      setWallets((prev) => {
        const fromWallet = prev.find((w) => w.id === fromId);
        const toWallet = prev.find((w) => w.id === toId);
        if (!fromWallet || !toWallet) return prev;

        setTransfers((tr) => [
          {
            id: `tr-${Date.now()}`,
            from: fromWallet.name,
            to: toWallet.name,
            amount,
            dateLabel: 'Today',
          },
          ...tr,
        ]);

        return prev.map((w) => {
          if (w.id === fromId) return { ...w, balance: Math.max(0, w.balance - amount) };
          if (w.id === toId) return { ...w, balance: w.balance + amount };
          return w;
        });
      });
    },
    []
  );

  const addGoal = useCallback((goal: Omit<SavingsGoal, 'id'>) => {
    setGoals((prev) => [...prev, { ...goal, id: `g-${Date.now()}` }]);
  }, []);

  const contributeToGoal = useCallback((goalId: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, saved: Math.min(g.target, g.saved + amount) }
          : g
      )
    );
  }, []);

  const addBill = useCallback((bill: Omit<RecurringBill, 'id'>) => {
    setBills((prev) => [...prev, { ...bill, id: `b-${Date.now()}` }]);
  }, []);

  const markBillPaid = useCallback((billId: string) => {
    setBills((prev) =>
      prev.map((b) => (b.id === billId ? { ...b, paid: true } : b))
    );
  }, []);

  const value = useMemo<BudgetContextValue>(
    () => ({
      totalBudget,
      totalSpent,
      leftToSpend,
      daysLeft,
      safeToSpendToday,
      transactions,
      categories,
      wallets,
      transfers,
      goals,
      bills,
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
      movedSuggestion,
      hideAmountsOnHome,
      setHideAmountsOnHome,
      noxSuggestionsEnabled,
      setNoxSuggestionsEnabled,
      appLockEnabled,
      setAppLockEnabled,
    }),
    [
      totalBudget,
      totalSpent,
      leftToSpend,
      safeToSpendToday,
      transactions,
      categories,
      wallets,
      transfers,
      goals,
      bills,
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
      movedSuggestion,
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
