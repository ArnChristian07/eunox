import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { formatFullDate, formatRelativeDay } from '@/lib/dates';

const CATEGORY_CYCLE = ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Fun'];
const WALLET_CYCLE = ['Cash wallet', 'E-wallet', 'Bank savings'];
const REPEAT_CYCLE = ['Never', 'Weekly', 'Monthly'];

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { selectedCurrency } = useOnboarding();
  const { today, transactions, updateTransaction, deleteTransaction } =
    useBudget();
  const sym = selectedCurrency.symbol;

  const tx =
    transactions.find((t) => t.id === id) ??
    transactions.find((t) => t.id === '3') ??
    transactions[0];

  const [category, setCategory] = useState(tx?.category ?? 'Food');
  const [wallet, setWallet] = useState(tx?.wallet ?? 'Cash wallet');
  const [repeat, setRepeat] = useState(tx?.repeat ?? 'Never');
  const [note, setNote] = useState(tx?.note ?? 'With classmates after the exam');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!tx) {
    return null;
  }

  const cycleValue = (
    current: string,
    list: string[],
    setter: (v: string) => void
  ) => {
    const idx = list.indexOf(current);
    setter(list[(idx + 1) % list.length]);
  };

  const handleSave = () => {
    updateTransaction(tx.id, { category, wallet, repeat, note });
    router.back();
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setShowDeleteModal(false);
    deleteTransaction(tx.id);
    router.back();
  };

  const isIncome = tx.type === 'income';

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 px-5 pb-6 justify-between">
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="flex-row items-center gap-3 pt-2 pb-4">
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Back"
              className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
            >
              <ChevronLeft size={20} color="#141413" strokeWidth={2} />
            </Pressable>
            <Text className="text-[22px] font-bold tracking-tight text-charcoal">
              Edit {tx.type}
            </Text>
          </View>

          {/* Amount & Title */}
          <View className="items-center mt-2 mb-6">
            <Text className="text-[13px] font-medium text-warm-gray">
              Amount
            </Text>
            <Text className="mt-1 text-[40px] leading-[46px] font-bold tracking-tight text-charcoal">
              {isIncome ? '+' : '-'}
              {sym}
              {tx.amount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text className="mt-1.5 text-[16px] font-semibold text-charcoal">
              {tx.title}
            </Text>
          </View>

          {/* Details Card */}
          <View className="bg-white border border-warm-border rounded-3xl px-4 py-1">
            <Pressable
              onPress={() => cycleValue(category, CATEGORY_CYCLE, setCategory)}
              className="flex-row items-center justify-between py-4 border-b border-warm-border"
            >
              <Text className="text-[14.5px] text-warm-gray">Category</Text>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[14.5px] font-semibold text-charcoal">
                  {category}
                </Text>
                <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
              </View>
            </Pressable>

            <View className="flex-row items-center justify-between py-4 border-b border-warm-border">
              <Text className="text-[14.5px] text-warm-gray">Date</Text>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[14.5px] font-semibold text-charcoal">
                  {formatFullDate(tx.date)}
                </Text>
                <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
              </View>
            </View>

            <Pressable
              onPress={() => cycleValue(wallet, WALLET_CYCLE, setWallet)}
              className="flex-row items-center justify-between py-4 border-b border-warm-border"
            >
              <Text className="text-[14.5px] text-warm-gray">Wallet</Text>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[14.5px] font-semibold text-charcoal">
                  {wallet}
                </Text>
                <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
              </View>
            </Pressable>

            <Pressable
              onPress={() => cycleValue(repeat, REPEAT_CYCLE, setRepeat)}
              className="flex-row items-center justify-between py-4 border-b border-warm-border"
            >
              <Text className="text-[14.5px] text-warm-gray">Repeat</Text>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[14.5px] font-semibold text-charcoal">
                  {repeat}
                </Text>
                <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
              </View>
            </Pressable>

            <View className="py-3.5">
              <Text className="text-[14px] text-warm-gray mb-2">Note</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                multiline
                placeholder="Add a note..."
                placeholderTextColor="#8A8880"
                className="bg-[#F3F2EC] rounded-2xl px-3.5 py-3 text-[14.5px] text-charcoal min-h-[54px]"
              />
            </View>
          </View>

          {/* Nox Source Attribution */}
          {tx.noxSource ? (
            <View className="flex-row items-center gap-2.5 mt-4 px-1">
              <NoxMiniIcon size={22} />
              <Text className="text-[13px] text-warm-gray flex-1">
                Nox filled this in from &ldquo;{tx.noxSource}&rdquo;.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Bottom Actions */}
        <View className="pt-4">
          <Pressable
            onPress={handleSave}
            className="bg-charcoal rounded-full h-[54px] items-center justify-center active:opacity-85"
          >
            <Text className="text-white text-[16px] font-semibold">
              Save changes
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            className="mt-4 py-2 flex-row items-center justify-center gap-2 active:opacity-70"
          >
            <Trash2 size={16} color="#B85318" strokeWidth={2} />
            <Text className="text-[15px] font-semibold text-[#B85318]">
              Delete {tx.type}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View className="flex-1 bg-black/45 items-center justify-center px-6">
          <View className="w-full bg-white rounded-3xl p-6">
            <View className="w-12 h-12 rounded-2xl bg-[#FCEEE4] items-center justify-center mb-4">
              <Trash2 size={22} color="#B85318" strokeWidth={2} />
            </View>

            <Text className="text-[20px] font-bold text-charcoal">
              Delete this {tx.type}?
            </Text>
            <Text className="mt-2 text-[14px] leading-[20px] text-warm-gray">
              {tx.title}, {isIncome ? '+' : '-'}
              {sym}
              {tx.amount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              on {formatRelativeDay(tx.date, today)}. Your {category} budget gets{' '}
              {sym}
              {tx.amount.toLocaleString('en-US')} back. This can&apos;t be
              undone.
            </Text>

            <View className="flex-row gap-3 mt-6">
              <Pressable
                onPress={() => setShowDeleteModal(false)}
                className="flex-1 h-12 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
              >
                <Text className="text-[15px] font-semibold text-charcoal">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={confirmDelete}
                className="flex-1 h-12 rounded-2xl bg-[#B85318] items-center justify-center active:opacity-85"
              >
                <Text className="text-[15px] font-semibold text-white">
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
