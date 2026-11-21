import React from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Href, router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getBillStatus, useBudget } from '@/context/BudgetContext';
import { useLock } from '@/context/LockContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { useTour } from '@/context/TourContext';
import { formatTimeAgo } from '@/lib/dates';

export default function SettingsScreen() {
  const { selectedCurrency, monthStart } = useOnboarding();
  const lock = useLock();
  const { requestTour } = useTour();
  const {
    today,
    wallets,
    categories,
    goals,
    bills,
    lastBackup,
    hideAmountsOnHome,
    setHideAmountsOnHome,
    noxSuggestionsEnabled,
    setNoxSuggestionsEnabled,
  } = useBudget();

  const billsDue = bills.filter((b) => !getBillStatus(b, today).paid).length;
  const billsLabel =
    bills.length === 0 ? 'None' : billsDue === 0 ? 'All paid' : `${billsDue} due`;

  const handleLockToggle = (value: boolean) => {
    if (value) {
      router.push('/lock');
      return;
    }
    Alert.alert('Turn off app lock?', 'Anyone with your phone can open Eunox.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Turn off',
        style: 'destructive',
        onPress: () => {
          router.push({ pathname: '/lock', params: { mode: 'disable' } });
        },
      },
    ]);
  };

  const lockSubtitle = !lock.supported
    ? 'Not available on this device'
    : lock.enabled
      ? `On · ${lock.biometricsAvailable ? 'fingerprint or PIN' : 'PIN'} · tap to change PIN`
      : 'Fingerprint or PIN to open';

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 pt-2 pb-4">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            accessibilityLabel="Back"
            className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
          >
            <ChevronLeft size={20} color="#141413" strokeWidth={2} />
          </Pressable>
          <Text className="text-[24px] font-bold tracking-tight text-charcoal">
            Settings
          </Text>
        </View>

        {/* Money Section */}
        <Text className="text-[13px] font-medium text-warm-gray mb-2 px-1">
          Money
        </Text>
        <View className="bg-white border border-warm-border rounded-3xl px-4">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/onboarding/currency')}
            className="flex-row items-center justify-between py-4 border-b border-warm-border"
          >
            <Text className="text-[15px] font-medium text-charcoal">
              Main currency
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[14.5px] text-warm-gray">
                {selectedCurrency.code} {selectedCurrency.symbol}
              </Text>
              <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/wallets')}
            className="flex-row items-center justify-between py-4 border-b border-warm-border"
          >
            <Text className="text-[15px] font-medium text-charcoal">
              Wallets
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[14.5px] text-warm-gray">
                {wallets.length}
              </Text>
              <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/categories' as Href)}
            className="flex-row items-center justify-between py-4 border-b border-warm-border"
          >
            <Text className="text-[15px] font-medium text-charcoal">
              Categories
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[14.5px] text-warm-gray">
                {categories.length}
              </Text>
              <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/recurring-bills' as Href)}
            className="flex-row items-center justify-between py-4 border-b border-warm-border"
          >
            <Text className="text-[15px] font-medium text-charcoal">
              Recurring bills
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[14.5px] text-warm-gray">{billsLabel}</Text>
              <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/savings-goals' as Href)}
            className="flex-row items-center justify-between py-4 border-b border-warm-border"
          >
            <Text className="text-[15px] font-medium text-charcoal">
              Savings goals
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[14.5px] text-warm-gray">{goals.length}</Text>
              <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/onboarding/budget')}
            className="flex-row items-center justify-between py-4"
          >
            <Text className="text-[15px] font-medium text-charcoal">
              Month starts on
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[14.5px] text-warm-gray">
                {monthStart}
              </Text>
              <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
            </View>
          </Pressable>
        </View>

        {/* Privacy and Data */}
        <Text className="text-[13px] font-medium text-warm-gray mt-5 mb-2 px-1">
          Privacy and data
        </Text>
        <View className="bg-white border border-warm-border rounded-3xl px-4">
          <Pressable
            accessibilityRole="button"
            onPress={() => lock.enabled && router.push('/lock')}
            disabled={!lock.supported}
            className="flex-row items-center justify-between py-3.5 border-b border-warm-border"
          >
            <View className="flex-1 pr-3">
              <Text className="text-[15px] font-medium text-charcoal">
                App lock
              </Text>
              <Text className="text-[12.5px] text-warm-gray mt-0.5">
                {lockSubtitle}
              </Text>
            </View>
            <Switch
              value={lock.enabled}
              onValueChange={handleLockToggle}
              accessibilityLabel="App lock"
              disabled={!lock.supported}
              trackColor={{ false: '#8A8880', true: '#141413' }}
              thumbColor="#FFFFFF"
            />
          </Pressable>

          <View className="flex-row items-center justify-between py-3.5 border-b border-warm-border">
            <View className="flex-1 pr-3">
              <Text className="text-[15px] font-medium text-charcoal">
                Hide amounts on Home
              </Text>
              <Text className="text-[12.5px] text-warm-gray mt-0.5">
                Tap the balance to show it
              </Text>
            </View>
            <Switch
              value={hideAmountsOnHome}
              onValueChange={setHideAmountsOnHome}
              accessibilityLabel="Hide amounts on Home"
              trackColor={{ false: '#8A8880', true: '#141413' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/backup')}
            className="flex-row items-center justify-between py-3.5"
          >
            <View className="flex-1 pr-3">
              <Text className="text-[15px] font-medium text-charcoal">
                Backup and restore
              </Text>
              <Text className="text-[12.5px] text-warm-gray mt-0.5">
                {lastBackup
                  ? `Last backup ${formatTimeAgo(lastBackup.at)}`
                  : 'No backup yet'}
              </Text>
            </View>
            <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Nox and Display */}
        <Text className="text-[13px] font-medium text-warm-gray mt-5 mb-2 px-1">
          Nox
        </Text>
        <View className="bg-white border border-warm-border rounded-3xl px-4">
          <View className="flex-row items-center justify-between py-3.5">
            <View className="flex-1 pr-3">
              <Text className="text-[15px] font-medium text-charcoal">
                Nox suggestions
              </Text>
              <Text className="text-[12.5px] text-warm-gray mt-0.5">
                Tips on Home and Budgets
              </Text>
            </View>
            <Switch
              value={noxSuggestionsEnabled}
              onValueChange={setNoxSuggestionsEnabled}
              accessibilityLabel="Nox suggestions"
              trackColor={{ false: '#8A8880', true: '#141413' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              // Settings is opened from Home; going back there starts the tutorial.
              requestTour();
              router.back();
            }}
            className="flex-row items-center justify-between py-3.5 border-t border-warm-border"
          >
            <View className="flex-1 pr-3">
              <Text className="text-[15px] font-medium text-charcoal">
                Replay tutorial
              </Text>
              <Text className="text-[12.5px] text-warm-gray mt-0.5">
                Learn the basics by trying them
              </Text>
            </View>
            <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
          </Pressable>
        </View>

        <Text className="mt-6 text-center text-[12.5px] text-warm-gray">
          Eunox {Constants.expoConfig?.version ?? ''} · Everything is stored on this phone
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
