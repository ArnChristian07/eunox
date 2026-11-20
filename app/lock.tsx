import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { NoxSleepingMascot } from '@/components/NoxMascot';
import { PinPad } from '@/components/PinPad';
import { useLock } from '@/context/LockContext';
import { authenticateWithBiometrics, cancelBiometrics } from '@/lib/appLock';

type Step = 'disable' | 'current' | 'new' | 'confirm';

const COPY: Record<Step, { title: string; subtitle: string }> = {
  disable: { title: 'Enter current PIN', subtitle: 'To turn off app lock' },
  current: { title: 'Enter current PIN', subtitle: 'To change your app lock PIN' },
  new: { title: 'Choose a PIN', subtitle: "4 digits you'll use to open Eunox" },
  confirm: { title: 'Confirm your PIN', subtitle: 'Enter the same 4 digits again' },
};

function formatCountdown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/** Sets up, changes, or disables the app lock PIN. Unlocking is handled by LockOverlay. */
export default function LockSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const {
    enabled,
    biometricsAvailable,
    lockedUntil,
    verifyPin,
    setPin,
    disableLock,
  } = useLock();

  const initialStep: Step =
    mode === 'disable' && enabled ? 'disable' : enabled ? 'current' : 'new';

  const [step, setStep] = useState<Step>(initialStep);
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const bioInFlightRef = useRef(false);

  const verifyingCurrent = step === 'current' || step === 'disable';
  const remainingSeconds =
    verifyingCurrent && lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;
  const isLockedOut = remainingSeconds > 0;

  useEffect(() => {
    return () => cancelBiometrics();
  }, []);

  useEffect(() => {
    if (!verifyingCurrent || lockedUntil <= Date.now()) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockedUntil) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [verifyingCurrent, lockedUntil]);

  const handleBiometricVerify = useCallback(async () => {
    if (!verifyingCurrent || bioInFlightRef.current) return;
    bioInFlightRef.current = true;
    try {
      const result = await authenticateWithBiometrics();
      if (result.success) {
        setError(null);
        if (step === 'disable') {
          try {
            await disableLock();
            router.back();
          } catch {
            setError("Couldn't turn off app lock");
          }
        } else {
          setStep('new');
        }
      } else if (result.error === 'lockout' || result.error === 'lockout_permanent') {
        setError('Biometrics locked by device. Enter your PIN.');
      }
    } finally {
      bioInFlightRef.current = false;
    }
  }, [verifyingCurrent, step, disableLock]);

  const handleComplete = async (pin: string) => {
    if (verifyingCurrent) {
      if (isLockedOut) return false;
      const result = await verifyPin(pin);
      if (!result.ok) {
        setNow(Date.now());
        setError(
          result.storageError
            ? "Couldn't read secure storage. Try again."
            : 'Wrong PIN'
        );
        return false;
      }
      setError(null);
      if (step === 'disable') {
        try {
          await disableLock();
          router.back();
          return true;
        } catch {
          setError("Couldn't turn off app lock");
          return false;
        }
      }
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

  const displayError = isLockedOut
    ? `Too many tries. Try again in ${formatCountdown(remainingSeconds)}`
    : error;

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
        error={displayError}
        disabled={isLockedOut}
        header={<NoxSleepingMascot size={64} />}
        onComplete={handleComplete}
        onBiometric={verifyingCurrent && biometricsAvailable ? handleBiometricVerify : undefined}
      />
    </SafeAreaView>
  );
}
