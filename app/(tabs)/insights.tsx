import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowDown } from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';

type PeriodTab = 'Week' | 'Month' | 'Year';

const MONTHLY_BARS = [
  { label: 'Jun', value: 16.2, display: '16.2k' },
  { label: 'Jul', value: 14.9, display: '14.9k' },
  { label: 'Aug', value: 17.4, display: '17.4k' },
  { label: 'Sep', value: 15.3, display: '15.3k' },
  { label: 'Oct', value: 14.8, display: '14.8k' },
  { label: 'Nov', value: 13.6, display: '13.6k', active: true },
];

const BREAKDOWN = [
  { name: 'Food', pct: 36, color: '#141413' },
  { name: 'Bills', pct: 31, color: '#52524C' },
  { name: 'Transport', pct: 14, color: '#8A8880' },
  { name: 'Shopping', pct: 12, color: '#B5B3AA' },
  { name: 'Other', pct: 7, color: '#DEDCD4' },
];

export default function InsightsScreen() {
  const { selectedCurrency } = useOnboarding();
  const { totalSpent } = useBudget();
  const [period, setPeriod] = useState<PeriodTab>('Month');

  const sym = selectedCurrency.symbol;
  const maxBar = 18;

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
        </View>

        {/* Spending Trend Card */}
        <View className="bg-white border border-warm-border rounded-3xl p-5">
          <Text className="text-[13.5px] text-warm-gray">
            Spent in November so far
          </Text>
          <Text className="mt-1 text-[28px] font-bold tracking-tight text-charcoal">
            {sym}
            {totalSpent.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View className="flex-row items-center gap-1 mt-1">
            <ArrowDown size={13} color="#66655E" strokeWidth={2.2} />
            <Text className="text-[13px] text-warm-gray">
              {sym}1,204 less than October
            </Text>
          </View>

          {/* Bar Chart */}
          <View className="flex-row items-end justify-between mt-7 h-[150px] gap-2">
            {MONTHLY_BARS.map((bar) => {
              const heightPct = Math.round((bar.value / maxBar) * 100);
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
        </View>

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
                <Text className="text-[14px] text-charcoal">{item.name}</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}
