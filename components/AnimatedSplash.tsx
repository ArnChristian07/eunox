import { StatusBar } from 'expo-status-bar';
import { Smartphone } from 'lucide-react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NoxSplashMascot } from './NoxMascot';

interface AnimatedSplashProps {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const barTranslate = useSharedValue(0);

  useEffect(() => {
    barTranslate.value = withRepeat(
      withSequence(
        withTiming(72, {
          duration: 750,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: 750,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );

    const timer = setTimeout(() => {
      onFinish();
    }, 1600);

    return () => clearTimeout(timer);
  }, [barTranslate, onFinish]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: barTranslate.value }],
  }));

  return (
    <Animated.View
      exiting={FadeOut.duration(300)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
      }}
      className="bg-charcoal"
    >
      <StatusBar style="light" />
      <SafeAreaView className="flex-1 justify-between items-center px-6 pb-10">
        <View />

        {/* Center Mascot & Wordmark */}
        <View className="items-center">
          <Animated.View entering={ZoomIn.duration(400)}>
            <NoxSplashMascot size={140} />
          </Animated.View>

          <Animated.Text
            entering={FadeIn.delay(140).duration(320)}
            className="mt-5 text-[36px] font-bold tracking-tight text-white"
          >
            eunox
          </Animated.Text>

          <Animated.Text
            entering={FadeIn.delay(240).duration(320)}
            className="mt-2 text-[15px] text-[#A8A69E]"
          >
            Your money, on your phone.
          </Animated.Text>
        </View>

        {/* Bottom Progress & Tagline */}
        <Animated.View
          entering={FadeIn.delay(300).duration(320)}
          className="items-center"
        >
          <View className="w-28 h-[3px] rounded-full bg-[#2C2C2A] overflow-hidden mb-4">
            <Animated.View
              style={indicatorStyle}
              className="w-10 h-full rounded-full bg-nox-lime"
            />
          </View>

          <View className="flex-row items-center gap-1.5">
            <Smartphone size={14} color="#A8A69E" strokeWidth={1.9} />
            <Text className="text-[12.5px] text-[#A8A69E]">
              Works offline · nothing leaves this phone
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}
