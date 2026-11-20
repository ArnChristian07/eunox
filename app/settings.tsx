import React from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';

export default function SettingsScreen() {
  const { selectedCurrency, monthStart } = useOnboarding();
  const {
    wallets,
    categories,
    appLockEnabled,
    setAppLockEnabled,
    hideAmountsOnHome,
    setHideAmountsOnHome,
    noxSuggestionsEnabled,
    setNoxSuggestionsEnabled,
  } = useBudget();

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
            onPress={() => router.push('/(tabs)/budgets')}
            className="flex-row items-center justify-between py-4 border-b border-warm-border"
          >
            <Text className="text-[15px] font-medium text-charcoal">
              Categories
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[14.5px] text-warm-gray">
                {categories.length + 1}
              </Text>
              <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
            </View>
          </Pressable>

          <View className="flex-row items-center justify-between py-4 border-b border-warm-border">
            <Text className="text-[15px] font-medium text-charcoal">
              Recurring bills
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[14.5px] text-warm-gray">2 due</Text>
              <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
            </View>
          </View>

          <View className="flex-row items-center justify-between py-4 border-b border-warm-border">
            <Text className="text-[15px] font-medium text-charcoal">
              Savings goals
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[14.5px] text-warm-gray">3</Text>
              <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
            </View>
          </View>

          <Pressable
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
            onPress={() => router.push('/lock')}
            className="flex-row items-center justify-between py-3.5 border-b border-warm-border"
          >
            <View className="flex-1 pr-3">
              <Text className="text-[15px] font-medium text-charcoal">
                App lock
              </Text>
              <Text className="text-[12.5px] text-warm-gray mt-0.5">
                Fingerprint or PIN to open
              </Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={setAppLockEnabled}
              trackColor={{ false: '#D9D7CE', true: '#141413' }}
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
              trackColor={{ false: '#D9D7CE', true: '#141413' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Pressable
            onPress={() => router.push('/backup')}
            className="flex-row items-center justify-between py-3.5"
          >
            <View className="flex-1 pr-3">
              <Text className="text-[15px] font-medium text-charcoal">
                Backup and restore
              </Text>
              <Text className="text-[12.5px] text-warm-gray mt-0.5">
                Last backup 3 days ago
              </Text>
            </View>
            <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Nox and Display */}
        <Text className="text-[13px] font-medium text-warm-gray mt-5 mb-2 px-1">
          Nox and display
        </Text>
        <View className="bg-white border border-warm-border rounded-3xl px-4">
          <View className="flex-row items-center justify-between py-3.5 border-b border-warm-border">
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
              trackColor={{ false: '#D9D7CE', true: '#141413' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="flex-row items-center justify-between py-4">
            <Text className="text-[15px] font-medium text-charcoal">Theme</Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[14.5px] text-warm-gray">Match phone</Text>
              <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
            </View>
          </View>
        </View>

        <Text className="mt-6 text-center text-[12.5px] text-warm-gray">
          Eunox 1.0 · Everything is stored on this phone
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
