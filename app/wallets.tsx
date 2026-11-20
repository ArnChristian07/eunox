import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeftRight,
  Banknote,
  ChevronLeft,
  Info,
  Landmark,
  Plus,
  Smartphone,
} from 'lucide-react-native';
import { useBudget, WalletItem } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';

function getWalletIcon(type: WalletItem['iconType']) {
  switch (type) {
    case 'cash':
      return Banknote;
    case 'ewallet':
      return Smartphone;
    case 'bank':
      return Landmark;
  }
}

export default function WalletsScreen() {
  const { selectedCurrency } = useOnboarding();
  const { wallets } = useBudget();
  const sym = selectedCurrency.symbol;

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const [whole, dec] = totalBalance.toFixed(2).split('.');

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 px-5 pb-5 justify-between">
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="flex-row items-center gap-3 pt-2 pb-4">
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Back"
              className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
            >
              <ChevronLeft size={20} color="#141413" strokeWidth={2} />
            </Pressable>
            <Text className="text-[22px] font-bold tracking-tight text-charcoal">
              Wallets
            </Text>
          </View>

          {/* Total Balance */}
          <Text className="text-[13.5px] text-warm-gray">
            Total across {wallets.length} wallets
          </Text>
          <View className="flex-row items-baseline mt-1">
            <Text className="text-[36px] leading-[42px] font-bold tracking-tight text-charcoal">
              {sym}
              {Number(whole).toLocaleString('en-US')}
            </Text>
            <Text className="text-[32px] leading-[38px] font-bold text-[#8A8880]">
              .{dec}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-4 mb-5">
            <Pressable
              onPress={() => router.push('/add-transaction')}
              className="flex-1 bg-charcoal rounded-2xl h-12 flex-row items-center justify-center gap-2 active:opacity-85"
            >
              <ArrowLeftRight size={16} color="#FFFFFF" strokeWidth={2} />
              <Text className="text-white text-[14.5px] font-semibold">
                Transfer
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                Alert.alert('Add wallet', 'Create a new local wallet on this phone.')
              }
              className="flex-1 bg-white border border-warm-border rounded-2xl h-12 flex-row items-center justify-center gap-1.5 active:opacity-75"
            >
              <Plus size={16} color="#141413" strokeWidth={2.2} />
              <Text className="text-charcoal text-[14.5px] font-semibold">
                Add wallet
              </Text>
            </Pressable>
          </View>

          {/* Wallet Cards */}
          <View className="gap-3">
            {wallets.map((w) => {
              const Icon = getWalletIcon(w.iconType);
              return (
                <View
                  key={w.id}
                  className="bg-white border border-warm-border rounded-3xl p-4 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                    <View
                      className={`w-11 h-11 rounded-2xl items-center justify-center ${
                        w.isDefault ? 'bg-nox-lime' : 'bg-[#F3F2EC]'
                      }`}
                    >
                      <Icon size={20} color="#141413" strokeWidth={1.9} />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[15.5px] font-semibold text-charcoal">
                        {w.name}
                      </Text>
                      <Text className="text-[12.5px] text-warm-gray mt-0.5">
                        {w.subtitle}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-[15.5px] font-bold text-charcoal">
                    {sym}
                    {w.balance.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Recent Transfers */}
          <Text className="mt-6 mb-3 text-[16px] font-bold text-charcoal">
            Recent transfers
          </Text>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[14.5px] font-semibold text-charcoal">
                Cash wallet → E-wallet
              </Text>
              <Text className="text-[12.5px] text-warm-gray mt-0.5">
                Tue, Nov 17
              </Text>
            </View>
            <Text className="text-[14.5px] font-semibold text-charcoal">
              {sym}1,000.00
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Info */}
        <View className="flex-row items-start gap-2.5 pt-4">
          <Info size={16} color="#8A8880" strokeWidth={2} />
          <Text className="flex-1 text-[12.5px] leading-[18px] text-warm-gray">
            Balances come from what you record. Eunox never connects to your
            bank or e-wallet.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
