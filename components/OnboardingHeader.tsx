import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

interface OnboardingHeaderProps {
  step: 1 | 2;
  onBack: () => void;
}

export function OnboardingHeader({ step, onBack }: OnboardingHeaderProps) {
  return (
    <View className="flex-row items-center justify-between pt-2 pb-5">
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-70"
      >
        <ChevronLeft size={20} color="#141413" strokeWidth={2} />
      </Pressable>

      <View className="flex-1 flex-row gap-2 mx-4">
        <View className="flex-1 h-[3px] rounded-full bg-charcoal" />
        <View
          className={`flex-1 h-[3px] rounded-full ${
            step === 2 ? 'bg-charcoal' : 'bg-[#DFDDD5]'
          }`}
        />
      </View>

      <Text className="text-[13px] font-medium text-warm-gray">{step} of 2</Text>
    </View>
  );
}
