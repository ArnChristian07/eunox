import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Delete, Fingerprint } from 'lucide-react-native';
import { NoxSleepingMascot } from '@/components/NoxMascot';

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['bio', '0', 'back'],
];

export default function LockScreen() {
  const [pin, setPin] = useState('');

  const handlePress = (key: string) => {
    if (key === 'bio') {
      router.back();
      return;
    }
    if (key === 'back') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (pin.length >= 4) return;
    const next = `${pin}${key}`;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        router.back();
      }, 150);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 px-7 justify-between pt-14 pb-8">
        {/* Top Mascot & PIN Dots */}
        <View className="items-center">
          <NoxSleepingMascot size={78} />

          <Text className="mt-5 text-[24px] font-bold tracking-tight text-charcoal">
            Eunox is locked
          </Text>
          <Text className="mt-1.5 text-[14.5px] text-warm-gray">
            Enter your 4-digit PIN
          </Text>

          <View className="flex-row gap-4 mt-7">
            {[0, 1, 2, 3].map((idx) => {
              const filled = idx < pin.length;
              return (
                <View
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border-[1.75px] border-charcoal ${
                    filled ? 'bg-charcoal' : 'bg-transparent'
                  }`}
                />
              );
            })}
          </View>
        </View>

        {/* Numeric Keypad */}
        <View>
          <View className="gap-3">
            {KEYPAD_ROWS.map((row, rIdx) => (
              <View key={rIdx} className="flex-row gap-3">
                {row.map((key) => {
                  if (key === 'bio') {
                    return (
                      <Pressable
                        key={key}
                        onPress={() => handlePress(key)}
                        accessibilityLabel="Use biometrics"
                        className="flex-1 h-16 items-center justify-center active:opacity-60"
                      >
                        <Fingerprint size={26} color="#141413" strokeWidth={1.75} />
                      </Pressable>
                    );
                  }
                  if (key === 'back') {
                    return (
                      <Pressable
                        key={key}
                        onPress={() => handlePress(key)}
                        accessibilityLabel="Backspace"
                        className="flex-1 h-16 items-center justify-center active:opacity-60"
                      >
                        <Delete size={24} color="#141413" strokeWidth={1.8} />
                      </Pressable>
                    );
                  }
                  return (
                    <Pressable
                      key={key}
                      onPress={() => handlePress(key)}
                      className="flex-1 h-16 rounded-2xl bg-white items-center justify-center active:bg-[#EAE8E1]"
                    >
                      <Text className="text-[24px] font-semibold text-charcoal">
                        {key}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <Pressable
            onPress={() =>
              Alert.alert(
                'Forgot PIN?',
                'Use your device fingerprint or restore from an encrypted backup file.'
              )
            }
            className="mt-7 py-2 items-center active:opacity-60"
          >
            <Text className="text-[14.5px] font-semibold text-charcoal">
              Forgot PIN?
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
