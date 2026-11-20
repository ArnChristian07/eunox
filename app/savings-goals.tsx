import React, { useState } from 'react';
import {
  Alert,
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
import { ChevronLeft, PiggyBank, Plus, Trash2, X } from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { SavingsGoal, useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { formatMoney, parseAmount } from '@/lib/format';

type Sheet =
  | { kind: 'new' }
  | { kind: 'edit'; goal: SavingsGoal }
  | { kind: 'money'; goal: SavingsGoal };

const QUICK_AMOUNTS = [100, 500, 1000];

export default function SavingsGoalsScreen() {
  const { selectedCurrency } = useOnboarding();
  const {
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    contributeToGoal,
    leftToSpend,
    daysLeft,
    period,
  } = useBudget();
  const sym = selectedCurrency.symbol;

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0);

  // Near the end of the period, offer to move what's left into the goal
  // that is closest to done.
  const openGoals = goals
    .filter((g) => g.saved < g.target)
    .sort((a, b) => b.saved / b.target - a.saved / a.target);
  const suggestedGoal = openGoals[0];
  const suggestedAmount = suggestedGoal
    ? Math.floor(Math.min(leftToSpend, suggestedGoal.target - suggestedGoal.saved))
    : 0;
  const showSuggestion =
    !suggestionDismissed && daysLeft <= 5 && suggestedGoal && suggestedAmount > 0;

  const openSheet = (next: Sheet) => {
    setError(null);
    setAmount('');
    if (next.kind === 'edit') {
      setTitle(next.goal.title);
      setTarget(String(next.goal.target));
      setSubtitle(next.goal.subtitle === 'No deadline' ? '' : next.goal.subtitle);
    } else if (next.kind === 'new') {
      setTitle('');
      setTarget('');
      setSubtitle('');
    }
    setSheet(next);
  };

  const handleSaveGoal = () => {
    const trimmed = title.trim();
    const targetAmt = parseAmount(target);
    if (!trimmed) return setError('Give the goal a name');
    if (targetAmt <= 0) return setError('Enter a target amount');
    if (sheet?.kind === 'edit') {
      updateGoal(sheet.goal.id, {
        title: trimmed,
        subtitle: subtitle.trim() || 'No deadline',
        target: targetAmt,
        saved: Math.min(sheet.goal.saved, targetAmt),
      });
    } else {
      addGoal({
        title: trimmed,
        subtitle: subtitle.trim() || 'No deadline',
        saved: 0,
        target: targetAmt,
      });
    }
    setSheet(null);
  };

  const handleMoney = (direction: 1 | -1) => {
    if (sheet?.kind !== 'money') return;
    const amt = parseAmount(amount);
    if (amt <= 0) return setError('Enter an amount');
    if (direction === -1 && amt > sheet.goal.saved) {
      return setError(`Only ${formatMoney(sheet.goal.saved, sym)} is saved here`);
    }
    contributeToGoal(sheet.goal.id, direction * amt);
    setSheet(null);
  };

  const handleDeleteGoal = () => {
    if (sheet?.kind !== 'edit') return;
    const goal = sheet.goal;
    Alert.alert(`Delete ${goal.title}?`, 'Its progress will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteGoal(goal.id);
          setSheet(null);
        },
      },
    ]);
  };

  const sheetGoal = sheet && sheet.kind !== 'new' ? sheet.goal : null;

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
              onPress={() => openSheet({ kind: 'new' })}
              className="flex-row items-center gap-1.5 bg-charcoal rounded-full px-4 py-2.5 active:opacity-85"
            >
              <Plus size={15} color="#FFFFFF" strokeWidth={2.3} />
              <Text className="text-[13.5px] font-semibold text-white">New</Text>
            </Pressable>
          </View>

          {goals.length === 0 ? (
            <View className="mt-6 bg-white border border-warm-border rounded-3xl p-6 items-center">
              <View className="w-12 h-12 rounded-2xl bg-[#F3F2EC] items-center justify-center">
                <PiggyBank size={22} color="#141413" strokeWidth={1.9} />
              </View>
              <Text className="mt-3 text-[16px] font-bold text-charcoal">
                Save for something
              </Text>
              <Text className="mt-1 text-[13px] leading-[18px] text-warm-gray text-center">
                A trip, a laptop, an emergency fund. Add a goal and put money
                aside whenever you can.
              </Text>
              <Pressable
                onPress={() => openSheet({ kind: 'new' })}
                className="mt-4 bg-charcoal rounded-full px-5 h-11 items-center justify-center active:opacity-85"
              >
                <Text className="text-white text-[14px] font-semibold">Add a goal</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Total Saved */}
              <Text className="text-[13.5px] text-warm-gray">
                Saved across {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
              </Text>
              <Text className="mt-1 mb-5 text-[34px] leading-[40px] font-bold tracking-tight text-charcoal">
                {formatMoney(totalSaved, sym)}
              </Text>

              {/* Goal Cards */}
              <View className="gap-3.5">
                {goals.map((goal, idx) => {
                  const pct =
                    goal.target > 0
                      ? Math.min(100, Math.round((goal.saved / goal.target) * 100))
                      : 0;
                  const done = goal.saved >= goal.target;

                  return (
                    <Animated.View
                      key={goal.id}
                      entering={FadeInDown.delay(idx * 60).duration(260)}
                    >
                      <Pressable
                        onPress={() => openSheet({ kind: 'edit', goal })}
                        className="bg-white border border-warm-border rounded-3xl p-4 active:opacity-90"
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
                          <View
                            className={`rounded-xl px-2.5 py-1 ${
                              done ? 'bg-nox-lime' : 'bg-[#F3F2EC]'
                            }`}
                          >
                            <Text className="text-[12.5px] font-bold text-charcoal">
                              {done ? 'Done' : `${pct}%`}
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
                              {formatMoney(goal.saved, sym, 0)}
                            </Text>
                            <Text className="text-warm-gray">
                              {' '}
                              of {formatMoney(goal.target, sym, 0)}
                            </Text>
                          </Text>

                          <Pressable
                            onPress={() => openSheet({ kind: 'money', goal })}
                            className="bg-white border border-warm-border rounded-full px-3.5 py-1.5 active:bg-cream"
                          >
                            <Text className="text-[13px] font-semibold text-charcoal">
                              {done ? 'Adjust' : '+ Add money'}
                            </Text>
                          </Pressable>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>

        {/* Nox Suggestion */}
        {showSuggestion && suggestedGoal ? (
          <View className="mt-4 bg-charcoal rounded-3xl p-4 flex-row items-center gap-3">
            <NoxMiniIcon size={32} />
            <Text className="flex-1 text-[13.5px] leading-[18px] text-white/95">
              {daysLeft === 1 ? 'Last day' : `${daysLeft} days left`} in{' '}
              {period.label}. Move {formatMoney(suggestedAmount, sym, 0)} you
              haven&apos;t spent into {suggestedGoal.title}?
            </Text>
            <View className="gap-1.5">
              <Pressable
                onPress={() => {
                  contributeToGoal(suggestedGoal.id, suggestedAmount);
                  setSuggestionDismissed(true);
                }}
                className="bg-nox-lime rounded-2xl px-4 py-2 active:opacity-80"
              >
                <Text className="text-[14px] font-bold text-charcoal">Yes</Text>
              </Pressable>
              <Pressable
                onPress={() => setSuggestionDismissed(true)}
                className="px-4 py-1 items-center active:opacity-70"
              >
                <Text className="text-[12.5px] font-semibold text-white/70">Not now</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {/* Goal Sheet */}
      <Modal
        visible={sheet !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-cream rounded-t-3xl p-6 pb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[18px] font-bold text-charcoal flex-1 pr-2" numberOfLines={1}>
                {sheet?.kind === 'new'
                  ? 'New savings goal'
                  : sheet?.kind === 'edit'
                    ? 'Edit goal'
                    : sheetGoal?.title}
              </Text>
              <Pressable onPress={() => setSheet(null)} accessibilityLabel="Close">
                <X size={20} color="#141413" />
              </Pressable>
            </View>

            {sheet?.kind === 'money' && sheetGoal ? (
              <>
                <Text className="text-[13px] text-warm-gray mb-3">
                  {formatMoney(sheetGoal.saved, sym)} saved ·{' '}
                  {formatMoney(Math.max(0, sheetGoal.target - sheetGoal.saved), sym)} to go
                </Text>
                <View className="flex-row items-center bg-white border border-warm-border rounded-2xl px-4 h-12 mb-3">
                  <Text className="text-[16px] font-bold text-charcoal mr-1">{sym}</Text>
                  <TextInput
                    value={amount}
                    onChangeText={(v) => {
                      setAmount(v);
                      setError(null);
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#8A8880"
                    autoFocus
                    className="flex-1 text-[16px] font-semibold text-charcoal"
                  />
                </View>
                <View className="flex-row gap-2 mb-4">
                  {QUICK_AMOUNTS.map((q) => (
                    <Pressable
                      key={q}
                      onPress={() => setAmount(String(q))}
                      className="flex-1 py-2 rounded-xl items-center bg-white border border-warm-border active:bg-[#EAE8E1]"
                    >
                      <Text className="text-[13px] font-semibold text-charcoal">
                        {formatMoney(q, sym, 0)}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() =>
                      setAmount(String(Math.max(0, sheetGoal.target - sheetGoal.saved)))
                    }
                    className="flex-1 py-2 rounded-xl items-center bg-white border border-warm-border active:bg-[#EAE8E1]"
                  >
                    <Text className="text-[13px] font-semibold text-charcoal">Rest</Text>
                  </Pressable>
                </View>
                {error ? (
                  <Text className="mb-3 text-[13px] font-semibold text-[#B85318]">{error}</Text>
                ) : null}
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => handleMoney(-1)}
                    disabled={sheetGoal.saved <= 0}
                    className={`flex-1 h-12 rounded-full items-center justify-center bg-white border border-warm-border active:opacity-75 ${
                      sheetGoal.saved <= 0 ? 'opacity-40' : ''
                    }`}
                  >
                    <Text className="text-[15px] font-semibold text-charcoal">Take out</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleMoney(1)}
                    className="flex-1 h-12 rounded-full items-center justify-center bg-charcoal active:opacity-85"
                  >
                    <Text className="text-[15px] font-semibold text-white">Add</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <TextInput
                  value={title}
                  onChangeText={(v) => {
                    setTitle(v);
                    setError(null);
                  }}
                  placeholder="Goal name (e.g. Japan trip)"
                  placeholderTextColor="#8A8880"
                  className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal mb-3"
                />
                <TextInput
                  value={target}
                  onChangeText={(v) => {
                    setTarget(v);
                    setError(null);
                  }}
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
                  className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal mb-4"
                />
                {error ? (
                  <Text className="mb-3 text-[13px] font-semibold text-[#B85318]">{error}</Text>
                ) : null}
                <Pressable
                  onPress={handleSaveGoal}
                  className="bg-charcoal rounded-full h-12 items-center justify-center active:opacity-85"
                >
                  <Text className="text-white text-[15px] font-semibold">
                    {sheet?.kind === 'edit' ? 'Save changes' : 'Create goal'}
                  </Text>
                </Pressable>
                {sheet?.kind === 'edit' ? (
                  <Pressable
                    onPress={handleDeleteGoal}
                    className="mt-3 h-11 flex-row items-center justify-center gap-2 active:opacity-70"
                  >
                    <Trash2 size={16} color="#B85318" strokeWidth={2} />
                    <Text className="text-[15px] font-semibold text-[#B85318]">
                      Delete goal
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
