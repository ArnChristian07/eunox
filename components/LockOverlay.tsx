import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NoxSleepingMascot } from '@/components/NoxMascot';
import { PinPad } from '@/components/PinPad';
import { useBudget } from '@/context/BudgetContext';
import { useLock } from '@/context/LockContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { authenticateWithBiometrics, cancelBiometrics } from '@/lib/appLock';

interface LockOverlayProps {
  /** Defers the automatic biometric prompt while the animated splash is visible. */
  suppressAutoBiometrics?: boolean;
}

function formatCountdown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/** Covers the whole app while it is locked. Rendered in place of the navigator. */
export function LockOverlay({ suppressAutoBiometrics = false }: LockOverlayProps) {
  const {
    verifyPin,
    unlock,
    biometricsAvailable,
    disableLock,
    failedAttempts,
    lockedUntil,
  } = useLock();
  const { resetAll } = useBudget();
  const { resetOnboarding } = useOnboarding();

  const [bioError, setBioError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const bioInFlightRef = useRef(false);
  const autoPromptedRef = useRef(false);
  const mountedRef = useRef(true);

  const remainingSeconds = lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;
  const isLockedOut = remainingSeconds > 0;

  useEffect(() => {
    mountedRef.current = true;
    // Screens stay mounted underneath; don't leave their keyboard open over the lock.
    Keyboard.dismiss();
    return () => {
      mountedRef.current = false;
      cancelBiometrics();
    };
  }, []);

  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockedUntil) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const tryBiometrics = useCallback(async () => {
    if (bioInFlightRef.current) return;
    bioInFlightRef.current = true;
    try {
      const result = await authenticateWithBiometrics();
      if (!mountedRef.current) return;
      if (result.success) {
        setBioError(null);
        unlock();
        return;
      }
      if (result.error === 'lockout' || result.error === 'lockout_permanent') {
        setBioError('Biometrics locked by device. Enter your PIN.');
      }
    } finally {
      bioInFlightRef.current = false;
    }
  }, [unlock]);

  // Offer the biometric prompt once when the lock screen becomes visible.
  useEffect(() => {
    if (biometricsAvailable && !suppressAutoBiometrics && !autoPromptedRef.current) {
      autoPromptedRef.current = true;
      tryBiometrics();
    }
  }, [biometricsAvailable, suppressAutoBiometrics, tryBiometrics]);

  // Don't let the Android back button dismiss the lock screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const handleComplete = async (pin: string) => {
    if (isLockedOut) return false;
    setBioError(null);
    const result = await verifyPin(pin);
    if (!mountedRef.current) return false;
    setStorageError(!!result.storageError);
    if (result.ok) {
      unlock();
      return true;
    }
    setNow(Date.now());
    return false;
  };

  const eraseEverything = async () => {
    try {
      // Clear the PIN first so a Keychain/Keystore failure never leaves data wiped while still locked.
      await disableLock();
      resetAll();
      resetOnboarding();
    } catch {
      Alert.alert("Couldn't reset app lock", 'Please try again.');
    }
  };

  const handleForgot = () => {
    Alert.alert(
      'Forgot PIN?',
      biometricsAvailable
        ? 'Use your fingerprint or face to unlock. If that does not work, you can erase Eunox and restore a backup file afterwards.'
        : 'You can erase Eunox on this phone and restore a backup file afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase all data',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Erase everything?',
              'All entries, wallets, goals and bills on this phone will be deleted. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Erase', style: 'destructive', onPress: eraseEverything },
              ]
            ),
        },
      ]
    );
  };

  const errorMessage = isLockedOut
    ? `Too many tries. Try again in ${formatCountdown(remainingSeconds)}`
    : storageError
      ? "Couldn't read secure storage. Try again."
      : bioError
        ? bioError
        : failedAttempts > 0
          ? `Wrong PIN (${failedAttempts} ${failedAttempts === 1 ? 'try' : 'tries'})`
          : null;

  return (
    <View
      style={StyleSheet.absoluteFill}
      className="bg-cream"
      accessibilityViewIsModal
    >
      <SafeAreaView className="flex-1 bg-cream">
        <PinPad
          title="Eunox is locked"
          subtitle="Enter your 4-digit PIN"
          error={errorMessage}
          disabled={isLockedOut}
          header={<NoxSleepingMascot size={78} />}
          onComplete={handleComplete}
          onBiometric={biometricsAvailable ? tryBiometrics : undefined}
          footer={
            <Pressable accessibilityRole="button" onPress={handleForgot} className="mt-7 py-2 items-center active:opacity-60">
              <Text className="text-[14.5px] font-semibold text-charcoal">Forgot PIN?</Text>
            </Pressable>
          }
        />
      </SafeAreaView>
    </View>
  );
}
