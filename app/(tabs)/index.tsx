import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Redirect, router } from 'expo-router';
import {
  ArrowDownLeft,
  Bus,
  ChevronDown,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
} from 'lucide-react-native';
import { NoxMiniIcon, NoxSurprisedMascot } from '@/components/NoxMascot';
import { useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';

function splitAmountParts(amount: number) {
  const fixed = amount.toFixed(2);
  const [whole, dec] = fixed.split('.');
  return {
    whole: Number(whole).toLocaleString('en-US'),
    dec,
  };
}

function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case 'food':
      return ShoppingCart;
    case 'transport':
      return Bus;
    default:
      return ShoppingCart;
  }
}

const MONTHS = ['November', 'October', 'September'];

export default function HomeScreen() {
  const { hasCompletedOnboarding, selectedCurrency } = useOnboarding();
  const {
    totalBudget,
    totalSpent,
    leftToSpend,
    daysLeft,
    safeToSpendToday,
    transactions,
    hideAmountsOnHome,
    noxSuggestionsEnabled,
  } = useBudget();

  const [monthIdx, setMonthIdx] = useState(0);
  const [revealBalance, setRevealBalance] = useState(false);

  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  const sym = selectedCurrency.symbol;
  const isEmpty = transactions.length === 0;
  const effectiveSpent = isEmpty ? 0 : totalSpent;
  const effectiveLeft = isEmpty ? totalBudget : leftToSpend;
  const leftParts = splitAmountParts(effectiveLeft);
  const spentPercent = isEmpty
    ? 0
    : Math.min(100, Math.round((effectiveSpent / totalBudget) * 100));

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
              {isEmpty ? 'Welcome to Eunox' : 'Good evening'}
            </Text>
            <Pressable
              onPress={() => setMonthIdx((prev) => (prev + 1) % MONTHS.length)}
              className="flex-row items-center gap-1 mt-0.5 active:opacity-70"
            >
              <Text className="text-[24px] font-bold tracking-tight text-charcoal">
                {MONTHS[monthIdx]}
              </Text>
              {!isEmpty ? (
                <ChevronDown size={18} color="#141413" strokeWidth={2.2} />
              ) : null}
            </Pressable>
          </View>

          {!isEmpty ? (
            <View className="flex-row items-center gap-2.5">
              <Pressable
                onPress={() => router.push('/transactions')}
                accessibilityLabel="Search transactions"
                className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
              >
                <Search size={19} color="#141413" strokeWidth={2} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/settings')}
                accessibilityLabel="Settings"
                className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
              >
                <SlidersHorizontal size={19} color="#141413" strokeWidth={2} />
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Hero Dark Card */}
        <Animated.View
          entering={FadeInDown.duration(280)}
          className="bg-charcoal rounded-3xl p-5"
        >
          <Text className="text-[13px] font-medium text-[#A8A69E]">
            Left to spend this month
          </Text>

          <Pressable
            onPress={() => {
              if (hideAmountsOnHome) setRevealBalance((prev) => !prev);
            }}
            className="flex-row items-baseline mt-1.5"
          >
            <Text className="text-[40px] leading-[46px] font-bold tracking-tight text-white">
              {hideAmountsOnHome && !revealBalance
                ? `${sym}••••`
                : `${sym}${leftParts.whole}`}
            </Text>
            {!(hideAmountsOnHome && !revealBalance) ? (
              <Text className="text-[34px] leading-[42px] font-bold text-[#8A8880]">
                .{leftParts.dec}
              </Text>
            ) : null}
          </Pressable>

          {/* Progress Bar */}
          <View className="h-[7px] rounded-full bg-[#30302D] mt-4 overflow-hidden">
            <View
              style={{ width: `${spentPercent}%` }}
              className="h-full rounded-full bg-nox-lime"
            />
          </View>

          <View className="flex-row items-center justify-between mt-3">
            <Text className="text-[12.5px] text-[#A8A69E]">
              {isEmpty
                ? 'Nothing spent yet'
                : `${sym}${effectiveSpent.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} spent of ${sym}${totalBudget.toLocaleString('en-US')}`}
            </Text>
            <Text className="text-[12.5px] text-[#A8A69E]">
              {daysLeft} days left
            </Text>
          </View>

          {!isEmpty ? (
            <>
              <View className="h-[1px] bg-[#2C2C2A] my-4" />

              <View className="flex-row items-center justify-between">
                <Text className="text-[14px] font-medium text-white/90">
                  Safe to spend today
                </Text>
                <Text className="text-[17px] font-bold text-nox-lime">
                  {sym}
                  {safeToSpendToday.toLocaleString('en-US')}
                </Text>
              </View>
            </>
          ) : null}
        </Animated.View>

        {isEmpty ? (
          <View className="items-center justify-center mt-16 px-4">
            <NoxSurprisedMascot size={78} />
            <Text className="mt-4 text-[18px] font-bold text-charcoal">
              No transactions yet
            </Text>
            <Text className="mt-2 text-center text-[14px] leading-[20px] text-warm-gray max-w-[260px]">
              Add your first expense, or just tell Nox something like
              &ldquo;coffee 120&rdquo;.
            </Text>
            <Pressable
              onPress={() => router.push('/add-transaction')}
              className="mt-6 bg-charcoal rounded-full px-6 py-3.5 flex-row items-center gap-2 active:opacity-85"
            >
              <Plus size={18} color="#FFFFFF" strokeWidth={2.2} />
              <Text className="text-white text-[15px] font-semibold">
                Add first expense
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Nox Noticed Card */}
        {noxSuggestionsEnabled ? (
          <View className="mt-4 bg-white border border-warm-border rounded-3xl p-4 flex-row gap-3.5">
            <View className="pt-0.5">
              <NoxMiniIcon size={38} />
            </View>
            <View className="flex-1">
              <Text className="text-[12.5px] font-medium text-warm-gray">
                Nox noticed
              </Text>
              <Text className="mt-1 text-[14.5px] leading-[20px] text-charcoal">
                Food is at 82% with 11 days to go. Cooking at home twice this
                week keeps you on budget.
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/nox')}
                className="mt-2.5 self-start active:opacity-70"
              >
                <Text className="text-[14px] font-bold text-charcoal underline">
                  Ask Nox
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Recent Transactions */}
        <View className="mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[18px] font-bold text-charcoal">Recent</Text>
            <Pressable
              onPress={() => router.push('/transactions')}
              className="active:opacity-70"
            >
              <Text className="text-[13.5px] font-medium text-warm-gray">
                See all
              </Text>
            </Pressable>
          </View>

          <View className="gap-3.5">
            {transactions.slice(0, 6).map((tx) => {
              const isIncome = tx.type === 'income';
              const Icon = isIncome
                ? ArrowDownLeft
                : getCategoryIcon(tx.category);

              return (
                <Pressable
                  key={tx.id}
                  onPress={() =>
                    router.push({
                      pathname: '/edit-transaction',
                      params: { id: tx.id },
                    })
                  }
                  className="flex-row items-center justify-between active:opacity-70"
                >
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View
                      className={`w-11 h-11 rounded-2xl items-center justify-center ${
                        isIncome
                          ? 'bg-nox-lime'
                          : 'bg-white border border-warm-border'
                      }`}
                    >
                      <Icon size={19} color="#141413" strokeWidth={1.9} />
                    </View>

                    <View className="flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-[15px] font-semibold text-charcoal"
                      >
                        {tx.title}
                      </Text>
                      <Text className="text-[12.5px] text-warm-gray mt-0.5">
                        {tx.category} · {tx.dateLabel}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-[15px] font-semibold text-charcoal">
                    {isIncome ? '+' : '-'}
                    {sym}
                    {tx.amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
