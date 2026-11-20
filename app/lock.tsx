import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { NoxSleepingMascot } from '@/components/NoxMascot';
import { PinPad } from '@/components/PinPad';
import { useLock } from '@/context/LockContext';

type Step = 'current' | 'new' | 'confirm';

const COPY: Record<Step, { title: string; subtitle: string }> = {
  current: { title: 'Enter current PIN', subtitle: 'To change your app lock PIN' },
  new: { title: 'Choose a PIN', subtitle: "4 digits you'll use to open Eunox" },
  confirm: { title: 'Confirm your PIN', subtitle: 'Enter the same 4 digits again' },
};

/** Sets up or changes the app lock PIN. Unlocking is handled by LockOverlay. */
export default function LockSetupScreen() {
  const { enabled, verifyPin, setPin } = useLock();
  const [step, setStep] = useState<Step>(enabled ? 'current' : 'new');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (pin: string) => {
    if (step === 'current') {
      if (!verifyPin(pin)) {
        setError('Wrong PIN');
        return false;
      }
      setError(null);
      setStep('new');
      return true;
    }
    if (step === 'new') {
      setFirstPin(pin);
      setError(null);
      setStep('confirm');
      return true;
    }
    if (pin !== firstPin) {
      setError("PINs didn't match. Try again.");
      setFirstPin('');
      setStep('new');
      return false;
    }
    try {
      await setPin(pin);
      router.back();
      return true;
    } catch {
      setError("Couldn't save the PIN on this phone");
      return false;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-5 pt-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
        >
          <ChevronLeft size={20} color="#141413" strokeWidth={2} />
        </Pressable>
      </View>
      <PinPad
        key={step}
        title={COPY[step].title}
        subtitle={COPY[step].subtitle}
        error={error}
        header={<NoxSleepingMascot size={64} />}
        onComplete={handleComplete}
      />
    </SafeAreaView>
  );
}
