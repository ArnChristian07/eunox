import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { ArrowUp, History, Square } from 'lucide-react-native';
import { NoxMiniIcon, NoxThinkingIcon } from '@/components/NoxMascot';
import { useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { answerQuestion, NoxReply } from '@/lib/nox';

interface ChatMessage extends Partial<NoxReply> {
  id: string;
  sender: 'user' | 'nox';
  text: string;
}

const SUGGESTIONS = [
  'How much do I have left?',
  'Where can I cut back?',
  'Compare to last month',
];

function PulsingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.35, { duration: 400 })
        ),
        -1,
        true
      )
    );
  }, [delay, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={animStyle}
      className="w-2 h-2 rounded-full bg-[#8A8880]"
    />
  );
}

export default function NoxChatScreen() {
  const { selectedCurrency } = useOnboarding();
  const budget = useBudget();
  const { period, periodTransactions, addGoal } = budget;
  const sym = selectedCurrency.symbol;

  const nextIdRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [savedGoalMessageIds, setSavedGoalMessageIds] = useState<string[]>([]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const stopThinking = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsThinking(false);
  };

  const sendMessage = (textToSend?: string) => {
    if (isThinking) return;
    const trimmed = (textToSend ?? input).trim();
    if (!trimmed) return;

    const userId = nextIdRef.current++;
    const noxId = nextIdRef.current++;

    const userMsg: ChatMessage = {
      id: `u-${userId}`,
      sender: 'user',
      text: trimmed,
    };
    const reply = answerQuestion(trimmed, { sym, ...budget });

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsThinking(true);

    timerRef.current = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `n-${noxId}`, sender: 'nox', ...reply },
      ]);
      setIsThinking(false);
      timerRef.current = null;
    }, 600);
  };

  const handleSaveGoal = (msg: ChatMessage) => {
    if (!msg.goal) return;
    if (savedGoalMessageIds.includes(msg.id)) {
      router.push('/savings-goals' as never);
      return;
    }
    addGoal({
      title: msg.goal.title,
      subtitle: 'From your chat with Nox',
      saved: 0,
      target: msg.goal.target,
    });
    setSavedGoalMessageIds((prev) => [...prev, msg.id]);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-cream">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
          <View className="flex-row items-center gap-3">
            {isThinking ? (
              <NoxThinkingIcon size={38} />
            ) : (
              <NoxMiniIcon size={38} />
            )}
            <View>
              <Text className="text-[22px] font-bold tracking-tight text-charcoal">
                Nox
              </Text>
              <View className="flex-row items-center gap-1.5">
                {!isThinking ? (
                  <View className="w-2 h-2 rounded-full bg-[#4D8C2B]" />
                ) : null}
                <Text className="text-[12.5px] text-warm-gray">
                  {isThinking
                    ? 'Thinking on your phone...'
                    : 'On-device · works offline'}
                </Text>
              </View>
            </View>
          </View>

          {!isThinking && messages.length > 0 ? (
            <Pressable
              onPress={() => setMessages([])}
              accessibilityLabel="New chat"
              className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
            >
              <History size={19} color="#141413" strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        {/* Messages */}
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingVertical: 10, gap: 12, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && !isThinking ? (
            <View className="flex-1 items-center justify-center px-6">
              <NoxMiniIcon size={56} />
              <Text className="mt-4 text-[18px] font-bold text-charcoal">
                Ask Nox about your money
              </Text>
              <Text className="mt-2 text-center text-[14px] leading-[20px] text-warm-gray">
                Nox answers from the transactions on this phone. Nothing is sent
                anywhere.
              </Text>
            </View>
          ) : null}

          {messages.map((msg) =>
            msg.sender === 'user' ? (
              <Animated.View
                key={msg.id}
                entering={FadeInDown.duration(220)}
                className="items-end"
              >
                <View className="bg-charcoal rounded-3xl rounded-br-md px-4 py-3 max-w-[82%]">
                  <Text className="text-[14.5px] leading-[20px] text-white">
                    {msg.text}
                  </Text>
                </View>
              </Animated.View>
            ) : (
              <Animated.View
                key={msg.id}
                entering={FadeInDown.duration(260)}
                className="bg-white border border-warm-border rounded-3xl p-4"
              >
                <Text className="text-[14.5px] leading-[20px] text-charcoal">
                  {msg.text}
                </Text>

                {msg.breakdown ? (
                  <View className="mt-3.5 gap-3">
                    {msg.breakdown.map((row) => (
                      <View key={row.label}>
                        <View className="flex-row items-center justify-between mb-1.5">
                          <Text className="text-[13.5px] text-charcoal">
                            {row.label}
                          </Text>
                          <Text className="text-[13.5px] font-bold text-charcoal">
                            {row.amount}
                          </Text>
                        </View>
                        <View className="h-[5px] rounded-full bg-[#ECEAE2] overflow-hidden">
                          <View
                            style={{ width: `${Math.round(row.ratio * 100)}%` }}
                            className="h-full rounded-full bg-charcoal"
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                {msg.goal ? (
                  <View className="flex-row gap-2.5 mt-4">
                    <Pressable
                      onPress={() => handleSaveGoal(msg)}
                      className={`rounded-2xl px-4 py-2.5 ${
                        savedGoalMessageIds.includes(msg.id)
                          ? 'bg-white border border-warm-border'
                          : 'bg-nox-lime'
                      }`}
                    >
                      <Text className="text-[13.5px] font-semibold text-charcoal">
                        {savedGoalMessageIds.includes(msg.id)
                          ? 'View in goals'
                          : `Save for ${msg.goal.title}`}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </Animated.View>
            )
          )}

          {/* Thinking Skeleton Bubble */}
          {isThinking ? (
            <Animated.View
              entering={FadeInDown.duration(200)}
              className="bg-white border border-warm-border rounded-3xl p-4 max-w-[85%]"
            >
              <View className="flex-row gap-1.5 mb-3">
                <PulsingDot delay={0} />
                <PulsingDot delay={150} />
                <PulsingDot delay={300} />
              </View>
              <View className="h-3 rounded-full bg-[#EAE8E1] w-full mb-2" />
              <View className="h-3 rounded-full bg-[#EAE8E1] w-2/3 mb-3" />
              <Text className="text-[12px] text-warm-gray">
                Reading {periodTransactions.length}{' '}
                {periodTransactions.length === 1 ? 'transaction' : 'transactions'}{' '}
                from {period.label}
              </Text>
            </Animated.View>
          ) : null}
        </ScrollView>

        {/* Suggestions & Input */}
        <View className="px-5 pt-2 pb-2">
          {!isThinking ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
            >
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => sendMessage(s)}
                  className="bg-white border border-warm-border rounded-full px-3.5 py-2 active:opacity-75"
                >
                  <Text className="text-[13px] font-medium text-charcoal">
                    {s}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View className="flex-row items-center gap-2.5">
            <View className="flex-1 bg-white border border-warm-border rounded-full px-4 h-12 justify-center">
              <TextInput
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => sendMessage()}
                editable={!isThinking}
                placeholder={
                  isThinking
                    ? 'Nox is answering...'
                    : 'Ask about your money...'
                }
                placeholderTextColor="#8A8880"
                className="text-[15px] text-charcoal"
              />
            </View>
            <Pressable
              onPress={isThinking ? stopThinking : () => sendMessage()}
              accessibilityLabel={isThinking ? 'Stop answering' : 'Send message'}
              className="w-12 h-12 rounded-2xl bg-charcoal items-center justify-center active:opacity-85"
            >
              {isThinking ? (
                <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <ArrowUp size={20} color="#FFFFFF" strokeWidth={2.2} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
