import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { X, Zap } from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { toISODate } from '@/lib/dates';

const SCANNED_SAMPLES = [
  {
    merchant: 'Corner bakery',
    category: 'Food',
    amount: 348,
    items: '3 items',
    time: 'Today, 4:12 PM',
  },
  {
    merchant: 'Mercury Drug',
    category: 'Health',
    amount: 425,
    items: '2 items',
    time: 'Today, 4:15 PM',
  },
  {
    merchant: 'Shell Station',
    category: 'Transport',
    amount: 1200,
    items: '1 item',
    time: 'Today, 4:18 PM',
  },
];

export default function ScanReceiptScreen() {
  const { selectedCurrency } = useOnboarding();
  const { today, addTransaction } = useBudget();
  const sym = selectedCurrency.symbol;

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [sampleIdx, setSampleIdx] = useState(0);

  const currentScan = SCANNED_SAMPLES[sampleIdx];

  const handleSaveReceipt = () => {
    addTransaction({
      title: currentScan.merchant,
      category: currentScan.category,
      amount: currentScan.amount,
      type: 'expense',
      date: toISODate(today),
      wallet: 'Cash wallet',
      note: `${currentScan.items} from receipt scan`,
    });
    router.back();
  };

  const hasPermission = permission?.granted === true;

  return (
    <View className="flex-1 bg-[#141413]">
      {/* Live Camera Preview when granted */}
      {hasPermission ? (
        <CameraView
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          facing="back"
          enableTorch={torch}
        />
      ) : null}

      <SafeAreaView edges={['top']} className="flex-1 justify-between">
        {/* Top Overlay Header */}
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Close scanner"
            className="w-11 h-11 rounded-2xl bg-[#272724] items-center justify-center active:opacity-75"
          >
            <X size={20} color="#FFFFFF" strokeWidth={2} />
          </Pressable>

          <Text className="text-[17px] font-semibold text-white">
            Scan receipt
          </Text>

          <Pressable
            onPress={() => setTorch((prev) => !prev)}
            accessibilityLabel="Toggle flash"
            className={`w-11 h-11 rounded-2xl items-center justify-center active:opacity-75 ${
              torch ? 'bg-nox-lime' : 'bg-[#272724]'
            }`}
          >
            <Zap
              size={19}
              color={torch ? '#141413' : '#FFFFFF'}
              strokeWidth={2}
            />
          </Pressable>
        </View>

        {/* Viewfinder & Receipt Frame */}
        <View className="items-center justify-center px-10">
          <View className="w-[230px] h-[290px] items-center justify-center relative">
            {/* Lime Corner Brackets */}
            <View className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-nox-lime rounded-tl-xl" />
            <View className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-nox-lime rounded-tr-xl" />
            <View className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-nox-lime rounded-bl-xl" />
            <View className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-nox-lime rounded-br-xl" />

            {/* Receipt Placeholder Card when camera permission isn't granted */}
            {!hasPermission ? (
              <View
                style={{ transform: [{ rotate: '-2deg' }] }}
                className="w-[184px] h-[242px] bg-[#F8F7F2] rounded-xl p-4 justify-between"
              >
                <View>
                  <View className="h-2.5 w-20 bg-[#D7D5CC] rounded-full self-center mb-1.5" />
                  <View className="h-2 w-14 bg-[#E4E2DA] rounded-full self-center mb-4" />
                  <View className="h-[1px] bg-[#E4E2DA] mb-3" />

                  <View className="gap-2.5">
                    <View className="flex-row justify-between">
                      <View className="h-2 w-20 bg-[#D7D5CC] rounded-full" />
                      <View className="h-2 w-8 bg-[#D7D5CC] rounded-full" />
                    </View>
                    <View className="flex-row justify-between">
                      <View className="h-2 w-24 bg-[#D7D5CC] rounded-full" />
                      <View className="h-2 w-8 bg-[#D7D5CC] rounded-full" />
                    </View>
                    <View className="flex-row justify-between">
                      <View className="h-2 w-16 bg-[#D7D5CC] rounded-full" />
                      <View className="h-2 w-8 bg-[#D7D5CC] rounded-full" />
                    </View>
                  </View>

                  <View className="mt-4 bg-nox-lime rounded-lg px-2 py-2 flex-row justify-between items-center">
                    <View className="h-2.5 w-14 bg-charcoal rounded-full" />
                    <View className="h-2.5 w-9 bg-charcoal rounded-full" />
                  </View>
                </View>

                <View className="h-2 w-16 bg-[#E4E2DA] rounded-full" />
              </View>
            ) : null}
          </View>

          <Text className="mt-5 text-[12.5px] text-white/70 text-center">
            Read on your phone. The photo never leaves it.
          </Text>

          {!hasPermission ? (
            <Pressable
              onPress={requestPermission}
              className="mt-2.5 bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 active:opacity-75"
            >
              <Text className="text-[12px] font-medium text-white">
                Enable live camera
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Bottom Parsed Sheet */}
        <View className="bg-cream rounded-t-3xl px-5 pt-5 pb-8">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5">
              <NoxMiniIcon size={24} />
              <Text className="text-[15px] font-bold text-charcoal">
                Nox found
              </Text>
            </View>
            <Text className="text-[22px] font-bold text-charcoal">
              {sym}
              {currentScan.amount.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2 mt-3.5">
            <View className="bg-nox-lime rounded-full px-3 py-1">
              <Text className="text-[12.5px] font-semibold text-charcoal">
                {currentScan.category}
              </Text>
            </View>
            <View className="bg-white border border-warm-border rounded-full px-3 py-1">
              <Text className="text-[12.5px] font-medium text-charcoal">
                {currentScan.merchant}
              </Text>
            </View>
            <View className="bg-white border border-warm-border rounded-full px-3 py-1">
              <Text className="text-[12.5px] font-medium text-charcoal">
                {currentScan.time}
              </Text>
            </View>
            <View className="bg-white border border-warm-border rounded-full px-3 py-1">
              <Text className="text-[12.5px] font-medium text-charcoal">
                {currentScan.items}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3 mt-6">
            <Pressable
              onPress={() => {
                if (!hasPermission) requestPermission();
                setSampleIdx((prev) => (prev + 1) % SCANNED_SAMPLES.length);
              }}
              className="flex-1 bg-white border border-warm-border rounded-full h-[52px] items-center justify-center active:opacity-75"
            >
              <Text className="text-[15px] font-semibold text-charcoal">
                Retake
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSaveReceipt}
              className="flex-1 bg-charcoal rounded-full h-[52px] items-center justify-center active:opacity-85"
            >
              <Text className="text-[15px] font-semibold text-white">
                Save expense
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
