import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronDown, ChevronLeft } from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import {
  MonthStartOption,
  StarterMode,
  useOnboarding,
} from '@/context/OnboardingContext';
import { useTour } from '@/context/TourContext';

const MONTH_START_OPTIONS: MonthStartOption[] = ['1st', '15th', 'Last day'];

// Matches MAX_MONEY_AMOUNT (999,999,999.99).
const MAX_BUDGET_DIGITS = 9;

const STARTER_OPTIONS: {
  id: StarterMode;
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'simple',
    title: 'Simple',
    subtitle: '8 starter categories',
  },
  {
    id: 'blank',
    title: 'Blank',
    subtitle: 'Make your own',
  },
];

/**
 * Live-formats the budget as "1,500.50". The field always shows "," for thousands and
 * "." for decimals, so a "," or "." typed at the end (decimal-pad keyboards type "," in
 * many locales) starts the decimal part.
 */
function formatNumberWithCommas(raw: string): string {
  let text = raw.replace(/[^0-9.,]/g, '');
  if (/[.,]$/.test(text) && !text.slice(0, -1).includes('.')) {
    text = `${text.slice(0, -1)}.`;
  }
  const [intRaw, ...decParts] = text.replace(/,/g, '').split('.');
  const intDigits = intRaw.replace(/^0+/, '').slice(0, MAX_BUDGET_DIGITS);
  const intFormatted = intDigits ? Number(intDigits).toLocaleString('en-US') : '';
  if (decParts.length === 0) return intFormatted;
  const dec = decParts.join('').slice(0, 2);
  return `${intFormatted || '0'}.${dec}`;
}

export default function OnboardingBudgetScreen() {
  const {
    hasCompletedOnboarding,
    selectedCurrency,
    monthlyBudget,
    setMonthlyBudget,
    monthStart,
    setMonthStart,
    starterMode,
    setStarterMode,
    completeOnboarding,
  } = useOnboarding();
  const { requestTour } = useTour();

  const isEditing = hasCompletedOnboarding;
  const [draftBudget, setDraftBudget] = useState(monthlyBudget);
  const [draftMonthStart, setDraftMonthStart] = useState<MonthStartOption>(
    MONTH_START_OPTIONS.includes(monthStart) ? monthStart : '1st'
  );

  const activeBudget = isEditing ? draftBudget : monthlyBudget;
  const activeMonthStart = isEditing ? draftMonthStart : monthStart;

  const handleBudgetChange = (text: string) => {
    const formatted = formatNumberWithCommas(text);
    if (isEditing) {
      setDraftBudget(formatted);
    } else {
      setMonthlyBudget(formatted);
    }
  };

  const handleMonthStartChange = (option: MonthStartOption) => {
    if (isEditing) {
      setDraftMonthStart(option);
    } else {
      setMonthStart(option);
    }
  };

  const exitOnboardingToTabs = () => {
    completeOnboarding();
    // Point out the app's features once Home appears.
    requestTour();
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace('/(tabs)');
  };

  const handleFinish = () => {
    if (isEditing) {
      setMonthlyBudget(draftBudget);
      setMonthStart(draftMonthStart);
      router.back();
      return;
    }
    exitOnboardingToTabs();
  };

  const handleSkip = () => {
    setMonthlyBudget('');
    exitOnboardingToTabs();
  };

  const handleCurrencyPress = () => {
    if (isEditing) {
      router.push('/onboarding/currency');
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <View className="flex-1 px-6 pb-6 justify-between">
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isEditing ? (
              <View className="flex-row items-center gap-3 pt-2 pb-5">
                <Pressable
                  onPress={() => router.back()}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-70"
                >
                  <ChevronLeft size={20} color="#141413" strokeWidth={2} />
                </Pressable>
                <Text className="text-[18px] font-bold text-charcoal">
                  Budget &amp; cycle
                </Text>
              </View>
            ) : (
              <OnboardingHeader step={2} onBack={() => router.back()} />
            )}

            {/* Title & Subtitle */}
            <Text className="text-[30px] leading-[35px] font-bold tracking-tight text-charcoal">
              How much do you plan to spend a month?
            </Text>
            <Text className="mt-2 text-[15px] leading-[21px] text-warm-gray">
              A rough number is fine. You can change it any time.
            </Text>

            {/* Monthly Budget Input Card */}
            <View className="mt-5 bg-white border border-warm-border rounded-3xl p-4">
              <Text className="text-[13px] font-medium text-warm-gray mb-1.5">
                Monthly budget
              </Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <Text className="text-[28px] font-bold text-charcoal mr-2">
                    {selectedCurrency.symbol}
                  </Text>
                  <TextInput
                    accessibilityLabel={`Monthly budget in ${selectedCurrency.symbol}`}
                    value={activeBudget}
                    onChangeText={handleBudgetChange}
                    keyboardType="decimal-pad"
                    maxLength={15}
                    placeholder="0"
                    placeholderTextColor="#8A8880"
                    className="flex-1 text-[30px] font-bold text-charcoal p-0"
                  />
                </View>

                <Pressable
                  onPress={handleCurrencyPress}
                  accessibilityRole="button"
                  accessibilityLabel="Change currency"
                  className="flex-row items-center bg-[#F3F2EC] rounded-xl px-3 py-1.5 gap-1 active:opacity-75"
                >
                  <Text className="text-[13px] font-semibold text-charcoal">
                    {selectedCurrency.code}
                  </Text>
                  <ChevronDown size={14} color="#141413" strokeWidth={2} />
                </Pressable>
              </View>
            </View>

            {/* Month Starts On */}
            <Text className="mt-5 mb-2.5 text-[15px] font-semibold text-charcoal">
              My month starts on
            </Text>
            <View className="flex-row gap-2">
              {MONTH_START_OPTIONS.map((option) => {
                const isSelected = activeMonthStart === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => handleMonthStartChange(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    className={`rounded-xl px-4 py-2.5 border ${
                      isSelected
                        ? 'bg-charcoal border-charcoal'
                        : 'bg-white border-warm-border'
                    }`}
                  >
                    <Text
                      className={`text-[14px] font-semibold ${
                        isSelected ? 'text-white' : 'text-charcoal'
                      }`}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="mt-2 text-[13px] text-warm-gray">
              Pick your payday if your money resets then.
            </Text>

            {!isEditing ? (
              <>
                <Text className="mt-5 mb-2.5 text-[15px] font-semibold text-charcoal">
                  Start with
                </Text>
                <View className="flex-row gap-3">
                  {STARTER_OPTIONS.map((option) => {
                    const isSelected = starterMode === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => setStarterMode(option.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        className={`flex-1 bg-white rounded-2xl p-3.5 ${
                          isSelected
                            ? 'border-[1.75px] border-charcoal'
                            : 'border border-warm-border'
                        }`}
                      >
                        <Text className="text-[15px] font-semibold text-charcoal">
                          {option.title}
                        </Text>
                        <Text className="mt-0.5 text-[12.5px] text-warm-gray">
                          {option.subtitle}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View className="mt-4 flex-row items-center bg-warm-stone rounded-2xl p-3.5 gap-3">
                  <NoxMiniIcon size={28} />
                  <Text className="flex-1 text-[13px] leading-[18px] text-warm-gray">
                    Not sure yet? Skip it. After two weeks of tracking, Nox will
                    suggest a budget from your real spending.
                  </Text>
                </View>
              </>
            ) : null}
          </ScrollView>

          <View className="pt-4">
            <Pressable
              onPress={handleFinish}
              accessibilityRole="button"
              className="bg-charcoal rounded-full h-[54px] items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[16px] font-semibold">
                {isEditing ? 'Save changes' : 'Finish setup'}
              </Text>
            </Pressable>
            {!isEditing ? (
              <Pressable
                onPress={handleSkip}
                accessibilityRole="button"
                className="mt-3 py-2 items-center active:opacity-60"
              >
                <Text className="text-charcoal text-[15px] font-semibold">
                  Skip for now
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
