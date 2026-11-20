import React, { createContext, useContext, useMemo, useState } from 'react';
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
}

export interface WalletItem {
  id: string;
  name: string;
  subtitle: string;
  balance: number;
  isDefault?: boolean;
  iconType: 'cash' | 'ewallet' | 'bank';
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
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  moveBudget: (fromName: string, toName: string, amount: number) => void;
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

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const { monthlyBudget } = useOnboarding();
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [categories, setCategories] = useState<CategoryBudget[]>(INITIAL_CATEGORIES);
  const [wallets] = useState<WalletItem[]>(INITIAL_WALLETS);
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

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: Date.now().toString(),
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
    }
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  const moveBudget = (fromName: string, toName: string, amount: number) => {
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
  };

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
      addTransaction,
      updateTransaction,
      deleteTransaction,
      moveBudget,
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
      movedSuggestion,
      hideAmountsOnHome,
      noxSuggestionsEnabled,
      appLockEnabled,
    ]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error('useBudget must be used within BudgetProvider');
  }
  return ctx;
}
