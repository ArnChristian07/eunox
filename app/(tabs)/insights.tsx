import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowDown } from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';

type PeriodTab = 'Week' | 'Month' | 'Year';

const PERIOD_DATA: Record<
  PeriodTab,
  {
    subtitle: string;
    total: number | null;
    delta: string;
    maxBar: number;
    bars: { label: string; value: number; display: string; active?: boolean }[];
  }
> = {
  Week: {
    subtitle: 'Spent this week so far',
    total: 3120,
    delta: '410 less than last week',
    maxBar: 1.2,
    bars: [
      { label: 'Mon', value: 0.42, display: '420' },
      { label: 'Tue', value: 0.31, display: '310' },
      { label: 'Wed', value: 0.65, display: '650' },
      { label: 'Thu', value: 0.48, display: '480' },
      { label: 'Fri', value: 0.86, display: '860' },
      { label: 'Sat', value: 0.4, display: '400', active: true },
    ],
  },
  Month: {
    subtitle: 'Spent in November so far',
    total: null,
    delta: '1,204 less than October',
    maxBar: 18,
    bars: [
      { label: 'Jun', value: 16.2, display: '16.2k' },
      { label: 'Jul', value: 14.9, display: '14.9k' },
      { label: 'Aug', value: 17.4, display: '17.4k' },
      { label: 'Sep', value: 15.3, display: '15.3k' },
      { label: 'Oct', value: 14.8, display: '14.8k' },
      { label: 'Nov', value: 13.6, display: '13.6k', active: true },
    ],
  },
  Year: {
    subtitle: 'Spent in 2026 so far',
    total: 168420,
    delta: '8,500 less than 2025 pace',
    maxBar: 20,
    bars: [
      { label: 'Q1', value: 15.8, display: '47k' },
      { label: 'Q2', value: 17.2, display: '51k' },
      { label: 'Q3', value: 16.4, display: '49k' },
      { label: 'Q4', value: 13.6, display: '21k', active: true },
    ],
  },
};

const BREAKDOWN = [
  { name: 'Food', pct: 36, color: '#141413' },
  { name: 'Bills', pct: 31, color: '#52524C' },
  { name: 'Transport', pct: 14, color: '#8A8880' },
  { name: 'Shopping', pct: 12, color: '#B5B3AA' },
  { name: 'Other', pct: 7, color: '#DEDCD4' },
];

const PLACEHOLDER_BARS = [
  { height: 56, filled: false },
  { height: 88, filled: false },
  { height: 38, filled: true },
  { height: 70, filled: false },
  { height: 96, filled: false },
  { height: 64, filled: false },
  { height: 48, filled: false },
];

export default function InsightsScreen() {
  const { selectedCurrency } = useOnboarding();
  const { totalSpent, transactions } = useBudget();
  const [period, setPeriod] = useState<PeriodTab>('Month');

  const sym = selectedCurrency.symbol;
  const activePeriod = PERIOD_DATA[period];
  const displayTotal = activePeriod.total ?? totalSpent;
  const isInsufficientData = transactions.length < 3;

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
                Track for a week and your trends show up here.
              </Text>

              <View className="flex-row items-center justify-between mt-6 mb-2">
                <Text className="text-[13px] font-semibold text-charcoal">
                  Days tracked
                </Text>
                <Text className="text-[13px] text-warm-gray">3 of 7</Text>
              </View>

              <View className="flex-row gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => (
                  <View
                    key={dayIdx}
                    className={`flex-1 h-1.5 rounded-full ${
                      dayIdx < 3 ? 'bg-charcoal' : 'bg-[#E5E3DC]'
                    }`}
                  />
                ))}
              </View>
            </View>

            <View className="mt-4 bg-white border border-warm-border rounded-3xl p-4 flex-row items-center gap-3.5">
              <NoxMiniIcon size={34} />
              <Text className="flex-1 text-[14px] leading-[20px] text-charcoal">
                I&apos;ll write your first recap on{' '}
                <Text className="font-bold">Friday, Nov 27</Text>.
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
                {sym}
                {displayTotal.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
              <View className="flex-row items-center gap-1 mt-1">
                <ArrowDown size={13} color="#66655E" strokeWidth={2.2} />
                <Text className="text-[13px] text-warm-gray">
                  {sym}
                  {activePeriod.delta}
                </Text>
              </View>

              {/* Bar Chart */}
              <View className="flex-row items-end justify-between mt-7 h-[150px] gap-2">
                {activePeriod.bars.map((bar) => {
                  const heightPct = Math.round(
                    (bar.value / activePeriod.maxBar) * 100
                  );
                  return (
                    <View key={bar.label} className="flex-1 items-center">
                      <Text className="text-[11px] font-medium text-warm-gray mb-1.5">
                        {bar.display}
                      </Text>
                      <View className="w-full h-[106px] justify-end">
                        <View
                          style={{ height: `${heightPct}%` }}
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

            <View className="h-2.5 rounded-full flex-row overflow-hidden gap-0.5">
              {BREAKDOWN.map((item) => (
                <View
                  key={item.name}
                  style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  className="h-full"
                />
              ))}
            </View>

            <View className="flex-row flex-wrap mt-3.5 gap-y-2.5">
              {BREAKDOWN.map((item) => (
                <View
                  key={item.name}
                  className="w-1/2 flex-row items-center justify-between pr-4"
                >
                  <View className="flex-row items-center gap-2">
                    <View
                      style={{ backgroundColor: item.color }}
                      className="w-2.5 h-2.5 rounded-sm"
                    />
                    <Text className="text-[14px] text-charcoal">
                      {item.name}
                    </Text>
                  </View>
                  <Text className="text-[14px] font-bold text-charcoal">
                    {item.pct}%
                  </Text>
                </View>
              ))}
            </View>

            {/* Nox Monthly Recap Dark Card */}
            <View className="mt-6 bg-charcoal rounded-3xl p-4 flex-row gap-3.5">
              <View className="pt-0.5">
                <NoxMiniIcon size={34} />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-nox-lime">
                  Nox&apos;s monthly recap
                </Text>
                <Text className="mt-1 text-[14px] leading-[20px] text-white/90">
                  Your weekends cost more than twice your weekdays, mostly food
                  delivery. One home-cooked Saturday saves about {sym}400.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
