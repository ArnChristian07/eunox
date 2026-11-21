import { router, Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoxSleepingMascot } from '@/components/NoxMascot';

/** Shown for unknown routes, e.g. a broken eunox:// link. */
export default function NotFoundScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 items-center justify-center px-6">
        <NoxSleepingMascot size={78} />
        <Text
          accessibilityRole="header"
          className="mt-5 text-[22px] font-bold text-charcoal text-center"
        >
          Nothing here
        </Text>
        <Text className="mt-2 text-[15px] leading-[21px] text-warm-gray text-center max-w-[300px]">
          This link doesn&apos;t go anywhere in Eunox. Your data is safe.
        </Text>
        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          className="mt-6 bg-charcoal rounded-full px-7 h-[48px] items-center justify-center active:opacity-85"
        >
          <Text className="text-white text-[15px] font-semibold">Go to Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
