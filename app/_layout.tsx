import '../global.css';

import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { LockOverlay } from '@/components/LockOverlay';
import { NoxSleepingMascot } from '@/components/NoxMascot';
import { useColorScheme } from '@/components/useColorScheme';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { LockProvider, useLock } from '@/context/LockContext';
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  anchor: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  return (
    <OnboardingProvider>
      <BudgetProvider>
        <LockProvider>
          <RootLayoutNav />
        </LockProvider>
      </BudgetProvider>
    </OnboardingProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const {
    hydrated: onboardingHydrated,
    storageError: onboardingStorageError,
    retryHydration: retryOnboardingHydration,
    hasCompletedOnboarding,
  } = useOnboarding();
  const {
    hydrated: budgetHydrated,
    storageError: budgetStorageError,
    retryHydration: retryBudgetHydration,
  } = useBudget();
  const lock = useLock();
  const bootstrapError =
    (!onboardingHydrated && onboardingStorageError) ||
    (!budgetHydrated && budgetStorageError) ||
    null;
  const ready = onboardingHydrated && budgetHydrated && lock.ready;
  const [showSplash, setShowSplash] = useState(true);

  // Keep the splash screen up until saved data is loaded (or a bootstrap error
  // needs to be shown), so Home doesn't flash the onboarding redirect.
  useEffect(() => {
    if (ready || bootstrapError) SplashScreen.hideAsync();
  }, [ready, bootstrapError]);

  if (bootstrapError) {
    return (
      <View className="flex-1 bg-cream items-center justify-center px-6">
        <StatusBar style="dark" />
        <NoxSleepingMascot size={78} />
        <Text className="mt-5 text-[20px] font-bold text-charcoal text-center">
          Couldn&apos;t load your data
        </Text>
        <Text className="mt-2 text-[14px] leading-[20px] text-warm-gray text-center max-w-[300px]">
          {bootstrapError}
        </Text>
        <Pressable
          onPress={() => {
            if (!onboardingHydrated) retryOnboardingHydration();
            if (!budgetHydrated) retryBudgetHydration();
          }}
          accessibilityRole="button"
          className="mt-6 bg-charcoal rounded-full px-7 h-[48px] items-center justify-center active:opacity-85"
        >
          <Text className="text-white text-[15px] font-semibold">Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!ready) return null;

  const isLocked = lock.locked && hasCompletedOnboarding;
  const showPrivacyCurtain = !isLocked && lock.privacyShield && hasCompletedOnboarding;

  return (
    <>
      <StatusBar style="dark" />
      {isLocked ? (
        <LockOverlay suppressAutoBiometrics={showSplash} />
      ) : (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={hasCompletedOnboarding}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="add-transaction"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen name="transactions" options={{ headerShown: false }} />
              <Stack.Screen name="edit-transaction" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="wallets" options={{ headerShown: false }} />
              <Stack.Screen name="categories" options={{ headerShown: false }} />
              <Stack.Screen name="savings-goals" options={{ headerShown: false }} />
              <Stack.Screen name="recurring-bills" options={{ headerShown: false }} />
              <Stack.Screen
                name="scan-receipt"
                options={{ presentation: 'fullScreenModal', headerShown: false }}
              />
              <Stack.Screen name="lock" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={!hasCompletedOnboarding}>
              <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Screen name="onboarding/currency" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding/budget" options={{ headerShown: false }} />
            <Stack.Screen name="backup" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      )}
      {showPrivacyCurtain ? (
        <Modal
          visible
          transparent={false}
          animationType="none"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={() => {}}
        >
          <View className="flex-1 bg-cream items-center justify-center">
            <NoxSleepingMascot size={78} />
          </View>
        </Modal>
      ) : null}
      {showSplash ? (
        <AnimatedSplash onFinish={() => setShowSplash(false)} />
      ) : null}
    </>
  );
}
