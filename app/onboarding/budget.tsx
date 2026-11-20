import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import {
  MonthStartOption,
  StarterMode,
  useOnboarding,
} from '@/context/OnboardingContext';

const MONTH_START_OPTIONS: MonthStartOption[] = [
  '1st',
  '15th',
  'Last day',
  'Other',
];

const STARTER_OPTIONS: {
  id: StarterMode;
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'simple',
    title: 'Simple',
    subtitle: '6 everyday categories',
  },
  {
    id: 'blank',
    title: 'Blank',
    subtitle: 'Make your own',
  },
];

function formatNumberWithCommas(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

export default function OnboardingBudgetScreen() {
  const {
    selectedCurrency,
    monthlyBudget,
    setMonthlyBudget,
    monthStart,
    setMonthStart,
    starterMode,
    setStarterMode,
    completeOnboarding,
  } = useOnboarding();

  const handleBudgetChange = (text: string) => {
    setMonthlyBudget(formatNumberWithCommas(text));
  };

  const handleFinish = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const handleSkip = () => {
    setMonthlyBudget('');
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 px-6 pb-6 justify-between">
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <OnboardingHeader step={2} onBack={() => router.back()} />

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
                    value={monthlyBudget}
                    onChangeText={handleBudgetChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#B5B2A8"
                    className="flex-1 text-[30px] font-bold text-charcoal p-0"
                  />
                </View>

                <Pressable
                  onPress={() => router.back()}
                  accessibilityRole="button"
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
                const isSelected = monthStart === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setMonthStart(option)}
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

            {/* Start With */}
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

            {/* Nox Suggestion Callout */}
            <View className="mt-4 flex-row items-center bg-warm-stone rounded-2xl p-3.5 gap-3">
              <NoxMiniIcon size={28} />
              <Text className="flex-1 text-[13px] leading-[18px] text-warm-gray">
                Not sure yet? Skip it. After two weeks of tracking, Nox will
                suggest a budget from your real spending.
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View className="pt-4">
            <Pressable
              onPress={handleFinish}
              accessibilityRole="button"
              className="bg-charcoal rounded-full h-[54px] items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[16px] font-semibold">
                Finish setup
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSkip}
              accessibilityRole="button"
              className="mt-3 py-2 items-center active:opacity-60"
            >
              <Text className="text-charcoal text-[15px] font-semibold">
                Skip for now
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
