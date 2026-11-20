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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Bell, Check, ChevronLeft, Plus, X } from 'lucide-react-native';
import {
  describeBillDue,
  getBillStatus,
  useBudget,
} from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { monthShort } from '@/lib/dates';

export default function RecurringBillsScreen() {
  const { selectedCurrency } = useOnboarding();
  const { today, bills, addBill, markBillPaid } = useBudget();
  const sym = selectedCurrency.symbol;

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('30');
  const [wallet, setWallet] = useState('E-wallet');

  const statuses = bills.map((bill) => getBillStatus(bill, today));
  const paidTotal = statuses
    .filter((s) => s.paid)
    .reduce((sum, s) => sum + s.bill.amount, 0);
  const dueStatuses = statuses.filter((s) => !s.paid);
  const dueTotal = dueStatuses.reduce((sum, s) => sum + s.bill.amount, 0);
  const totalThisMonth = paidTotal + dueTotal;
  const paidPct =
    totalThisMonth > 0 ? Math.round((paidTotal / totalThisMonth) * 100) : 0;

  const handleAddBill = () => {
    const trimmed = title.trim();
    const amt = parseFloat(amount) || 0;
    const dueDay = Math.min(31, Math.max(1, parseInt(day, 10) || 1));
    if (!trimmed || amt <= 0) return;
    addBill({
      title: trimmed,
      wallet,
      amount: amt,
      dueDay,
    });
    setTitle('');
    setAmount('');
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
              onPress={() => setShowAddModal(true)}
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
          <View className="bg-white border border-warm-border rounded-3xl px-4">
            {statuses.map((status, idx) => {
              const { bill, dueDate, paid } = status;
              return (
                <View
                  key={bill.id}
                  className={`flex-row items-center justify-between py-3.5 ${
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
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom Reminder Note */}
        <View className="flex-row items-center gap-2.5 pt-4">
          <Bell size={16} color="#8A8880" strokeWidth={2} />
          <Text className="flex-1 text-[12.5px] text-warm-gray">
            Reminders come 2 days before, even with no signal.
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
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-cream rounded-t-3xl p-6 pb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[18px] font-bold text-charcoal">
                New recurring bill
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

            <View className="flex-row gap-2 mb-5">
              {['Cash wallet', 'E-wallet', 'Bank savings'].map((w) => (
                <Pressable
                  key={w}
                  onPress={() => setWallet(w)}
                  className={`flex-1 py-2.5 rounded-xl items-center border ${
                    wallet === w
                      ? 'bg-charcoal border-charcoal'
                      : 'bg-white border-warm-border'
                  }`}
                >
                  <Text
                    className={`text-[12px] font-semibold ${
                      wallet === w ? 'text-white' : 'text-charcoal'
                    }`}
                  >
                    {w}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleAddBill}
              className="bg-charcoal rounded-full h-12 items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[15px] font-semibold">
                Save bill
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
