import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, ChevronLeft, Search, X } from 'lucide-react-native';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { CURRENCIES, Currency, formatSampleAmount } from '@/constants/currencies';
import { useOnboarding } from '@/context/OnboardingContext';

export default function OnboardingCurrencyScreen() {
  const {
    hasCompletedOnboarding,
    regionCurrencyCode,
    selectedCurrency,
    setSelectedCurrency,
  } = useOnboarding();
  const isEditing = hasCompletedOnboarding;
  const [draftCurrency, setDraftCurrency] = useState<Currency>(selectedCurrency);
  const [query, setQuery] = useState('');

  const activeCurrency = isEditing ? draftCurrency : selectedCurrency;

  const filteredCurrencies = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [query]);

  const handleSelect = (item: Currency) => {
    if (isEditing) {
      setDraftCurrency(item);
    } else {
      setSelectedCurrency(item);
    }
  };

  const handlePrimaryAction = () => {
    if (isEditing) {
      setSelectedCurrency(draftCurrency);
      router.back();
      return;
    }
    router.push('/onboarding/budget');
  };

  const renderCurrencyItem = ({ item }: { item: Currency }) => {
    const isSelected = item.code === activeCurrency.code;
    const isRegion = item.code === regionCurrencyCode;

    return (
      <Pressable
        onPress={() => handleSelect(item)}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        className={`flex-row items-center px-3 py-2.5 rounded-2xl ${
          isSelected ? 'bg-nox-lime' : 'bg-transparent active:bg-cream'
        }`}
      >
        <View
          className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
            isSelected ? 'bg-white' : 'bg-[#F3F2EC]'
          }`}
        >
          <Text className="text-[15px] font-bold text-charcoal">
            {item.symbol}
          </Text>
        </View>

        <View className="flex-1 pr-2">
          <Text
            numberOfLines={1}
            className="text-[15.5px] font-semibold text-charcoal"
          >
            {item.name}
          </Text>
          <Text
            numberOfLines={1}
            className={`text-[12.5px] mt-0.5 ${
              isSelected ? 'text-charcoal/75' : 'text-warm-gray'
            }`}
          >
            {item.code}
            {isRegion ? " · Your phone's region" : ''}
          </Text>
        </View>

        {isSelected ? (
          <View className="w-6 h-6 rounded-full bg-charcoal items-center justify-center">
            <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        ) : (
          <View className="w-6 h-6 rounded-full border-[1.5px] border-[#D0CEC5]" />
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View className="flex-1 px-6 pb-6">
        {isEditing ? (
          <View className="flex-row items-center gap-3 pt-2 pb-5">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-70"
            >
              <ChevronLeft size={20} color="#141413" strokeWidth={2} />
            </Pressable>
            <Text className="text-[18px] font-bold text-charcoal">
              Main currency
            </Text>
          </View>
        ) : (
          <OnboardingHeader step={1} onBack={() => router.back()} />
        )}

        {/* Title & Subtitle */}
        <Text className="text-[30px] leading-[35px] font-bold tracking-tight text-charcoal">
          Which currency do you use?
        </Text>
        <Text className="mt-2 text-[15px] leading-[21px] text-warm-gray">
          This is your main currency. You can add others later.
        </Text>

        {/* Search Input */}
        <View className="mt-5 flex-row items-center bg-white border border-warm-border rounded-2xl px-3.5 h-12">
          <Search size={18} color="#8A8880" strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search currencies"
            placeholderTextColor="#8A8880"
            autoCorrect={false}
            autoCapitalize="none"
            className="flex-1 ml-2.5 text-[15px] text-charcoal"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              className="p-1 active:opacity-60"
            >
              <X size={16} color="#8A8880" strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        {/* Currency List Card */}
        <View className="flex-1 mt-4 bg-white border border-warm-border rounded-3xl p-2 overflow-hidden">
          <FlatList
            data={filteredCurrencies}
            keyExtractor={(item) => item.code}
            renderItem={renderCurrencyItem}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View className="h-0.5" />}
            ListEmptyComponent={
              <View className="py-10 items-center">
                <Text className="text-[14px] text-warm-gray">
                  No currencies matching &ldquo;{query}&rdquo;
                </Text>
              </View>
            }
          />
        </View>

        {/* Sample Preview */}
        <View className="flex-row items-center justify-between mt-4 mb-4 px-1">
          <Text className="text-[14px] text-warm-gray">
            Amounts will look like
          </Text>
          <Text className="text-[16px] font-bold text-charcoal">
            {formatSampleAmount(activeCurrency)}
          </Text>
        </View>

        {/* Primary CTA */}
        <Pressable
          onPress={handlePrimaryAction}
          accessibilityRole="button"
          className="bg-charcoal rounded-full h-[54px] items-center justify-center active:opacity-85"
        >
          <Text className="text-white text-[16px] font-semibold">
            {isEditing
              ? `Save ${activeCurrency.code}`
              : `Continue with ${activeCurrency.code}`}
          </Text>
        </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
