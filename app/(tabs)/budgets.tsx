import { NoxMiniIcon } from '@/components/NoxMascot';
import { TourTarget, useTourScreen } from '@/components/TourTarget';
import { CategoryBudget, useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { formatMoney } from '@/lib/format';
import { Href, router } from 'expo-router';
import { AlertTriangle, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatCompactMoney(amount: number, symbol: string): string {
  const hasDecimals = amount % 1 !== 0;
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function unused(cat: CategoryBudget) {
  return Math.max(0, Math.floor(cat.limit - cat.spent));
}

/** Category with the most unused budget, excluding `exclude`. */
function findDonor(categories: CategoryBudget[], exclude: string, maxUsedPct = 100) {
  return categories
    .filter(
      (c) =>
        c.name !== exclude &&
        c.limit > 0 &&
        unused(c) > 0 &&
        (c.spent / c.limit) * 100 < maxUsedPct
    )
    .sort((a, b) => unused(b) - unused(a))[0];
}

export default function BudgetsScreen() {
  const { selectedCurrency } = useOnboarding();
  const {
    period,
    totalBudget,
    totalSpent,
    daysLeft,
    expenseCategories: categories,
    moveBudget,
    raiseCategoryLimit,
    noxSuggestionsEnabled,
  } = useBudget();
  useTourScreen('budgets');
  const [lastMove, setLastMove] = useState<{
    from: string;
    to: string;
    amount: number;
  } | null>(null);

  const sym = selectedCurrency.symbol;
  const overallPercent =
    totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  const overBudgetCat = categories.find((c) => c.limit > 0 && c.spent > c.limit);
  const overAmount = overBudgetCat
    ? Math.ceil(overBudgetCat.spent - overBudgetCat.limit)
    : 0;
  const overDonor = overBudgetCat ? findDonor(categories, overBudgetCat.name) : undefined;
  const overMoveAmount = overDonor ? Math.min(overAmount, unused(overDonor)) : 0;

  // Rebalance suggestion: a category close to its limit, and one barely used.
  const needy = categories
    .filter((c) => c.limit > 0 && c.spent / c.limit >= 0.8)
    .sort((a, b) => b.spent / b.limit - a.spent / a.limit)[0];
  const rebalanceDonor = needy ? findDonor(categories, needy.name, 50) : undefined;
  const rebalanceAmount =
    needy && rebalanceDonor
      ? Math.floor(Math.min(unused(rebalanceDonor) * 0.5, needy.limit * 0.25) / 10) * 10
      : 0;
  const donorUsedPct =
    rebalanceDonor && rebalanceDonor.limit > 0
      ? Math.round((rebalanceDonor.spent / rebalanceDonor.limit) * 100)
      : 0;

  const handleMove = (from: string, to: string, amount: number) => {
    moveBudget(from, to, amount);
    setLastMove({ from, to, amount });
  };

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
              {period.label}
            </Text>
            <Text className="text-[28px] font-bold tracking-tight text-charcoal">
              Budgets
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/add-transaction')}
            className="flex-row items-center gap-1.5 bg-white border border-warm-border rounded-full px-4 py-2 active:opacity-75"
          >
            <Plus size={16} color="#141413" strokeWidth={2.2} />
            <Text className="text-[14px] font-semibold text-charcoal">New</Text>
          </Pressable>
        </View>

        {/* Over-budget Alert Banner OR Summary Card */}
        {overBudgetCat ? (
          <View className="bg-[#FCEEE4] border border-[#F2CBB0] rounded-3xl p-4">
            <View className="flex-row items-start gap-2.5">
              <AlertTriangle size={18} color="#C2410C" strokeWidth={2.2} />
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#9A3F0D]">
                  {overBudgetCat.name} is {formatMoney(overAmount, sym, 0)} over
                  budget
                </Text>
                <Text className="mt-1 text-[13.5px] leading-[19px] text-[#7D3A13]">
                  {overDonor
                    ? `Nox can cover ${overMoveAmount === overAmount ? 'it' : 'part of it'} from ${overDonor.name}, where ${formatMoney(unused(overDonor), sym, 0)} is still unused.`
                    : 'No other category has budget to spare. You can raise the limit instead.'}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2.5 mt-4">
              {overDonor ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    handleMove(overDonor.name, overBudgetCat.name, overMoveAmount)
                  }
                  className="bg-charcoal rounded-full px-4 py-2.5 active:opacity-85"
                >
                  <Text className="text-[13.5px] font-semibold text-white">
                    Move {formatMoney(overMoveAmount, sym, 0)} from {overDonor.name}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  raiseCategoryLimit(overBudgetCat.name, overBudgetCat.spent)
                }
                className="bg-white border border-[#E6C5AE] rounded-full px-4 py-2.5 active:opacity-75"
              >
                <Text className="text-[13.5px] font-semibold text-charcoal">
                  Raise limit
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="bg-white border border-warm-border rounded-3xl p-5">
            <View className="flex-row items-baseline justify-between">
              <Text className="text-[26px] font-bold tracking-tight text-charcoal">
                {formatMoney(totalSpent, sym)}
              </Text>
              <Text className="text-[14px] text-warm-gray">
                {totalBudget > 0
                  ? `of ${formatMoney(totalBudget, sym, 0)}`
                  : 'no monthly budget'}
              </Text>
            </View>

            {totalBudget > 0 ? (
              <View className="h-[7px] rounded-full bg-[#ECEAE2] mt-3.5 overflow-hidden">
                <View
                  style={{ width: `${overallPercent}%` }}
                  className="h-full rounded-full bg-charcoal"
                />
              </View>
            ) : null}

            <Text className="mt-2.5 text-[13px] text-warm-gray">
              {totalBudget > 0 ? `${overallPercent}% used · ` : ''}
              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
            </Text>
          </View>
        )}

        {/* Category Breakdown */}
        <TourTarget id="budgets-categories">
        {categories.length === 0 ? (
          <View className="mt-5 bg-white border border-warm-border rounded-3xl p-5 items-center">
            <Text className="text-[15.5px] font-semibold text-charcoal">
              No categories yet
            </Text>
            <Text className="mt-1 text-center text-[13px] text-warm-gray">
              Add categories to give each kind of spending its own limit.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/categories' as Href)}
              className="mt-4 bg-charcoal rounded-full px-4 py-2.5 active:opacity-85"
            >
              <Text className="text-[13.5px] font-semibold text-white">
                Add a category
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-5">
            {categories.map((cat, index) => {
              const hasLimit = cat.limit > 0;
              const pct = hasLimit ? Math.round((cat.spent / cat.limit) * 100) : 0;
              const isOver = hasLimit && cat.spent > cat.limit;
              const isWarning = hasLimit && pct >= 80;
              const catOverAmt = Math.ceil(cat.spent - cat.limit);

              return (
                <Pressable
                  accessibilityRole="button"
                  key={cat.id}
                  onPress={() => router.push('/categories' as Href)}
                  className={`py-3.5 active:opacity-70 ${
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
                      <Text
                        style={isOver ? { color: '#C2410C' } : undefined}
                        className={`font-bold ${
                          isOver ? '' : 'text-charcoal'
                        }`}
                      >
                        {formatCompactMoney(cat.spent, sym)}
                      </Text>
                      <Text className="text-warm-gray">
                        {hasLimit
                          ? ` / ${formatCompactMoney(cat.limit, sym)}`
                          : ' · no limit'}
                      </Text>
                    </Text>
                  </View>

                  {hasLimit ? (
                    <View className="h-[5px] rounded-full bg-[#ECEAE2] overflow-hidden">
                      <View
                        style={{ width: `${Math.min(100, pct)}%` }}
                        className={`h-full rounded-full ${
                          isWarning ? 'bg-[#C9601F]' : 'bg-charcoal'
                        }`}
                      />
                    </View>
                  ) : null}

                  {isOver ? (
                    <Text style={{ color: '#C2410C' }} className="mt-1.5 text-[12px] font-medium">
                      {pct}% · {formatMoney(catOverAmt, sym, 0)} over
                    </Text>
                  ) : isWarning ? (
                    <Text style={{ color: '#C2410C' }} className="mt-1.5 text-[12px] font-medium">
                      {pct}% used
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
        </TourTarget>

        {/* Nox Rebalance Suggestion */}
        {noxSuggestionsEnabled && !overBudgetCat && (lastMove || rebalanceAmount > 0) ? (
          <View className="mt-4 bg-white border border-warm-border rounded-3xl p-4 flex-row items-center gap-3">
            <NoxMiniIcon size={34} />
            <Text className="flex-1 text-[13.5px] leading-[18px] text-charcoal">
              {lastMove
                ? `Moved ${formatMoney(lastMove.amount, sym, 0)} from ${lastMove.from} to ${lastMove.to}. Your budgets are updated.`
                : `Move ${formatMoney(rebalanceAmount, sym, 0)} from ${rebalanceDonor?.name} to ${needy?.name}? You've only used ${donorUsedPct}% of ${rebalanceDonor?.name}.`}
            </Text>
            {!lastMove && needy && rebalanceDonor ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  handleMove(rebalanceDonor.name, needy.name, rebalanceAmount)
                }
                className="bg-nox-lime rounded-2xl px-4 py-2.5 active:opacity-80"
              >
                <Text className="text-[14px] font-bold text-charcoal">Move</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
