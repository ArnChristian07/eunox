import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { CategoryType, Transaction, useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import {
  addDays,
  formatFullDate,
  formatRelativeDay,
  parseISODate,
  toISODate,
} from '@/lib/dates';
import { formatMoney, isValidPositiveAmount, parseAmount } from '@/lib/format';

const FALLBACK_EXPENSE_CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Fun'];
const FALLBACK_INCOME_CATEGORIES = ['Salary', 'Other income'];
const REPEAT_CYCLE = ['Never', 'Weekly', 'Monthly'];

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { transactions } = useBudget();
  const tx = id ? transactions.find((t) => t.id === id) : undefined;

  if (!tx) {
    return (
      <SafeAreaView className="flex-1 bg-cream">
        <View className="flex-1 px-5 pt-2 justify-between pb-6">
          <View className="flex-row items-center gap-3 pt-2">
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Back"
              className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
            >
              <ChevronLeft size={20} color="#141413" strokeWidth={2} />
            </Pressable>
            <Text className="text-[22px] font-bold tracking-tight text-charcoal">
              Transaction not found
            </Text>
          </View>
          <View className="items-center px-6">
            <Text className="text-center text-[15px] text-warm-gray">
              This transaction may have been deleted or could not be loaded.
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            className="bg-charcoal rounded-full h-[54px] items-center justify-center active:opacity-85"
          >
            <Text className="text-white text-[16px] font-semibold">Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return <EditTransactionForm key={tx.id} tx={tx} />;
}

function EditTransactionForm({ tx }: { tx: Transaction }) {
  const { selectedCurrency } = useOnboarding();
  const {
    today,
    wallets,
    expenseCategories,
    incomeCategories,
    updateTransaction,
    deleteTransaction,
  } = useBudget();
  const sym = selectedCurrency.symbol;

  const [txType, setTxType] = useState<CategoryType>(
    tx.type === 'income' ? 'income' : 'expense'
  );
  const [amountInput, setAmountInput] = useState(tx.amount.toFixed(2));
  const [date, setDate] = useState(tx.date);
  const [category, setCategory] = useState(tx.category);
  const [walletId, setWalletId] = useState(() => {
    const match =
      (tx.walletId ? wallets.find((w) => w.id === tx.walletId) : undefined) ??
      wallets.find((w) => w.name.toLowerCase() === tx.wallet.toLowerCase());
    return match?.id ?? wallets[0]?.id ?? '';
  });
  const [repeat, setRepeat] = useState(tx.repeat ?? 'Never');
  const [note, setNote] = useState(tx.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const categoryList =
    txType === 'income'
      ? incomeCategories.length > 0
        ? incomeCategories.map((c) => c.name)
        : FALLBACK_INCOME_CATEGORIES
      : expenseCategories.length > 0
        ? expenseCategories.map((c) => c.name)
        : FALLBACK_EXPENSE_CATEGORIES;

  const selectedWallet =
    wallets.find((w) => w.id === walletId) ?? wallets[0];

  const cycleValue = (
    current: string,
    list: string[],
    setter: (v: string) => void
  ) => {
    if (list.length === 0) return;
    const idx = list.findIndex((item) => item.toLowerCase() === current.toLowerCase());
    setter(list[(idx + 1) % list.length]);
  };

  const cycleWallet = () => {
    if (wallets.length <= 1) return;
    const idx = wallets.findIndex((w) => w.id === selectedWallet?.id);
    const next = wallets[(idx + 1) % wallets.length];
    if (next) setWalletId(next.id);
  };

  const stepDate = (deltaDays: number) => {
    const nextDate = addDays(parseISODate(date), deltaDays);
    setDate(toISODate(nextDate));
  };

  const handleSwitchType = (nextType: CategoryType) => {
    if (nextType === txType) return;
    setTxType(nextType);
    const nextList =
      nextType === 'income'
        ? incomeCategories.length > 0
          ? incomeCategories.map((c) => c.name)
          : FALLBACK_INCOME_CATEGORIES
        : expenseCategories.length > 0
          ? expenseCategories.map((c) => c.name)
          : FALLBACK_EXPENSE_CATEGORIES;
    if (!nextList.some((c) => c.toLowerCase() === category.toLowerCase())) {
      setCategory(nextList[0] ?? category);
    }
  };

  const handleSave = () => {
    const parsedAmount = parseAmount(amountInput);
    if (!isValidPositiveAmount(parsedAmount)) {
      setError('Enter a valid amount greater than 0.');
      return;
    }
    if (!selectedWallet) {
      setError('Pick a valid wallet.');
      return;
    }
    updateTransaction(tx.id, {
      type: txType,
      amount: parsedAmount,
      date,
      category,
      wallet: selectedWallet.name,
      walletId: selectedWallet.id,
      repeat,
      note: note.trim() || undefined,
    });
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

  const isIncome = txType === 'income';

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View className="flex-1 px-5 pb-6 justify-between">
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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
                Edit {txType}
              </Text>
            </View>

            <View className="flex-row bg-[#EAE8E1] p-1 rounded-full">
              {(['expense', 'income'] as CategoryType[]).map((t) => {
                const active = txType === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => handleSwitchType(t)}
                    className={`px-3 py-1 rounded-full ${
                      active ? 'bg-white' : 'bg-transparent'
                    }`}
                  >
                    <Text
                      className={`text-[12.5px] font-semibold capitalize ${
                        active ? 'text-charcoal' : 'text-warm-gray'
                      }`}
                    >
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Amount & Title */}
          <View className="items-center mt-2 mb-6">
            <Text className="text-[13px] font-medium text-warm-gray">
              Amount
            </Text>
            <View className="flex-row items-center justify-center mt-1">
              <Text className="text-[36px] leading-[46px] font-bold tracking-tight text-charcoal">
                {isIncome ? '+' : '-'}
                {sym}
              </Text>
              <TextInput
                value={amountInput}
                onChangeText={(v) => {
                  setAmountInput(v);
                  setError(null);
                }}
                keyboardType="decimal-pad"
                accessibilityLabel="Transaction amount"
                className="text-[40px] leading-[46px] font-bold tracking-tight text-charcoal min-w-[90px] text-center p-0"
              />
            </View>
            <Text className="mt-1.5 text-[16px] font-semibold text-charcoal">
              {tx.title}
            </Text>
          </View>

          {/* Details Card */}
          <View className="bg-white border border-warm-border rounded-3xl px-4 py-1">
            <Pressable
              onPress={() => cycleValue(category, categoryList, setCategory)}
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
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => stepDate(-1)}
                  accessibilityLabel="Previous day"
                  className="w-7 h-7 rounded-lg bg-[#F3F2EC] items-center justify-center active:opacity-70"
                >
                  <ChevronLeft size={15} color="#141413" strokeWidth={2} />
                </Pressable>
                <Text className="text-[14.5px] font-semibold text-charcoal">
                  {formatFullDate(date)}
                </Text>
                <Pressable
                  onPress={() => stepDate(1)}
                  accessibilityLabel="Next day"
                  className="w-7 h-7 rounded-lg bg-[#F3F2EC] items-center justify-center active:opacity-70"
                >
                  <ChevronRight size={15} color="#141413" strokeWidth={2} />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={cycleWallet}
              className="flex-row items-center justify-between py-4 border-b border-warm-border"
            >
              <Text className="text-[14.5px] text-warm-gray">Wallet</Text>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[14.5px] font-semibold text-charcoal">
                  {selectedWallet?.name ?? tx.wallet}
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

          {error ? (
            <Text className="mt-3 text-center text-[13px] font-semibold text-[#B85318]">
              {error}
            </Text>
          ) : null}

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
      </KeyboardAvoidingView>

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
              {tx.title}, {tx.type === 'income' ? '+' : '-'}
              {formatMoney(tx.amount, sym)} on {formatRelativeDay(tx.date, today)}.{' '}
              {tx.type === 'expense'
                ? `Your ${tx.category} budget gets ${formatMoney(tx.amount, sym)} back and ${tx.wallet} will be credited.`
                : tx.type === 'income'
                  ? `${formatMoney(tx.amount, sym)} will be removed from ${tx.wallet}.`
                  : `This entry will be removed.`}{' '}
              This can&apos;t be undone.
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
