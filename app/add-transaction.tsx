import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Calendar,
  Delete,
  Pencil,
  ScanLine,
  Wallet,
  X,
} from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { TransactionType, useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';

const CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Health',
  'Fun',
  'More',
];

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
];

export default function AddTransactionModal() {
  const { selectedCurrency } = useOnboarding();
  const { addTransaction } = useBudget();
  const sym = selectedCurrency.symbol;

  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('180');
  const [quickText, setQuickText] = useState('lunch 180 yesterday');
  const [selectedCategory, setSelectedCategory] = useState('Food');

  const numericAmount = parseFloat(amountStr) || 0;
  const [wholePart, decPart] = numericAmount.toFixed(2).split('.');

  const handleQuickTextChange = (text: string) => {
    setQuickText(text);
    const match = text.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      setAmountStr(match[1]);
    }
    const lower = text.toLowerCase();
    if (lower.includes('lunch') || lower.includes('food') || lower.includes('dinner')) {
      setSelectedCategory('Food');
    } else if (lower.includes('grab') || lower.includes('jeep') || lower.includes('bus')) {
      setSelectedCategory('Transport');
    } else if (lower.includes('bill') || lower.includes('electric')) {
      setSelectedCategory('Bills');
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === 'back') {
      setAmountStr((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
      return;
    }
    if (key === '.') {
      setAmountStr((prev) => (prev.includes('.') ? prev : `${prev}.`));
      return;
    }
    setAmountStr((prev) => (prev === '0' ? key : `${prev}${key}`));
  };

  const handleSave = () => {
    if (numericAmount <= 0) return;
    addTransaction({
      title: quickText.trim() || selectedCategory,
      category: txType === 'income' ? 'Income' : selectedCategory,
      amount: numericAmount,
      type: txType,
      dateLabel: 'Today',
      wallet: 'Cash wallet',
    });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 px-5 pt-2 pb-4 justify-between">
        {/* Top Bar */}
        <View>
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Close"
              className="w-10 h-10 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
            >
              <X size={19} color="#141413" strokeWidth={2} />
            </Pressable>

            <View className="flex-row bg-[#EAE8E1] p-1 rounded-full">
              {(['expense', 'income', 'transfer'] as TransactionType[]).map(
                (t) => {
                  const active = txType === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setTxType(t)}
                      className={`px-3.5 py-1.5 rounded-full ${
                        active ? 'bg-white' : 'bg-transparent'
                      }`}
                    >
                      <Text
                        className={`text-[13px] font-semibold capitalize ${
                          active ? 'text-charcoal' : 'text-warm-gray'
                        }`}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>

            <Pressable
              accessibilityLabel="Scan receipt"
              className="w-10 h-10 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
            >
              <ScanLine size={18} color="#141413" strokeWidth={2} />
            </Pressable>
          </View>

          {/* Amount Display */}
          <View className="items-center mt-5">
            <Text className="text-[13px] font-medium text-warm-gray">
              Amount
            </Text>
            <View className="flex-row items-baseline mt-1">
              <Text className="text-[42px] leading-[48px] font-bold tracking-tight text-charcoal">
                {sym}
                {Number(wholePart).toLocaleString('en-US')}
              </Text>
              <Text className="text-[36px] leading-[44px] font-bold text-[#8A8880]">
                .{decPart}
              </Text>
            </View>
          </View>

          {/* Nox Quick-Type Card */}
          <View className="mt-4 bg-white border border-warm-border rounded-3xl p-3.5">
            <View className="flex-row items-center gap-2">
              <NoxMiniIcon size={20} />
              <Text className="text-[12.5px] font-medium text-warm-gray">
                Or just type it — Nox fills the rest
              </Text>
            </View>

            <TextInput
              value={quickText}
              onChangeText={handleQuickTextChange}
              placeholder="e.g. lunch 180 yesterday"
              placeholderTextColor="#8A8880"
              className="mt-2.5 bg-[#F3F2EC] rounded-2xl px-3.5 py-2.5 text-[14.5px] text-charcoal"
            />

            <View className="flex-row items-center gap-2 mt-2.5">
              <View className="bg-nox-lime rounded-full px-3 py-1">
                <Text className="text-[12.5px] font-semibold text-charcoal">
                  {selectedCategory}
                </Text>
              </View>
              <View className="bg-[#F3F2EC] rounded-full px-3 py-1">
                <Text className="text-[12.5px] font-medium text-charcoal">
                  {sym}
                  {numericAmount.toFixed(2)}
                </Text>
              </View>
              <View className="bg-[#F3F2EC] rounded-full px-3 py-1">
                <Text className="text-[12.5px] font-medium text-charcoal">
                  Thu, Nov 19
                </Text>
              </View>
            </View>
          </View>

          {/* Category Pills */}
          <View className="flex-row flex-wrap gap-2 mt-4">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
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
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Metadata Row */}
          <View className="flex-row items-center gap-2 mt-3.5">
            <View className="flex-row items-center gap-1.5 bg-[#EFECE4] rounded-xl px-3 py-2">
              <Calendar size={14} color="#66655E" strokeWidth={2} />
              <Text className="text-[12.5px] font-medium text-charcoal">
                Yesterday
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 bg-[#EFECE4] rounded-xl px-3 py-2">
              <Wallet size={14} color="#66655E" strokeWidth={2} />
              <Text className="text-[12.5px] font-medium text-charcoal">
                Cash wallet
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 bg-[#EFECE4] rounded-xl px-3 py-2">
              <Pencil size={14} color="#66655E" strokeWidth={2} />
              <Text className="text-[12.5px] font-medium text-charcoal">
                Note
              </Text>
            </View>
          </View>
        </View>

        {/* Numeric Keypad & Save CTA */}
        <View>
          <View className="gap-2">
            {KEYPAD_ROWS.map((row, rIdx) => (
              <View key={rIdx} className="flex-row gap-2">
                {row.map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => handleKeyPress(key)}
                    className="flex-1 h-12 rounded-2xl bg-white items-center justify-center active:bg-[#EAE8E1]"
                  >
                    {key === 'back' ? (
                      <Delete size={20} color="#141413" strokeWidth={1.9} />
                    ) : (
                      <Text className="text-[20px] font-semibold text-charcoal">
                        {key}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          <Pressable
            onPress={handleSave}
            className="mt-3 bg-charcoal rounded-full h-[54px] items-center justify-center active:opacity-85"
          >
            <Text className="text-white text-[16px] font-semibold">
              Save {txType}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
