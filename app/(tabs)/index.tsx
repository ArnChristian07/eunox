import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Redirect, router } from 'expo-router';
import {
  ArrowDownLeft,
  Bus,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
} from 'lucide-react-native';
import { NoxMiniIcon, NoxSurprisedMascot } from '@/components/NoxMascot';
import { useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { formatRelativeDay, getGreeting } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { getHomeInsight } from '@/lib/nox';

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
    case 'transport':
      return Bus;
    default:
      return ShoppingCart;
  }
}

export default function HomeScreen() {
  const { hasCompletedOnboarding, selectedCurrency } = useOnboarding();
  const budget = useBudget();
  const {
    today,
    period,
    totalBudget,
    totalSpent,
    leftToSpend,
    daysLeft,
    safeToSpendToday,
    transactions,
    hideAmountsOnHome,
    noxSuggestionsEnabled,
  } = budget;

  const [revealBalance, setRevealBalance] = useState(false);

  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  const sym = selectedCurrency.symbol;
  const isEmpty = transactions.length === 0;
  const hasBudget = totalBudget > 0;
  const heroParts = splitAmountParts(hasBudget ? leftToSpend : totalSpent);
  const spentPercent = hasBudget
    ? Math.min(100, Math.round((totalSpent / totalBudget) * 100))
    : 0;
  const amountsHidden = hideAmountsOnHome && !revealBalance;
  const insight =
    noxSuggestionsEnabled && !isEmpty
      ? getHomeInsight({ sym, ...budget })
      : null;

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
              {isEmpty ? 'Welcome to Eunox' : getGreeting()}
            </Text>
            <Text className="mt-0.5 text-[24px] font-bold tracking-tight text-charcoal">
              {period.label}
            </Text>
          </View>

          <View className="flex-row items-center gap-2.5">
            {!isEmpty ? (
              <Pressable
                onPress={() => router.push('/transactions')}
                accessibilityLabel="Search transactions"
                className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
              >
                <Search size={19} color="#141413" strokeWidth={2} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityLabel="Settings"
              className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
            >
              <SlidersHorizontal size={19} color="#141413" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Hero Dark Card */}
        <Animated.View
          entering={FadeInDown.duration(280)}
          className="bg-charcoal rounded-3xl p-5"
        >
          <Text className="text-[13px] font-medium text-[#A8A69E]">
            {hasBudget ? 'Left to spend this month' : 'Spent this month'}
          </Text>

          <Pressable
            onPress={() => {
              if (hideAmountsOnHome) setRevealBalance((prev) => !prev);
            }}
            className="flex-row items-baseline mt-1.5"
          >
            <Text className="text-[40px] leading-[46px] font-bold tracking-tight text-white">
              {amountsHidden ? `${sym}••••` : `${sym}${heroParts.whole}`}
            </Text>
            {!amountsHidden ? (
              <Text className="text-[34px] leading-[42px] font-bold text-[#8A8880]">
                .{heroParts.dec}
              </Text>
            ) : null}
          </Pressable>

          {hasBudget ? (
            <View className="h-[7px] rounded-full bg-[#30302D] mt-4 overflow-hidden">
              <View
                style={{ width: `${spentPercent}%` }}
                className="h-full rounded-full bg-nox-lime"
              />
            </View>
          ) : null}

          <View className="flex-row items-center justify-between mt-3">
            <Text className="text-[12.5px] text-[#A8A69E]">
              {!hasBudget
                ? 'No monthly budget set'
                : totalSpent === 0
                ? 'Nothing spent yet'
                : `${formatMoney(totalSpent, sym)} spent of ${formatMoney(totalBudget, sym, 0)}`}
            </Text>
            <Text className="text-[12.5px] text-[#A8A69E]">
              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
            </Text>
          </View>

          {hasBudget ? (
            <>
              <View className="h-[1px] bg-[#2C2C2A] my-4" />
              <View className="flex-row items-center justify-between">
                <Text className="text-[14px] font-medium text-white/90">
                  Safe to spend today
                </Text>
                <Text className="text-[17px] font-bold text-nox-lime">
                  {formatMoney(safeToSpendToday, sym, 0)}
                </Text>
              </View>
            </>
          ) : (
            <Pressable
              onPress={() => router.push('/onboarding/budget')}
              className="mt-4 self-start bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 active:opacity-75"
            >
              <Text className="text-[12.5px] font-semibold text-white">
                Set a monthly budget
              </Text>
            </Pressable>
          )}
        </Animated.View>

        {isEmpty ? (
          <View className="items-center justify-center mt-16 px-4">
            <NoxSurprisedMascot size={78} />
            <Text className="mt-4 text-[18px] font-bold text-charcoal">
              No transactions yet
            </Text>
            <Text className="mt-2 text-center text-[14px] leading-[20px] text-warm-gray max-w-[260px]">
              Add your first expense, or just type something like
              &ldquo;coffee 120&rdquo; and Nox fills in the rest.
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
            {insight ? (
              <View className="mt-4 bg-white border border-warm-border rounded-3xl p-4 flex-row gap-3.5">
                <View className="pt-0.5">
                  <NoxMiniIcon size={38} />
                </View>
                <View className="flex-1">
                  <Text className="text-[12.5px] font-medium text-warm-gray">
                    Nox noticed
                  </Text>
                  <Text className="mt-1 text-[14.5px] leading-[20px] text-charcoal">
                    {insight}
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
                            {tx.category} · {formatRelativeDay(tx.date, today)}
                          </Text>
                        </View>
                      </View>

                      <Text className="text-[15px] font-semibold text-charcoal">
                        {isIncome ? '+' : '-'}
                        {formatMoney(tx.amount, sym)}
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
