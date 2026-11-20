import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Href, router } from 'expo-router';
import {
  ArrowLeftRight,
  Calendar,
  Check,
  Delete,
  Pencil,
  ScanLine,
  Undo2,
  Wallet,
  X,
} from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { TransactionType, useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { addDays, formatShortDate, toISODate } from '@/lib/dates';
import {
  formatMoney,
  isValidPositiveAmount,
  MAX_MONEY_AMOUNT,
  roundMoney,
  splitMoneyParts,
  subMoney,
} from '@/lib/format';

const FALLBACK_EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Health',
  'Fun',
];
const FALLBACK_INCOME_CATEGORIES = ['Salary', 'Other income'];

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
];

const MAX_INTEGER_DIGITS = 9; // Up to 999,999,999.99

export default function AddTransactionModal() {
  const { selectedCurrency } = useOnboarding();
  const {
    today,
    addTransaction,
    deleteTransaction,
    transferBetweenWallets,
    deleteTransfer,
    transfers,
    categories,
    expenseCategories,
    incomeCategories,
    wallets,
    defaultWallet,
    daysLeft,
  } = useBudget();
  const sym = selectedCurrency.symbol;

  const expenseNames =
    expenseCategories.length > 0
      ? expenseCategories.map((c) => c.name)
      : FALLBACK_EXPENSE_CATEGORIES;
  const incomeNames =
    incomeCategories.length > 0
      ? incomeCategories.map((c) => c.name)
      : FALLBACK_INCOME_CATEGORIES;

  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('0');
  const [quickText, setQuickText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(expenseNames[0] ?? 'Food');
  const [dateLabel, setDateLabel] = useState<'Today' | 'Yesterday'>('Today');
  const [walletId, setWalletId] = useState<string>(
    defaultWallet?.id ?? wallets[0]?.id ?? ''
  );
  const [toWalletId, setToWalletId] = useState<string>(
    wallets.find((w) => w.id !== (defaultWallet?.id ?? wallets[0]?.id))?.id ?? ''
  );
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedKind, setSavedKind] = useState<TransactionType>('expense');
  const [savedAmount, setSavedAmount] = useState(0);
  const [savedSummary, setSavedSummary] = useState('');

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardOpen(false);
      setIsInputFocused(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const hideCustomKeypad = isInputFocused || isKeyboardOpen;

  const activeCategoryNames = txType === 'income' ? incomeNames : expenseNames;
  const effectiveCategory = activeCategoryNames.some(
    (name) => name.toLowerCase() === selectedCategory.toLowerCase()
  )
    ? selectedCategory
    : (activeCategoryNames[0] ?? selectedCategory);

  const selectedWallet =
    wallets.find((w) => w.id === walletId) ?? defaultWallet ?? wallets[0];
  const destinationWallet =
    wallets.find((w) => w.id === toWalletId && w.id !== selectedWallet?.id) ??
    wallets.find((w) => w.id !== selectedWallet?.id);

  const numericAmount = roundMoney(parseFloat(amountStr) || 0);
  const { whole: wholePart, dec: decPart } = splitMoneyParts(numericAmount);
  const txDate = dateLabel === 'Today' ? today : addDays(today, -1);

  const cycleFromWallet = () => {
    if (wallets.length <= 1) return;
    const idx = wallets.findIndex((w) => w.id === selectedWallet?.id);
    const next = wallets[(idx + 1) % wallets.length];
    if (next) {
      setWalletId(next.id);
      if (next.id === toWalletId) {
        const alt = wallets.find((w) => w.id !== next.id);
        setToWalletId(alt?.id ?? '');
      }
      setFormError(null);
    }
  };

  const cycleToWallet = () => {
    const candidates = wallets.filter((w) => w.id !== selectedWallet?.id);
    if (candidates.length === 0) return;
    const idx = candidates.findIndex((w) => w.id === destinationWallet?.id);
    const next = candidates[(idx + 1) % candidates.length];
    if (next) {
      setToWalletId(next.id);
      setFormError(null);
    }
  };

  const handleQuickTextChange = (text: string) => {
    setQuickText(text);
    setFormError(null);
    // Prefer the last number in the phrase (e.g. "2 coffees 150" -> "150").
    const matches = text.match(/\d+(?:\.\d{1,2})?/g);
    if (matches && matches.length > 0) {
      const candidate = matches[matches.length - 1];
      const parsed = Number(candidate);
      if (Number.isFinite(parsed) && parsed <= MAX_MONEY_AMOUNT) {
        setAmountStr(candidate);
      }
    }
    const lower = text.toLowerCase();
    if (lower.includes('yesterday')) {
      setDateLabel('Yesterday');
    } else if (lower.includes('today')) {
      setDateLabel('Today');
    }
    if (txType === 'expense') {
      if (lower.includes('lunch') || lower.includes('food') || lower.includes('dinner')) {
        setSelectedCategory('Food');
      } else if (lower.includes('grab') || lower.includes('jeep') || lower.includes('bus')) {
        setSelectedCategory('Transport');
      } else if (lower.includes('bill') || lower.includes('electric')) {
        setSelectedCategory('Bills');
      }
    }
  };

  const handleKeyPress = (key: string) => {
    setFormError(null);
    if (key === 'back') {
      setAmountStr((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
      return;
    }
    if (key === '.') {
      setAmountStr((prev) => (prev.includes('.') ? prev : `${prev}.`));
      return;
    }
    setAmountStr((prev) => {
      if (prev.includes('.')) {
        const [, dec] = prev.split('.');
        if (dec.length >= 2) return prev;
        return `${prev}${key}`;
      }
      if (prev === '0') return key;
      if (prev.length >= MAX_INTEGER_DIGITS) return prev;
      return `${prev}${key}`;
    });
  };

  const handleSave = () => {
    if (!isValidPositiveAmount(numericAmount)) {
      setFormError('Enter an amount greater than 0.');
      return;
    }
    if (!selectedWallet) {
      setFormError('Create a wallet before recording entries.');
      return;
    }

    if (txType === 'transfer') {
      if (wallets.length < 2 || !destinationWallet) {
        setFormError('Transfers need at least two different wallets.');
        return;
      }
      const err = transferBetweenWallets(
        selectedWallet.id,
        destinationWallet.id,
        numericAmount
      );
      if (err) {
        setFormError(err);
        return;
      }
      setSavedKind('transfer');
      setSavedAmount(numericAmount);
      setSavedSummary(`${selectedWallet.name} → ${destinationWallet.name} · Today`);
      setSavedId('transfer');
      return;
    }

    const id = addTransaction({
      title: quickText.trim() || effectiveCategory,
      category: effectiveCategory,
      amount: numericAmount,
      type: txType,
      date: toISODate(txDate),
      wallet: selectedWallet.name,
      walletId: selectedWallet.id,
      note: note.trim() || undefined,
    });
    if (!id) {
      setFormError('Could not save transaction. Check amount and wallet.');
      return;
    }
    setSavedKind(txType);
    setSavedAmount(numericAmount);
    setSavedSummary(`${effectiveCategory} · ${dateLabel} · ${selectedWallet.name}`);
    setSavedId(id);
  };

  const handleUndo = () => {
    if (savedKind === 'transfer') {
      const latest = transfers[0];
      if (latest) deleteTransfer(latest.id);
    } else if (savedId) {
      deleteTransaction(savedId);
    }
    setSavedId(null);
  };

  const handleAddAnother = () => {
    setSavedId(null);
    setAmountStr('0');
    setQuickText('');
    setNote('');
    setFormError(null);
  };

  if (savedId) {
    const budgetCat =
      savedKind === 'expense'
        ? categories.find(
            (c) =>
              c.type === 'expense' &&
              c.name.toLowerCase() === effectiveCategory.toLowerCase()
          )
        : undefined;
    const pct =
      budgetCat && budgetCat.limit > 0
        ? Math.min(100, Math.round((budgetCat.spent / budgetCat.limit) * 100))
        : 0;
    const remaining = budgetCat
      ? Math.max(0, subMoney(budgetCat.limit, budgetCat.spent))
      : 0;

    return (
      <SafeAreaView className="flex-1 bg-cream">
        <View className="flex-1 px-5 pt-2 pb-6 justify-between">
          <View className="items-end">
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Close"
              className="w-10 h-10 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
            >
              <X size={19} color="#141413" strokeWidth={2} />
            </Pressable>
          </View>

          <View className="items-center px-2">
            <Animated.View
              entering={ZoomIn.duration(280)}
              className="w-16 h-16 rounded-3xl bg-nox-lime border-[1.75px] border-charcoal items-center justify-center"
            >
              <Check size={28} color="#141413" strokeWidth={2.5} />
            </Animated.View>

            <Animated.Text
              entering={FadeIn.delay(80).duration(220)}
              className="mt-5 text-[22px] font-bold text-charcoal"
            >
              Saved
            </Animated.Text>
            <Text className="mt-1.5 text-[36px] font-bold tracking-tight text-charcoal">
              {formatMoney(savedAmount, sym)}
            </Text>
            <Text className="mt-1.5 text-[14px] text-warm-gray">
              {savedSummary}
            </Text>

            {budgetCat ? (
              <View className="mt-7 w-full bg-white border border-warm-border rounded-3xl p-4">
                <View className="flex-row items-center justify-between mb-2.5">
                  <Text className="text-[14.5px] font-semibold text-charcoal">
                    {budgetCat.name} budget
                  </Text>
                  <Text className="text-[14px]">
                    <Text className="font-bold text-charcoal">
                      {formatMoney(budgetCat.spent, sym)}
                    </Text>
                    <Text className="text-warm-gray">
                      {' '}
                      / {formatMoney(budgetCat.limit, sym)}
                    </Text>
                  </Text>
                </View>

                <View className="h-[5px] rounded-full bg-[#ECEAE2] overflow-hidden">
                  <View
                    style={{ width: `${pct}%` }}
                    className={`h-full rounded-full ${
                      pct >= 80 ? 'bg-[#D96B27]' : 'bg-charcoal'
                    }`}
                  />
                </View>

                <Text className="mt-2 text-[12.5px] font-medium text-[#B85318]">
                  {pct}% used · {formatMoney(remaining, sym)} left for {daysLeft} days
                </Text>
              </View>
            ) : null}
          </View>

          <View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleAddAnother}
                className="flex-1 bg-white border border-warm-border rounded-full h-[52px] items-center justify-center active:opacity-75"
              >
                <Text className="text-[15px] font-semibold text-charcoal">
                  Add another
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.back()}
                className="flex-1 bg-charcoal rounded-full h-[52px] items-center justify-center active:opacity-85"
              >
                <Text className="text-[15px] font-semibold text-white">
                  Done
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleUndo}
              className="mt-4 py-2 flex-row items-center justify-center gap-1.5 active:opacity-60"
            >
              <Undo2 size={15} color="#66655E" strokeWidth={2} />
              <Text className="text-[14px] font-medium text-warm-gray">
                Undo
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View className="flex-1 px-5 pt-2 pb-4 justify-between">
          {/* Top Bar & Form */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                        onPress={() => {
                          setTxType(t);
                          setFormError(null);
                        }}
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
                onPress={() => router.push({ pathname: '/scan-receipt', params: { from: 'add-transaction' } } as Href)}
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
                  {wholePart}
                </Text>
                <Text className="text-[36px] leading-[44px] font-bold text-[#8A8880]">
                  .{decPart}
                </Text>
              </View>
            </View>

            {txType === 'transfer' ? (
              /* Transfer Wallet Selectors */
              <View className="mt-4 bg-white border border-warm-border rounded-3xl p-4 gap-3">
                <Pressable
                  onPress={cycleFromWallet}
                  className="flex-row items-center justify-between bg-[#F3F2EC] rounded-2xl px-3.5 py-3 active:opacity-80"
                >
                  <View>
                    <Text className="text-[11.5px] text-warm-gray">From wallet</Text>
                    <Text className="text-[15px] font-semibold text-charcoal mt-0.5">
                      {selectedWallet?.name ?? 'No wallet'}
                    </Text>
                  </View>
                  <Text className="text-[13.5px] font-medium text-warm-gray">
                    {formatMoney(selectedWallet?.balance ?? 0, sym)}
                  </Text>
                </Pressable>

                <View className="items-center -my-1">
                  <ArrowLeftRight size={16} color="#66655E" strokeWidth={2} />
                </View>

                <Pressable
                  onPress={cycleToWallet}
                  className="flex-row items-center justify-between bg-[#F3F2EC] rounded-2xl px-3.5 py-3 active:opacity-80"
                >
                  <View>
                    <Text className="text-[11.5px] text-warm-gray">To wallet</Text>
                    <Text className="text-[15px] font-semibold text-charcoal mt-0.5">
                      {destinationWallet?.name ?? 'Add a second wallet'}
                    </Text>
                  </View>
                  {destinationWallet ? (
                    <Text className="text-[13.5px] font-medium text-warm-gray">
                      {formatMoney(destinationWallet.balance, sym)}
                    </Text>
                  ) : null}
                </Pressable>
              </View>
            ) : (
              <>
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
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    returnKeyType="done"
                    placeholder={
                      txType === 'income'
                        ? 'e.g. salary 25000 today'
                        : 'e.g. lunch 180 yesterday'
                    }
                    placeholderTextColor="#8A8880"
                    className="mt-2.5 bg-[#F3F2EC] rounded-2xl px-3.5 py-2.5 text-[14.5px] text-charcoal"
                  />

                  <View className="flex-row items-center gap-2 mt-2.5">
                    <View className="bg-nox-lime rounded-full px-3 py-1">
                      <Text className="text-[12.5px] font-semibold text-charcoal">
                        {effectiveCategory}
                      </Text>
                    </View>
                    <View className="bg-[#F3F2EC] rounded-full px-3 py-1">
                      <Text className="text-[12.5px] font-medium text-charcoal">
                        {formatMoney(numericAmount, sym)}
                      </Text>
                    </View>
                    <View className="bg-[#F3F2EC] rounded-full px-3 py-1">
                      <Text className="text-[12.5px] font-medium text-charcoal">
                        {formatShortDate(txDate, today)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Category Pills */}
                <View className="flex-row flex-wrap gap-2 mt-4">
                  {activeCategoryNames.map((cat) => {
                    const active = effectiveCategory === cat;
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
                  <Pressable
                    onPress={() =>
                      setDateLabel((prev) =>
                        prev === 'Yesterday' ? 'Today' : 'Yesterday'
                      )
                    }
                    className="flex-row items-center gap-1.5 bg-[#EFECE4] rounded-xl px-3 py-2 active:opacity-75"
                  >
                    <Calendar size={14} color="#66655E" strokeWidth={2} />
                    <Text className="text-[12.5px] font-medium text-charcoal">
                      {dateLabel}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={cycleFromWallet}
                    className="flex-row items-center gap-1.5 bg-[#EFECE4] rounded-xl px-3 py-2 active:opacity-75"
                  >
                    <Wallet size={14} color="#66655E" strokeWidth={2} />
                    <Text className="text-[12.5px] font-medium text-charcoal">
                      {selectedWallet?.name ?? 'Wallet'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowNoteInput((prev) => !prev)}
                    className={`flex-row items-center gap-1.5 rounded-xl px-3 py-2 active:opacity-75 ${
                      showNoteInput || note ? 'bg-nox-lime' : 'bg-[#EFECE4]'
                    }`}
                  >
                    <Pencil size={14} color="#141413" strokeWidth={2} />
                    <Text className="text-[12.5px] font-medium text-charcoal">
                      {note ? 'Note added' : 'Note'}
                    </Text>
                  </Pressable>
                </View>

                {showNoteInput ? (
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    returnKeyType="done"
                    placeholder="Add a short note..."
                    placeholderTextColor="#8A8880"
                    className="mt-2.5 bg-white border border-warm-border rounded-2xl px-3.5 py-2.5 text-[13.5px] text-charcoal"
                  />
                ) : null}
              </>
            )}

            {formError ? (
              <Text className="mt-2.5 text-center text-[13px] font-semibold text-[#B85318]">
                {formError}
              </Text>
            ) : null}
          </ScrollView>

          {/* Numeric Keypad & Save CTA */}
          <View>
            {!hideCustomKeypad ? (
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
            ) : null}

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
