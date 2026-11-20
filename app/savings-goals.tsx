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
import { ChevronLeft, Plus, X } from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';

export default function SavingsGoalsScreen() {
  const { selectedCurrency } = useOnboarding();
  const { goals, addGoal, contributeToGoal } = useBudget();
  const sym = selectedCurrency.symbol;

  const [showNewModal, setShowNewModal] = useState(false);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [subtitle, setSubtitle] = useState('');

  const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0);

  const handleCreateGoal = () => {
    const trimmed = title.trim();
    const targetAmt = parseFloat(target) || 0;
    if (!trimmed || targetAmt <= 0) return;
    addGoal({
      title: trimmed,
      subtitle: subtitle.trim() || 'No deadline',
      saved: 0,
      target: targetAmt,
    });
    setTitle('');
    setTarget('');
    setSubtitle('');
    setShowNewModal(false);
  };

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
                Savings goals
              </Text>
            </View>

            <Pressable
              onPress={() => setShowNewModal(true)}
              className="flex-row items-center gap-1.5 bg-charcoal rounded-full px-4 py-2.5 active:opacity-85"
            >
              <Plus size={15} color="#FFFFFF" strokeWidth={2.3} />
              <Text className="text-[13.5px] font-semibold text-white">New</Text>
            </Pressable>
          </View>

          {/* Total Saved */}
          <Text className="text-[13.5px] text-warm-gray">
            Saved across {goals.length} goals
          </Text>
          <Text className="mt-1 mb-5 text-[34px] leading-[40px] font-bold tracking-tight text-charcoal">
            {sym}
            {totalSaved.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>

          {/* Goal Cards */}
          <View className="gap-3.5">
            {goals.map((goal, idx) => {
              const pct =
                goal.target > 0
                  ? Math.min(100, Math.round((goal.saved / goal.target) * 100))
                  : 0;

              return (
                <Animated.View
                  key={goal.id}
                  entering={FadeInDown.delay(idx * 60).duration(260)}
                  className="bg-white border border-warm-border rounded-3xl p-4"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-[16px] font-bold text-charcoal">
                        {goal.title}
                      </Text>
                      <Text className="text-[12.5px] text-warm-gray mt-0.5">
                        {goal.subtitle}
                      </Text>
                    </View>
                    <View className="bg-[#F3F2EC] rounded-xl px-2.5 py-1">
                      <Text className="text-[12.5px] font-bold text-charcoal">
                        {pct}%
                      </Text>
                    </View>
                  </View>

                  <View className="h-[6px] rounded-full bg-[#ECEAE2] mt-3.5 overflow-hidden">
                    <View
                      style={{ width: `${pct}%` }}
                      className="h-full rounded-full bg-charcoal"
                    />
                  </View>

                  <View className="flex-row items-center justify-between mt-3.5">
                    <Text className="text-[14px]">
                      <Text className="font-bold text-charcoal">
                        {sym}
                        {goal.saved.toLocaleString('en-US')}
                      </Text>
                      <Text className="text-warm-gray">
                        {' '}
                        of {sym}
                        {goal.target.toLocaleString('en-US')}
                      </Text>
                    </Text>

                    <Pressable
                      onPress={() => contributeToGoal(goal.id, 500)}
                      className="bg-white border border-warm-border rounded-full px-3.5 py-1.5 active:bg-cream"
                    >
                      <Text className="text-[13px] font-semibold text-charcoal">
                        + {sym}500
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom Nox Banner */}
        <View className="mt-4 bg-charcoal rounded-3xl p-4 flex-row items-center gap-3">
          <NoxMiniIcon size={32} />
          <Text className="flex-1 text-[13.5px] leading-[18px] text-white/95">
            Move what&apos;s left of November into Laptop on Dec 1?
          </Text>
          <Pressable
            onPress={() => contributeToGoal('g1', 1000)}
            className="bg-nox-lime rounded-2xl px-4 py-2.5 active:opacity-80"
          >
            <Text className="text-[14px] font-bold text-charcoal">Yes</Text>
          </Pressable>
        </View>
      </View>

      {/* New Goal Modal */}
      <Modal
        visible={showNewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-cream rounded-t-3xl p-6 pb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[18px] font-bold text-charcoal">
                New savings goal
              </Text>
              <Pressable onPress={() => setShowNewModal(false)}>
                <X size={20} color="#141413" />
              </Pressable>
            </View>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Goal name (e.g. Japan trip)"
              placeholderTextColor="#8A8880"
              className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal mb-3"
            />
            <TextInput
              value={target}
              onChangeText={setTarget}
              keyboardType="numeric"
              placeholder={`Target amount (${sym}15,000)`}
              placeholderTextColor="#8A8880"
              className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal mb-3"
            />
            <TextInput
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="Deadline or note (optional)"
              placeholderTextColor="#8A8880"
              className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal mb-5"
            />

            <Pressable
              onPress={handleCreateGoal}
              className="bg-charcoal rounded-full h-12 items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[15px] font-semibold">
                Create goal
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
