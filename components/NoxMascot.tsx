import React from 'react';
import { Image, View } from 'react-native';

interface NoxMascotProps {
  size?: number;
}

export function NoxHomeAvatar({ size = 38 }: NoxMascotProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
      }}
    >
      <Image
        source={require('../assets/images/nox-avatar.jpg')}
        style={{
          width: size,
          height: size,
          transform: [{ scale: 1.1 }],
        }}
        resizeMode="cover"
      />
    </View>
  );
}

export function NoxChatMascot({ size = 140 }: NoxMascotProps) {
  return (
    <Image
      source={require('../assets/images/nox-character.png')}
      style={{
        width: Math.round(size * 0.8),
        height: size,
      }}
      resizeMode="contain"
    />
  );
}

export function NoxMascot({ size = 170 }: NoxMascotProps) {
  return (
    <Image
      source={require('../assets/images/nox-onboarding.png')}
      style={{
        width: size,
        height: size,
      }}
      resizeMode="contain"
    />
  );
}

export function NoxMiniIcon({ size = 28 }: NoxMascotProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
      }}
    >
      <Image
        source={require('../assets/images/nox-avatar.jpg')}
        style={{
          width: size,
          height: size,
          transform: [{ scale: 1.1 }],
        }}
        resizeMode="cover"
      />
    </View>
  );
}

export function NoxSleepingMascot({ size = 84 }: NoxMascotProps) {
  return (
    <Image
      source={require('../assets/images/nox-sleeping.png')}
      style={{
        width: size,
        height: size,
      }}
      resizeMode="contain"
    />
  );
}

export function NoxSurprisedMascot({ size = 84 }: NoxMascotProps) {
  return (
    <Image
      source={require('../assets/images/nox-surprised.png')}
      style={{
        width: size,
        height: size,
      }}
      resizeMode="contain"
    />
  );
}

export function NoxThinkingIcon({ size = 38 }: NoxMascotProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
      }}
    >
      <Image
        source={require('../assets/images/nox-thinking.jpg')}
        style={{
          width: size,
          height: size,
          transform: [{ scale: 1.1 }],
        }}
        resizeMode="cover"
      />
    </View>
  );
}

export function NoxSplashMascot({ size = 140 }: NoxMascotProps) {
  return (
    <Image
      source={require('../assets/images/nox-splash.png')}
      style={{
        width: Math.round(size * 0.8),
        height: size,
      }}
      resizeMode="contain"
    />
  );
}
