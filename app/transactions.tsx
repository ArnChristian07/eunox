import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronDown, ChevronLeft, Search } from 'lucide-react-native';
import { Transaction, useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';

type FilterTab = 'all' | 'expense' | 'income';

export default function TransactionsScreen() {
  const { selectedCurrency } = useOnboarding();
  const { transactions } = useBudget();
  const sym = selectedCurrency.symbol;

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filter === 'expense' && tx.type !== 'expense') return false;
      if (filter === 'income' && tx.type !== 'income') return false;
      if (!q) return true;
      return (
        tx.title.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.wallet.toLowerCase().includes(q) ||
        tx.amount.toString().includes(q) ||
        (tx.note?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [transactions, filter, query]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: Transaction[]; net: number }[] = [];
    const map = new Map<string, { label: string; items: Transaction[]; net: number }>();

    for (const tx of filtered) {
      const groupLabel = tx.dateGroup ?? tx.dateLabel;
      let group = map.get(groupLabel);
      if (!group) {
        group = { label: groupLabel, items: [], net: 0 };
        map.set(groupLabel, group);
        groups.push(group);
      }
      group.items.push(tx);
      group.net += tx.type === 'income' ? 0 : -tx.amount;
    }

    return groups;
  }, [filtered]);

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 px-5">
        {/* Header */}
        <View className="flex-row items-center justify-between pt-2 pb-4">
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Back"
              className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
            >
              <ChevronLeft size={20} color="#141413" strokeWidth={2} />
            </Pressable>
            <Text className="text-[22px] font-bold tracking-tight text-charcoal">
              Transactions
            </Text>
          </View>

          <Pressable className="flex-row items-center gap-1 bg-white border border-warm-border rounded-full px-3.5 py-2">
            <Text className="text-[13.5px] font-semibold text-charcoal">
              November
            </Text>
            <ChevronDown size={15} color="#141413" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Search Input */}
        <View className="flex-row items-center bg-white border border-warm-border rounded-2xl px-3.5 h-12">
          <Search size={18} color="#8A8880" strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search notes, categories, amounts"
            placeholderTextColor="#8A8880"
            className="flex-1 ml-2.5 text-[14.5px] text-charcoal"
          />
        </View>

        {/* Filter Chips */}
        <View className="flex-row gap-2 mt-3.5 mb-3">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'expense', label: 'Expenses' },
              { id: 'income', label: 'Income' },
            ] as { id: FilterTab; label: string }[]
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setFilter(tab.id)}
                className={`rounded-full px-4 py-2 border ${
                  active
                    ? 'bg-charcoal border-charcoal'
                    : 'bg-white border-warm-border'
                }`}
              >
                <Text
                  className={`text-[13.5px] font-semibold ${
                    active ? 'text-white' : 'text-charcoal'
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Grouped List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24, gap: 18 }}
        >
          {grouped.map((group) => (
            <View key={group.label}>
              <View className="flex-row items-center justify-between mb-2 px-1">
                <Text className="text-[13px] font-medium text-warm-gray">
                  {group.label}
                </Text>
                <Text className="text-[13px] font-medium text-warm-gray">
                  -{sym}
                  {Math.abs(group.net).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              <View className="bg-white border border-warm-border rounded-3xl px-4">
                {group.items.map((tx, idx) => {
                  const isIncome = tx.type === 'income';
                  const letter = tx.category.charAt(0).toUpperCase();
                  return (
                    <Pressable
                      key={tx.id}
                      onPress={() =>
                        router.push({
                          pathname: '/edit-transaction',
                          params: { id: tx.id },
                        })
                      }
                      className={`flex-row items-center justify-between py-3.5 active:opacity-70 ${
                        idx < group.items.length - 1
                          ? 'border-b border-warm-border'
                          : ''
                      }`}
                    >
                      <View className="flex-row items-center gap-3 flex-1 pr-2">
                        <View
                          className={`w-10 h-10 rounded-xl items-center justify-center ${
                            isIncome ? 'bg-nox-lime' : 'bg-[#F3F2EC]'
                          }`}
                        >
                          <Text className="text-[14px] font-bold text-charcoal">
                            {letter}
                          </Text>
                        </View>

                        <View className="flex-1">
                          <Text
                            numberOfLines={1}
                            className="text-[15px] font-semibold text-charcoal"
                          >
                            {tx.title}
                          </Text>
                          <Text className="text-[12.5px] text-warm-gray mt-0.5">
                            {tx.category} · {tx.wallet}
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
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
