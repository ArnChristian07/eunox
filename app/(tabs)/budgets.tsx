import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';

function formatCompactMoney(amount: number, symbol: string): string {
  const hasDecimals = amount % 1 !== 0;
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function BudgetsScreen() {
  const { selectedCurrency } = useOnboarding();
  const {
    totalBudget,
    totalSpent,
    daysLeft,
    categories,
    moveBudget,
    movedSuggestion,
  } = useBudget();

  const sym = selectedCurrency.symbol;
  const overallPercent = Math.min(100, Math.round((totalSpent / totalBudget) * 100));

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-cream">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between pt-2 pb-4">
          <View>
            <Text className="text-[13px] font-medium text-warm-gray">
              November
            </Text>
            <Text className="text-[28px] font-bold tracking-tight text-charcoal">
              Budgets
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/add-transaction')}
            className="flex-row items-center gap-1.5 bg-white border border-warm-border rounded-full px-4 py-2 active:opacity-75"
          >
            <Plus size={16} color="#141413" strokeWidth={2.2} />
            <Text className="text-[14px] font-semibold text-charcoal">New</Text>
          </Pressable>
        </View>

        {/* Summary Card */}
        <View className="bg-white border border-warm-border rounded-3xl p-5">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-[26px] font-bold tracking-tight text-charcoal">
              {sym}
              {totalSpent.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text className="text-[14px] text-warm-gray">
              of {sym}
              {totalBudget.toLocaleString('en-US')}
            </Text>
          </View>

          <View className="h-[7px] rounded-full bg-[#ECEAE2] mt-3.5 overflow-hidden">
            <View
              style={{ width: `${overallPercent}%` }}
              className="h-full rounded-full bg-charcoal"
            />
          </View>

          <Text className="mt-2.5 text-[13px] text-warm-gray">
            {overallPercent}% used · {daysLeft} days left
          </Text>
        </View>

        {/* Category Breakdown */}
        <View className="mt-5">
          {categories.map((cat, index) => {
            const pct = cat.limit > 0 ? Math.round((cat.spent / cat.limit) * 100) : 0;
            const isWarning = pct >= 80;

            return (
              <View
                key={cat.id}
                className={`py-3.5 ${
                  index < categories.length - 1
                    ? 'border-b border-warm-border'
                    : ''
                }`}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[15.5px] font-semibold text-charcoal">
                    {cat.name}
                  </Text>
                  <Text className="text-[14.5px]">
                    <Text className="font-bold text-charcoal">
                      {formatCompactMoney(cat.spent, sym)}
                    </Text>
                    <Text className="text-warm-gray">
                      {' '}
                      / {formatCompactMoney(cat.limit, sym)}
                    </Text>
                  </Text>
                </View>

                <View className="h-[5px] rounded-full bg-[#ECEAE2] overflow-hidden">
                  <View
                    style={{ width: `${Math.min(100, pct)}%` }}
                    className={`h-full rounded-full ${
                      isWarning ? 'bg-[#D96B27]' : 'bg-charcoal'
                    }`}
                  />
                </View>

                {isWarning ? (
                  <Text className="mt-1.5 text-[12px] font-medium text-[#B85318]">
                    {pct}% used
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Nox Rebalance Suggestion */}
        <View className="mt-4 bg-white border border-warm-border rounded-3xl p-4 flex-row items-center gap-3">
          <NoxMiniIcon size={34} />
          <Text className="flex-1 text-[13.5px] leading-[18px] text-charcoal">
            {movedSuggestion
              ? `Moved ${sym}800 from Fun to Food. Your budgets are updated.`
              : `Move ${sym}800 from Fun to Food? You've only used 17% of Fun.`}
          </Text>
          {!movedSuggestion ? (
            <Pressable
              onPress={() => moveBudget('Fun', 'Food', 800)}
              className="bg-nox-lime rounded-2xl px-4 py-2.5 active:opacity-80"
            >
              <Text className="text-[14px] font-bold text-charcoal">Move</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
