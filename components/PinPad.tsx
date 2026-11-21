import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Delete, Fingerprint } from 'lucide-react-native';
import { PIN_LENGTH } from '@/lib/appLock';

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['bio', '0', 'back'],
];

interface PinPadProps {
  title: string;
  subtitle: string;
  /** Shown in place of the subtitle, e.g. "Wrong PIN". */
  error?: string | null;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  /** Return false to reject the PIN: the dots shake and clear. */
  onComplete: (pin: string) => boolean | Promise<boolean>;
  onBiometric?: () => void;
  /** Disables numeric PIN input (e.g. during brute-force lockout). */
  disabled?: boolean;
}

/** To clear the entered digits between steps, give the PinPad a new `key`. */

export function PinPad({
  title,
  subtitle,
  error,
  header,
  footer,
  onComplete,
  onBiometric,
  disabled = false,
}: PinPadProps) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const shake = useSharedValue(0);
  const dotsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const reject = () => {
    shake.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 })
      )
    );
    setPin('');
  };

  const handlePress = async (key: string) => {
    if (busy) return;
    if (key === 'bio') {
      onBiometric?.();
      return;
    }
    if (disabled) return;
    if (key === 'back') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (pin.length >= PIN_LENGTH) return;
    const next = `${pin}${key}`;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setBusy(true);
      // Let the last dot fill before checking.
      await new Promise((r) => setTimeout(r, 120));
      const ok = await onComplete(next);
      setBusy(false);
      if (!ok) reject();
    }
  };

  return (
    <View className="flex-1 px-7 justify-between pt-14 pb-8">
      <View className="items-center">
        {header}
        <Text className="mt-5 text-[24px] font-bold tracking-tight text-charcoal text-center">
          {title}
        </Text>
        <Text
          style={error ? { color: '#C2410C' } : undefined}
          className={`mt-1.5 text-[14.5px] text-center ${
            error ? 'font-semibold' : 'text-warm-gray'
          }`}
        >
          {error || subtitle}
        </Text>

        <Animated.View style={dotsStyle} className="flex-row gap-4 mt-7">
          {Array.from({ length: PIN_LENGTH }, (_, idx) => (
            <View
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border-[1.75px] border-charcoal ${
                idx < pin.length ? 'bg-charcoal' : 'bg-transparent'
              }`}
            />
          ))}
        </Animated.View>
      </View>

      <View>
        <View className="gap-3">
          {KEYPAD_ROWS.map((row, rIdx) => (
            <View key={rIdx} className="flex-row gap-3">
              {row.map((key) => {
                if (key === 'bio') {
                  return onBiometric ? (
                    <Pressable
                      accessibilityRole="button"
                      key={key}
                      onPress={() => handlePress(key)}
                      accessibilityLabel="Use biometrics"
                      className="flex-1 h-16 items-center justify-center active:opacity-60"
                    >
                      <Fingerprint size={26} color="#141413" strokeWidth={1.75} />
                    </Pressable>
                  ) : (
                    <View key={key} className="flex-1 h-16" />
                  );
                }
                if (key === 'back') {
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={key}
                      disabled={disabled}
                      onPress={() => handlePress(key)}
                      accessibilityLabel="Backspace"
                      className={`flex-1 h-16 items-center justify-center active:opacity-60 ${
                        disabled ? 'opacity-35' : ''
                      }`}
                    >
                      <Delete size={24} color="#141413" strokeWidth={1.8} />
                    </Pressable>
                  );
                }
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={key}
                    disabled={disabled}
                    onPress={() => handlePress(key)}
                    className={`flex-1 h-16 rounded-2xl bg-white items-center justify-center active:bg-[#EAE8E1] ${
                      disabled ? 'opacity-40' : ''
                    }`}
                  >
                    <Text className="text-[24px] font-semibold text-charcoal">{key}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        {footer}
      </View>
    </View>
  );
}
