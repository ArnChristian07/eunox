import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getLocales } from 'expo-localization';
import { CURRENCIES, Currency } from '@/constants/currencies';
import { loadJSONSafe, saveJSON, STORAGE_KEYS } from '@/lib/storage';

export type MonthStartOption = '1st' | '15th' | 'Last day' | 'Other';
export type StarterMode = 'simple' | 'blank';

/** The user's money settings, also included in backup files. */
export interface MoneySettings {
  currencyCode: string;
  monthlyBudget: string;
  monthStart: MonthStartOption;
}

interface PersistedOnboarding extends MoneySettings {
  hasCompletedOnboarding: boolean;
  starterMode: StarterMode;
}

interface OnboardingContextValue {
  /** False until saved settings have been read from storage. */
  hydrated: boolean;
  /** Non-null when AsyncStorage read failed on bootstrap. */
  storageError: string | null;
  retryHydration: () => void;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  regionCurrencyCode: string;
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  monthlyBudget: string;
  setMonthlyBudget: (value: string) => void;
  monthStart: MonthStartOption;
  setMonthStart: (option: MonthStartOption) => void;
  starterMode: StarterMode;
  setStarterMode: (mode: StarterMode) => void;
  getMoneySettings: () => MoneySettings;
  /** Applies settings from a restored backup and skips onboarding. */
  applyMoneySettings: (settings: Partial<MoneySettings>) => void;
  resetOnboarding: () => void;
}

const MONTH_START_OPTIONS: MonthStartOption[] = ['1st', '15th', 'Last day', 'Other'];

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function detectRegionCurrencyCode(): string {
  try {
    const locales = getLocales();
    const code = locales?.[0]?.currencyCode;
    if (code && CURRENCIES.some((c) => c.code === code)) {
      return code;
    }
  } catch {
    // Fallback to PHP
  }
  return 'PHP';
}

function findCurrency(code: string | undefined): Currency | undefined {
  return code ? CURRENCIES.find((c) => c.code === code) : undefined;
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const regionCurrencyCode = useMemo(() => detectRegionCurrencyCode(), []);
  const initialCurrency = useMemo(
    () => findCurrency(regionCurrencyCode) ?? CURRENCIES[0],
    [regionCurrencyCode]
  );

  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(initialCurrency);
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [monthStart, setMonthStart] = useState<MonthStartOption>('1st');
  const [starterMode, setStarterMode] = useState<StarterMode>('simple');

  const retryHydration = useCallback(() => {
    setStorageError(null);
    setHydrationAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadJSONSafe<PersistedOnboarding>(STORAGE_KEYS.onboarding).then((result) => {
      if (cancelled) return;
      if (result.status === 'error') {
        // Do NOT mark hydrated on read failure so auto-save never overwrites saved settings.
        setStorageError(
          'Could not read your saved setup. Retry to avoid resetting your preferences.'
        );
        return;
      }
      if (result.status === 'ok') {
        const saved = result.data;
        setHasCompletedOnboarding(!!saved.hasCompletedOnboarding);
        const currency = findCurrency(saved.currencyCode);
        if (currency) setSelectedCurrency(currency);
        setMonthlyBudget(saved.monthlyBudget ?? '');
        if (MONTH_START_OPTIONS.includes(saved.monthStart)) {
          setMonthStart(saved.monthStart);
        }
        if (saved.starterMode === 'blank' || saved.starterMode === 'simple') {
          setStarterMode(saved.starterMode);
        }
      }
      setStorageError(null);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrationAttempt]);

  useEffect(() => {
    if (!hydrated) return;
    const data: PersistedOnboarding = {
      hasCompletedOnboarding,
      currencyCode: selectedCurrency.code,
      monthlyBudget,
      monthStart,
      starterMode,
    };
    saveJSON(STORAGE_KEYS.onboarding, data);
  }, [hydrated, hasCompletedOnboarding, selectedCurrency, monthlyBudget, monthStart, starterMode]);

  const getMoneySettings = useCallback(
    (): MoneySettings => ({
      currencyCode: selectedCurrency.code,
      monthlyBudget,
      monthStart,
    }),
    [selectedCurrency, monthlyBudget, monthStart]
  );

  const applyMoneySettings = useCallback((settings: Partial<MoneySettings>) => {
    const currency = findCurrency(settings.currencyCode);
    if (currency) setSelectedCurrency(currency);
    if (typeof settings.monthlyBudget === 'string') {
      setMonthlyBudget(settings.monthlyBudget);
    }
    if (settings.monthStart && MONTH_START_OPTIONS.includes(settings.monthStart)) {
      setMonthStart(settings.monthStart);
    }
    setHasCompletedOnboarding(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    setHasCompletedOnboarding(false);
    setSelectedCurrency(initialCurrency);
    setMonthlyBudget('');
    setMonthStart('1st');
    setStarterMode('simple');
  }, [initialCurrency]);

  const completeOnboarding = useCallback(() => setHasCompletedOnboarding(true), []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      hydrated,
      storageError,
      retryHydration,
      hasCompletedOnboarding,
      completeOnboarding,
      regionCurrencyCode,
      selectedCurrency,
      setSelectedCurrency,
      monthlyBudget,
      setMonthlyBudget,
      monthStart,
      setMonthStart,
      starterMode,
      setStarterMode,
      getMoneySettings,
      applyMoneySettings,
      resetOnboarding,
    }),
    [
      hydrated,
      storageError,
      retryHydration,
      hasCompletedOnboarding,
      completeOnboarding,
      regionCurrencyCode,
      selectedCurrency,
      monthlyBudget,
      monthStart,
      starterMode,
      getMoneySettings,
      applyMoneySettings,
      resetOnboarding,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return ctx;
}
