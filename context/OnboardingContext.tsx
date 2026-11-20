import React, { createContext, useContext, useMemo, useState } from 'react';
import { getLocales } from 'expo-localization';
import { CURRENCIES, Currency } from '@/constants/currencies';

export type MonthStartOption = '1st' | '15th' | 'Last day' | 'Other';
export type StarterMode = 'simple' | 'blank';

interface OnboardingContextValue {
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
}

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

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const regionCurrencyCode = useMemo(() => detectRegionCurrencyCode(), []);
  const initialCurrency = useMemo(
    () => CURRENCIES.find((c) => c.code === regionCurrencyCode) ?? CURRENCIES[0],
    [regionCurrencyCode]
  );

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(initialCurrency);
  const [monthlyBudget, setMonthlyBudget] = useState('22,000');
  const [monthStart, setMonthStart] = useState<MonthStartOption>('1st');
  const [starterMode, setStarterMode] = useState<StarterMode>('simple');

  const value = useMemo<OnboardingContextValue>(
    () => ({
      hasCompletedOnboarding,
      completeOnboarding: () => setHasCompletedOnboarding(true),
      regionCurrencyCode,
      selectedCurrency,
      setSelectedCurrency,
      monthlyBudget,
      setMonthlyBudget,
      monthStart,
      setMonthStart,
      starterMode,
      setStarterMode,
    }),
    [
      hasCompletedOnboarding,
      regionCurrencyCode,
      selectedCurrency,
      monthlyBudget,
      monthStart,
      starterMode,
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
