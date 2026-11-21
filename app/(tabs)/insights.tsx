import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { NoxHomeAvatar } from '@/components/NoxMascot';
import { Transaction, useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import {
  addDays,
  clampDay,
  isWithin,
  monthName,
  monthShort,
  parseISODate,
  weekdayShort,
} from '@/lib/dates';
import { formatCompactNumber, formatMoney } from '@/lib/format';
import { useTourScreen } from '@/components/TourTarget';

type PeriodTab = 'Week' | 'Month' | 'Year';

interface PeriodData {
  subtitle: string;
  total: number;
  previous: number;
  compareLabel: string;
  range: { start: Date; end: Date };
  bars: { label: string; value: number; active?: boolean }[];
}

const MIN_TRACKED_DAYS = 3;

const BREAKDOWN_COLORS = ['#141413', '#52524C', '#8A8880', '#B5B3AA', '#DEDCD4'];

const PLACEHOLDER_BARS = [
  { height: 56, filled: false },
  { height: 88, filled: false },
  { height: 38, filled: true },
  { height: 70, filled: false },
  { height: 96, filled: false },
  { height: 64, filled: false },
  { height: 48, filled: false },
];

function sumExpenses(expenses: Transaction[], start: Date, end: Date) {
  return expenses
    .filter((t) => isWithin(t.date, start, end))
    .reduce((sum, t) => sum + t.amount, 0);
}

function buildPeriodData(expenses: Transaction[], today: Date): Record<PeriodTab, PeriodData> {
  const y = today.getFullYear();
  const m = today.getMonth();

  // Last 7 days, ending today
  const weekStart = addDays(today, -6);
  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    return {
      label: weekdayShort(day),
      value: sumExpenses(expenses, day, day),
      active: i === 6,
    };
  });

  // Last 6 calendar months
  const monthBars = Array.from({ length: 6 }, (_, i) => {
    const offset = 5 - i;
    const start = new Date(y, m - offset, 1);
    const end = new Date(y, m - offset + 1, 0);
    return {
      label: monthShort(start),
      value: sumExpenses(expenses, start, end),
      active: offset === 0,
    };
  });
  const monthStart = new Date(y, m, 1);
  const prevMonthStart = new Date(y, m - 1, 1);
  const prevMonthSameDay = clampDay(y, m - 1, today.getDate());

  // Quarters of this year
  const currentQuarter = Math.floor(m / 3);
  const yearBars = Array.from({ length: 4 }, (_, q) => ({
    label: `Q${q + 1}`,
    value: sumExpenses(expenses, new Date(y, q * 3, 1), new Date(y, q * 3 + 3, 0)),
    active: q === currentQuarter,
  }));
  const yearStart = new Date(y, 0, 1);

  return {
    Week: {
      subtitle: 'Spent in the last 7 days',
      total: weekBars.reduce((sum, b) => sum + b.value, 0),
      previous: sumExpenses(expenses, addDays(today, -13), addDays(today, -7)),
      compareLabel: 'than the 7 days before',
      range: { start: weekStart, end: today },
      bars: weekBars,
    },
    Month: {
      subtitle: `Spent in ${monthName(today)} so far`,
      total: sumExpenses(expenses, monthStart, today),
      previous: sumExpenses(expenses, prevMonthStart, prevMonthSameDay),
      compareLabel: `than ${monthName(prevMonthStart)} at this point`,
      range: { start: monthStart, end: today },
      bars: monthBars,
    },
    Year: {
      subtitle: `Spent in ${y} so far`,
      total: sumExpenses(expenses, yearStart, today),
      previous: sumExpenses(
        expenses,
        new Date(y - 1, 0, 1),
        clampDay(y - 1, m, today.getDate())
      ),
      compareLabel: `than ${y - 1} at this point`,
      range: { start: yearStart, end: today },
      bars: yearBars,
    },
  };
}

function buildBreakdown(expenses: Transaction[], start: Date, end: Date) {
  const totals = new Map<string, number>();
  for (const t of expenses) {
    if (!isWithin(t.date, start, end)) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return [];
  const top = sorted.slice(0, 4);
  const rest = sorted.slice(4).reduce((sum, [, v]) => sum + v, 0);
  if (rest > 0) top.push(['Other', rest]);
  return top.map(([name, value], idx) => ({
    name,
    pct: Math.round((value / total) * 100),
    color: BREAKDOWN_COLORS[idx],
  }));
}

function buildRecap(expenses: Transaction[], today: Date, sym: string): string | null {
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthExpenses = expenses.filter((t) => isWithin(t.date, monthStart, today));
  if (monthExpenses.length === 0) return null;

  let weekendTotal = 0;
  let weekdayTotal = 0;
  let weekendDays = 0;
  let weekdayDays = 0;
  for (let d = monthStart; d <= today; d = addDays(d, 1)) {
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    if (isWeekend) weekendDays++;
    else weekdayDays++;
  }
  const weekendByCat = new Map<string, number>();
  for (const t of monthExpenses) {
    const day = parseISODate(t.date).getDay();
    if (day === 0 || day === 6) {
      weekendTotal += t.amount;
      weekendByCat.set(t.category, (weekendByCat.get(t.category) ?? 0) + t.amount);
    } else {
      weekdayTotal += t.amount;
    }
  }
  const weekendAvg = weekendDays > 0 ? weekendTotal / weekendDays : 0;
  const weekdayAvg = weekdayDays > 0 ? weekdayTotal / weekdayDays : 0;

  if (weekdayAvg > 0 && weekendAvg > weekdayAvg * 1.5) {
    const topWeekend = [...weekendByCat.entries()].sort((a, b) => b[1] - a[1])[0];
    const ratio = (weekendAvg / weekdayAvg).toFixed(1);
    return `Your weekend days cost about ${ratio}× your weekdays, mostly ${topWeekend[0]}. One lighter weekend day saves about ${formatMoney(weekendAvg - weekdayAvg, sym, 0)}.`;
  }

  const totals = new Map<string, number>();
  for (const t of monthExpenses) totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  const [topName, topValue] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  const total = weekendTotal + weekdayTotal;
  return `${topName} is your biggest category this month at ${Math.round((topValue / total) * 100)}% of spending, about ${formatMoney(total / Math.max(1, weekendDays + weekdayDays), sym, 0)} a day overall.`;
}

export default function InsightsScreen() {
  const { selectedCurrency } = useOnboarding();
  const { transactions, today } = useBudget();
  const [period, setPeriod] = useState<PeriodTab>('Month');
  useTourScreen('insights');

  const sym = selectedCurrency.symbol;
  const expenses = useMemo(
    () => transactions.filter((t) => t.type === 'expense'),
    [transactions]
  );
  const trackedDays = useMemo(
    () => new Set(transactions.map((t) => t.date)).size,
    [transactions]
  );
  const periodData = useMemo(() => buildPeriodData(expenses, today), [expenses, today]);
  const activePeriod = periodData[period];
  const breakdown = useMemo(
    () => buildBreakdown(expenses, activePeriod.range.start, activePeriod.range.end),
    [expenses, activePeriod]
  );
  const recap = useMemo(() => buildRecap(expenses, today, sym), [expenses, today, sym]);

  const isInsufficientData = trackedDays < MIN_TRACKED_DAYS;
  const daysRemaining = MIN_TRACKED_DAYS - trackedDays;
  const maxBar = Math.max(1, ...activePeriod.bars.map((b) => b.value));
  const delta = activePeriod.total - activePeriod.previous;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-cream">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between pt-3 pb-4">
          <Text className="text-[28px] font-bold tracking-tight text-charcoal">
            Insights
          </Text>

          {!isInsufficientData ? (
            <View className="flex-row bg-[#EAE8E1] p-1 rounded-full">
              {(['Week', 'Month', 'Year'] as PeriodTab[]).map((tab) => {
                const active = period === tab;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={tab}
                    onPress={() => setPeriod(tab)}
                    className={`px-3.5 py-1.5 rounded-full ${
                      active ? 'bg-white' : 'bg-transparent'
                    }`}
                  >
                    <Text
                      className={`text-[13px] font-semibold ${
                        active ? 'text-charcoal' : 'text-warm-gray'
                      }`}
                    >
                      {tab}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {isInsufficientData ? (
          <>
            <View className="bg-white border border-warm-border rounded-3xl p-5">
              {/* Dashed Placeholder Bars */}
              <View className="flex-row items-end justify-between h-[110px] gap-2 px-1">
                {PLACEHOLDER_BARS.map((bar, idx) => (
                  <View
                    key={idx}
                    style={{ height: bar.height }}
                    className={`flex-1 rounded-xl ${
                      bar.filled
                        ? 'bg-nox-lime border-[1.5px] border-charcoal'
                        : 'border border-dashed border-[#D5D3CA]'
                    }`}
                  />
                ))}
              </View>

              <Text className="mt-6 text-center text-[18px] font-bold text-charcoal">
                Not enough data yet
              </Text>
              <Text className="mt-1.5 text-center text-[13.5px] text-warm-gray">
                Track on a few different days and your trends show up here.
              </Text>

              <View className="flex-row items-center justify-between mt-6 mb-2">
                <Text className="text-[13px] font-semibold text-charcoal">
                  Days tracked
                </Text>
                <Text className="text-[13px] text-warm-gray">
                  {trackedDays} of {MIN_TRACKED_DAYS}
                </Text>
              </View>

              <View className="flex-row gap-1.5">
                {Array.from({ length: MIN_TRACKED_DAYS }, (_, dayIdx) => (
                  <View
                    key={dayIdx}
                    className={`flex-1 h-1.5 rounded-full ${
                      dayIdx < trackedDays ? 'bg-charcoal' : 'bg-[#E5E3DC]'
                    }`}
                  />
                ))}
              </View>
            </View>

            <View className="mt-4 bg-white border border-warm-border rounded-3xl p-4 flex-row items-center gap-3.5">
              <NoxHomeAvatar size={38} />
              <Text className="flex-1 text-[14px] leading-[20px] text-charcoal">
                I&apos;ll write your first recap after{' '}
                <Text className="font-bold">
                  {daysRemaining} more {daysRemaining === 1 ? 'day' : 'days'}
                </Text>{' '}
                of tracking.
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Spending Trend Card */}
            <Animated.View
              entering={FadeInDown.duration(260)}
              className="bg-white border border-warm-border rounded-3xl p-5"
            >
              <Text className="text-[13.5px] text-warm-gray">
                {activePeriod.subtitle}
              </Text>
              <Text className="mt-1 text-[28px] font-bold tracking-tight text-charcoal">
                {formatMoney(activePeriod.total, sym)}
              </Text>
              {activePeriod.previous > 0 ? (
                <View className="flex-row items-center gap-1 mt-1">
                  {delta <= 0 ? (
                    <ArrowDown size={13} color="#66655E" strokeWidth={2.2} />
                  ) : (
                    <ArrowUp size={13} color="#66655E" strokeWidth={2.2} />
                  )}
                  <Text className="text-[13px] text-warm-gray">
                    {formatMoney(Math.abs(delta), sym, 0)}{' '}
                    {delta <= 0 ? 'less' : 'more'} {activePeriod.compareLabel}
                  </Text>
                </View>
              ) : null}

              {/* Bar Chart */}
              <View className="flex-row items-end justify-between mt-7 h-[150px] gap-2">
                {activePeriod.bars.map((bar) => {
                  const heightPct = Math.round((bar.value / maxBar) * 100);
                  return (
                    <View key={bar.label} className="flex-1 items-center">
                      <Text className="text-[11px] font-medium text-warm-gray mb-1.5">
                        {bar.value > 0 ? formatCompactNumber(bar.value) : ''}
                      </Text>
                      <View className="w-full h-[106px] justify-end">
                        <View
                          style={{ height: `${Math.max(heightPct, 2)}%` }}
                          className={`w-full rounded-xl ${
                            bar.active
                              ? 'bg-nox-lime border-[1.5px] border-charcoal'
                              : 'bg-[#E5E3DC]'
                          }`}
                        />
                      </View>
                      <Text
                        className={`mt-2 text-[12px] ${
                          bar.active
                            ? 'font-bold text-charcoal'
                            : 'font-medium text-warm-gray'
                        }`}
                      >
                        {bar.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>

            {/* Where It Went */}
            <Text className="mt-6 mb-3 text-[18px] font-bold text-charcoal">
              Where it went
            </Text>

            {breakdown.length === 0 ? (
              <Text className="text-[14px] text-warm-gray">
                No spending recorded in this period.
              </Text>
            ) : (
              <>
                <View className="h-2.5 rounded-full flex-row overflow-hidden gap-0.5">
                  {breakdown.map((item) => (
                    <View
                      key={item.name}
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                      className="h-full"
                    />
                  ))}
                </View>

                <View className="flex-row flex-wrap mt-3.5 gap-y-2.5">
                  {breakdown.map((item) => (
                    <View
                      key={item.name}
                      className="w-1/2 flex-row items-center justify-between pr-4"
                    >
                      <View className="flex-row items-center gap-2 flex-1 pr-1">
                        <View
                          style={{ backgroundColor: item.color }}
                          className="w-2.5 h-2.5 rounded-sm"
                        />
                        <Text numberOfLines={1} className="text-[14px] text-charcoal">
                          {item.name}
                        </Text>
                      </View>
                      <Text className="text-[14px] font-bold text-charcoal">
                        {item.pct}%
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Nox Monthly Recap Dark Card */}
            {recap ? (
              <View className="mt-6 bg-charcoal rounded-3xl p-4 flex-row gap-3.5">
                <View className="pt-0.5">
                  <NoxHomeAvatar size={38} />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold text-nox-lime">
                    Nox&apos;s monthly recap
                  </Text>
                  <Text className="mt-1 text-[14px] leading-[20px] text-white/90">
                    {recap}
                  </Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
