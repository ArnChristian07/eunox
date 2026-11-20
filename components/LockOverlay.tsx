import React, { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NoxSleepingMascot } from '@/components/NoxMascot';
import { PinPad } from '@/components/PinPad';
import { useBudget } from '@/context/BudgetContext';
import { useLock } from '@/context/LockContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { authenticateWithBiometrics } from '@/lib/appLock';

/** Covers the whole app while it is locked. Rendered above the navigator. */
export function LockOverlay() {
  const { verifyPin, unlock, biometricsAvailable, disableLock } = useLock();
  const { resetAll } = useBudget();
  const { resetOnboarding } = useOnboarding();
  const [attempts, setAttempts] = useState(0);

  const tryBiometrics = useCallback(async () => {
    if (await authenticateWithBiometrics()) unlock();
  }, [unlock]);

  // Offer the fingerprint prompt straight away, like most banking apps.
  useEffect(() => {
    if (biometricsAvailable) tryBiometrics();
  }, [biometricsAvailable, tryBiometrics]);

  // Don't let the Android back button reveal the app underneath.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const handleComplete = (pin: string) => {
    if (verifyPin(pin)) {
      setAttempts(0);
      unlock();
      return true;
    }
    setAttempts((n) => n + 1);
    return false;
  };

  const eraseEverything = async () => {
    resetAll();
    resetOnboarding();
    await disableLock();
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

  return (
    <View style={StyleSheet.absoluteFill} className="bg-cream">
      <SafeAreaView className="flex-1 bg-cream">
        <PinPad
          title="Eunox is locked"
          subtitle="Enter your 4-digit PIN"
          error={attempts > 0 ? `Wrong PIN (${attempts} ${attempts === 1 ? 'try' : 'tries'})` : null}
          header={<NoxSleepingMascot size={78} />}
          onComplete={handleComplete}
          onBiometric={biometricsAvailable ? tryBiometrics : undefined}
          footer={
            <Pressable onPress={handleForgot} className="mt-7 py-2 items-center active:opacity-60">
              <Text className="text-[14.5px] font-semibold text-charcoal">Forgot PIN?</Text>
            </Pressable>
          }
        />
      </SafeAreaView>
    </View>
  );
}
