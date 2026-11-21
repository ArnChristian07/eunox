import '../global.css';

import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { LockOverlay } from '@/components/LockOverlay';
import { NoxSleepingMascot } from '@/components/NoxMascot';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { LockProvider, useLock } from '@/context/LockContext';
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';
import { TourOverlay } from '@/components/TourOverlay';
import { TourProvider } from '@/context/TourContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  anchor: '(tabs)',
};

// Eunox is designed light-only (app.json sets userInterfaceStyle: "light"). The
// navigator background matches the screens so transitions never flash grey or black.
const EUNOX_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#141413',
    background: '#F8F7F2',
    card: '#F8F7F2',
    text: '#141413',
    border: '#E4E2DA',
  },
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
          <TourProvider>
            <RootLayoutNav />
          </TourProvider>
        </LockProvider>
      </BudgetProvider>
    </OnboardingProvider>
  );
}

function RootLayoutNav() {
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
      {/* The navigator stays mounted while locked so relocking (e.g. after >30s in the
          file picker or share sheet) keeps the user's screens and unsaved input. The
          lock screen covers it, and it's hidden from screen readers meanwhile. */}
      <View
        style={{ flex: 1 }}
        importantForAccessibility={isLocked ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={isLocked}
      >
        <ThemeProvider value={EUNOX_THEME}>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Explicit redirectTo: without it, Expo Router falls back to the first
                unguarded route alphabetically (`backup`) on a fresh install. */}
            <Stack.Protected guard={hasCompletedOnboarding} redirectTo="/onboarding">
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              {/* Not native modals: iOS presents those above the root view, where the
                  lock screen and privacy curtain can't cover them. */}
              <Stack.Screen
                name="add-transaction"
                options={{ animation: 'slide_from_bottom', headerShown: false }}
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
                options={{
                  animation: 'slide_from_bottom',
                  gestureEnabled: false,
                  headerShown: false,
                }}
              />
              <Stack.Screen name="lock" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={!hasCompletedOnboarding} redirectTo="/">
              <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Screen name="onboarding/currency" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding/budget" options={{ headerShown: false }} />
            <Stack.Screen name="backup" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </View>
      {/* Above the app, below the lock screen, privacy curtain and splash. */}
      {!isLocked ? <TourOverlay /> : null}
      {isLocked ? <LockOverlay suppressAutoBiometrics={showSplash} /> : null}
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
