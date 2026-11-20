import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { CalendarClock, Check, ChevronLeft, Info, Plus, Trash2, X } from 'lucide-react-native';
import {
  describeBillDue,
  getBillStatus,
  RecurringBill,
  useBudget,
} from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { monthShort } from '@/lib/dates';
import { parseAmount } from '@/lib/format';

export default function RecurringBillsScreen() {
  const { selectedCurrency } = useOnboarding();
  const {
    today,
    bills,
    wallets,
    defaultWallet,
    addBill,
    updateBill,
    deleteBill,
    markBillPaid,
  } = useBudget();
  const sym = selectedCurrency.symbol;

  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<RecurringBill | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [wallet, setWallet] = useState('');
  const [error, setError] = useState<string | null>(null);

  const openNew = () => {
    setEditing(null);
    setTitle('');
    setAmount('');
    setDay(String(today.getDate()));
    setWallet(defaultWallet?.name ?? wallets[0]?.name ?? '');
    setError(null);
    setShowAddModal(true);
  };

  const openEdit = (bill: RecurringBill) => {
    setEditing(bill);
    setTitle(bill.title);
    setAmount(String(bill.amount));
    setDay(String(bill.dueDay));
    setWallet(bill.wallet);
    setError(null);
    setShowAddModal(true);
  };

  const handleDelete = () => {
    if (!editing) return;
    Alert.alert(
      `Delete ${editing.title}?`,
      'Payments you already marked stay in your transactions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteBill(editing.id);
            setShowAddModal(false);
          },
        },
      ]
    );
  };

  const statuses = bills
    .map((bill) => getBillStatus(bill, today))
    .sort((a, b) => Number(a.paid) - Number(b.paid) || a.daysUntilDue - b.daysUntilDue);
  const paidTotal = statuses
    .filter((s) => s.paid)
    .reduce((sum, s) => sum + s.bill.amount, 0);
  const dueStatuses = statuses.filter((s) => !s.paid);
  const dueTotal = dueStatuses.reduce((sum, s) => sum + s.bill.amount, 0);
  const totalThisMonth = paidTotal + dueTotal;
  const paidPct =
    totalThisMonth > 0 ? Math.round((paidTotal / totalThisMonth) * 100) : 0;

  const handleSaveBill = () => {
    const trimmed = title.trim();
    const amt = parseAmount(amount);
    const parsedDay = parseInt(day, 10);
    if (!trimmed) return setError('Give the bill a name');
    if (amt <= 0) return setError('Enter the amount');
    if (!(parsedDay >= 1 && parsedDay <= 31)) return setError('Due day must be 1 to 31');
    if (!wallet) return setError('Pick a wallet');
    const data = { title: trimmed, wallet, amount: amt, dueDay: parsedDay };
    if (editing) updateBill(editing.id, data);
    else addBill(data);
    setShowAddModal(false);
  };

  const monthLabel = monthShort(today).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 px-5 pb-5 justify-between">
        <ScrollView showsVerticalScrollIndicator={false}>
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
                Recurring bills
              </Text>
            </View>

            <Pressable
              onPress={openNew}
              accessibilityLabel="Add bill"
              className="w-11 h-11 rounded-2xl bg-charcoal items-center justify-center active:opacity-85"
            >
              <Plus size={20} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Hero Dark Summary */}
          <Animated.View
            entering={FadeInDown.duration(260)}
            className="bg-charcoal rounded-3xl p-5"
          >
            <Text className="text-[13px] font-medium text-[#A8A69E]">
              Still due this month
            </Text>
            <Text className="mt-1 text-[34px] leading-[40px] font-bold tracking-tight text-white">
              {sym}
              {dueTotal.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>

            <View className="h-[6px] rounded-full bg-[#30302D] mt-4 overflow-hidden">
              <View
                style={{ width: `${paidPct}%` }}
                className="h-full rounded-full bg-nox-lime"
              />
            </View>

            <Text className="mt-3 text-[12.5px] text-[#A8A69E]">
              {dueStatuses.length} bills left · {sym}
              {paidTotal.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              paid
            </Text>
          </Animated.View>

          {/* This Month */}
          <Text className="mt-5 mb-2.5 px-1 text-[13px] font-medium text-warm-gray">
            This month
          </Text>
          {statuses.length === 0 ? (
            <View className="bg-white border border-warm-border rounded-3xl p-6 items-center">
              <View className="w-12 h-12 rounded-2xl bg-[#F3F2EC] items-center justify-center">
                <CalendarClock size={22} color="#141413" strokeWidth={1.9} />
              </View>
              <Text className="mt-3 text-[16px] font-bold text-charcoal">
                No recurring bills yet
              </Text>
              <Text className="mt-1 text-[13px] leading-[18px] text-warm-gray text-center">
                Add rent, internet, phone or subscriptions to see what&apos;s
                still due each month.
              </Text>
              <Pressable
                onPress={openNew}
                className="mt-4 bg-charcoal rounded-full px-5 h-11 items-center justify-center active:opacity-85"
              >
                <Text className="text-white text-[14px] font-semibold">Add a bill</Text>
              </Pressable>
            </View>
          ) : (
          <View className="bg-white border border-warm-border rounded-3xl px-4">
            {statuses.map((status, idx) => {
              const { bill, dueDate, paid } = status;
              return (
                <Pressable
                  key={bill.id}
                  onPress={() => openEdit(bill)}
                  className={`flex-row items-center justify-between py-3.5 active:opacity-80 ${
                    idx < statuses.length - 1
                      ? 'border-b border-warm-border'
                      : ''
                  }`}
                >
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View className="w-11 h-11 rounded-2xl bg-[#F3F2EC] items-center justify-center">
                      <Text className="text-[9.5px] font-bold text-warm-gray">
                        {monthLabel}
                      </Text>
                      <Text className="text-[14px] font-bold text-charcoal -mt-0.5">
                        {dueDate.getDate()}
                      </Text>
                    </View>

                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-charcoal">
                        {bill.title}
                      </Text>
                      <Text
                        className={`text-[12.5px] mt-0.5 ${
                          paid ? 'text-warm-gray' : 'text-[#B85318]'
                        }`}
                      >
                        {describeBillDue(status)} · {bill.wallet}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-[14.5px] font-bold text-charcoal">
                      {sym}
                      {bill.amount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>

                    {paid ? (
                      <View className="flex-row items-center gap-1 mt-1">
                        <Check size={12} color="#66655E" strokeWidth={2.5} />
                        <Text className="text-[12px] text-warm-gray">Paid</Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => markBillPaid(bill.id)}
                        className="mt-1.5 bg-nox-lime rounded-xl px-3 py-1 active:opacity-80"
                      >
                        <Text className="text-[12px] font-bold text-charcoal">
                          Mark paid
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
          )}
        </ScrollView>

        {/* Bottom Note */}
        <View className="flex-row items-start gap-2.5 pt-4">
          <Info size={16} color="#8A8880" strokeWidth={2} />
          <Text className="flex-1 text-[12.5px] leading-[18px] text-warm-gray">
            Mark paid records the bill as an expense from its wallet. Tap a bill
            to edit or delete it.
          </Text>
        </View>
      </View>

      {/* Add Bill Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View className="flex-1 bg-black/40 justify-end">
            <ScrollView
              style={{ flexGrow: 0, flexShrink: 1 }}
              className="bg-cream rounded-t-3xl"
              contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[18px] font-bold text-charcoal">
                {editing ? 'Edit bill' : 'New recurring bill'}
              </Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={20} color="#141413" />
              </Pressable>
            </View>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Bill name (e.g. Water bill)"
              placeholderTextColor="#8A8880"
              className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal mb-3"
            />
            <View className="flex-row gap-3 mb-3">
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder={`Amount (${sym})`}
                placeholderTextColor="#8A8880"
                className="flex-1 bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal"
              />
              <TextInput
                value={day}
                onChangeText={setDay}
                keyboardType="numeric"
                placeholder="Day (1-31)"
                placeholderTextColor="#8A8880"
                className="w-28 bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal"
              />
            </View>

            <Text className="text-[12.5px] font-medium text-warm-gray mb-1.5">
              Paid from
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              className="mb-4 flex-grow-0"
            >
              {wallets.map((w) => {
                const active = wallet === w.name;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => setWallet(w.name)}
                    className={`px-4 py-2.5 rounded-xl items-center border ${
                      active ? 'bg-charcoal border-charcoal' : 'bg-white border-warm-border'
                    }`}
                  >
                    <Text
                      className={`text-[12.5px] font-semibold ${
                        active ? 'text-white' : 'text-charcoal'
                      }`}
                    >
                      {w.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {error ? (
              <Text className="mb-3 text-[13px] font-semibold text-[#B85318]">{error}</Text>
            ) : null}

            <Pressable
              onPress={handleSaveBill}
              className="bg-charcoal rounded-full h-12 items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[15px] font-semibold">
                {editing ? 'Save changes' : 'Save bill'}
              </Text>
            </Pressable>

            {editing ? (
              <Pressable
                onPress={handleDelete}
                className="mt-3 h-11 flex-row items-center justify-center gap-2 active:opacity-70"
              >
                <Trash2 size={16} color="#B85318" strokeWidth={2} />
                <Text className="text-[15px] font-semibold text-[#B85318]">Delete bill</Text>
              </Pressable>
            ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
