import '../global.css';

import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { LockOverlay } from '@/components/LockOverlay';
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
  const { hydrated: onboardingHydrated, hasCompletedOnboarding } = useOnboarding();
  const { hydrated: budgetHydrated } = useBudget();
  const lock = useLock();
  const ready = onboardingHydrated && budgetHydrated && lock.ready;
  const [showSplash, setShowSplash] = useState(true);

  // Keep the splash screen up until saved data is loaded, so Home doesn't
  // flash the onboarding redirect for returning users.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding/currency" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding/budget" options={{ headerShown: false }} />
            <Stack.Screen
              name="add-transaction"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen name="transactions" options={{ headerShown: false }} />
            <Stack.Screen name="edit-transaction" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="backup" options={{ headerShown: false }} />
            <Stack.Screen name="wallets" options={{ headerShown: false }} />
            <Stack.Screen name="categories" options={{ headerShown: false }} />
            <Stack.Screen name="savings-goals" options={{ headerShown: false }} />
            <Stack.Screen name="recurring-bills" options={{ headerShown: false }} />
            <Stack.Screen
              name="scan-receipt"
              options={{ presentation: 'fullScreenModal', headerShown: false }}
            />
            <Stack.Screen name="lock" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
        {lock.locked && hasCompletedOnboarding ? <LockOverlay /> : null}
        {showSplash ? (
          <AnimatedSplash onFinish={() => setShowSplash(false)} />
        ) : null}
    </>
  );
}
