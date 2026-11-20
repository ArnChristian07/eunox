import { NoxMascot } from '@/components/NoxMascot';
import { router } from 'expo-router';
import { Download, MessageSquare, Smartphone, WifiOff } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FEATURES = [
  {
    icon: Smartphone,
    label: 'Your data never leaves your phone',
  },
  {
    icon: MessageSquare,
    label: 'Ask questions in plain words',
  },
  {
    icon: Download,
    label: 'Back up to a file when you choose',
  },
] as const;

export default function OnboardingWelcomeScreen() {
  const handleGetStarted = () => {
    router.push('/onboarding/currency');
  };

  const handleRestoreBackup = () => {
    router.push('/backup');
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 px-6 pt-3 pb-6 justify-between">
        {/* Top bar */}
        <View>
          <View className="flex-row items-center justify-between">
            <Text className="text-[22px] font-bold tracking-tight text-charcoal">
              eunox
            </Text>

            <View className="flex-row items-center gap-1.5 bg-white/80 border border-warm-border rounded-full px-3 py-1.5">
              <WifiOff size={13} color="#66655E" strokeWidth={2} />
              <Text className="text-[12.5px] font-medium text-warm-gray">
                Works offline
              </Text>
            </View>
          </View>

          {/* Hero Mascot */}
          <View className="mt-4 mb-3 items-center">
            <NoxMascot size={200} />
          </View>

          {/* Headline & Subtitle */}
          <Text className="text-[34px] leading-[39px] font-bold tracking-tight text-charcoal">
            Know where your{'\n'}money goes.
          </Text>

          <Text className="mt-3.5 text-[15.5px] leading-[22px] text-warm-gray">
            Eunox keeps your budget on this phone. No account, no cloud. Nox,
            your on-device assistant, helps you make sense of it.
          </Text>

          {/* Feature List */}
          <View className="mt-8 gap-3.5">
            {FEATURES.map(({ icon: Icon, label }) => (
              <View key={label} className="flex-row items-center gap-3.5">
                <View className="w-10 h-10 rounded-xl bg-white border border-warm-border items-center justify-center">
                  <Icon size={18} color="#141413" strokeWidth={1.75} />
                </View>
                <Text className="text-[15px] font-medium text-charcoal flex-1">
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Actions */}
        <View className="pt-4">
          <Pressable
            onPress={handleGetStarted}
            accessibilityRole="button"
            className="bg-charcoal rounded-full h-[54px] items-center justify-center active:opacity-85"
          >
            <Text className="text-white text-[16px] font-semibold">
              Get started
            </Text>
          </Pressable>

          <Pressable
            onPress={handleRestoreBackup}
            accessibilityRole="button"
            className="mt-3.5 py-2.5 items-center active:opacity-60"
          >
            <Text className="text-charcoal text-[15px] font-semibold">
              Restore from backup file
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
