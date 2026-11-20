import React from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

interface NoxMascotProps {
  size?: number;
}

export function NoxMascot({ size = 128 }: NoxMascotProps) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 128 140" fill="none">
      {/* Stem */}
      <Path
        d="M64 26V10"
        stroke="#141413"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Leaf */}
      <Path
        d="M65 13C72 7 82 8 86 14C80 18 71 18 65 13Z"
        fill="#141413"
      />
      {/* Body */}
      <Circle
        cx="64"
        cy="78"
        r="50"
        fill="#C5EC4B"
        stroke="#141413"
        strokeWidth="4.5"
      />
      {/* Left eye */}
      <Ellipse cx="48" cy="73" rx="5.5" ry="8" fill="#141413" />
      {/* Right eye */}
      <Ellipse cx="80" cy="73" rx="5.5" ry="8" fill="#141413" />
      {/* Smile */}
      <Path
        d="M52 91C56.5 96.5 71.5 96.5 76 91"
        stroke="#141413"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function NoxMiniIcon({ size = 28 }: NoxMascotProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Circle
        cx="14"
        cy="14"
        r="12"
        fill="#C5EC4B"
        stroke="#141413"
        strokeWidth="1.8"
      />
      <Circle cx="10.2" cy="12.2" r="1.5" fill="#141413" />
      <Circle cx="17.8" cy="12.2" r="1.5" fill="#141413" />
      <Path
        d="M10.5 16.5C12 18.5 16 18.5 17.5 16.5"
        stroke="#141413"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function NoxSleepingMascot({ size = 84 }: NoxMascotProps) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 128 140" fill="none">
      <Path
        d="M64 26V10"
        stroke="#141413"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <Path
        d="M65 13C72 7 82 8 86 14C80 18 71 18 65 13Z"
        fill="#141413"
      />
      <Circle
        cx="64"
        cy="78"
        r="50"
        fill="#C5EC4B"
        stroke="#141413"
        strokeWidth="5"
      />
      {/* Closed eyes */}
      <Path
        d="M40 72C43 77 51 77 54 72"
        stroke="#141413"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <Path
        d="M74 72C77 77 85 77 88 72"
        stroke="#141413"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Neutral mouth */}
      <Path
        d="M57 93H71"
        stroke="#141413"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function NoxSurprisedMascot({ size = 84 }: NoxMascotProps) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 128 140" fill="none">
      <Path
        d="M64 26V10"
        stroke="#141413"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <Path
        d="M65 13C72 7 82 8 86 14C80 18 71 18 65 13Z"
        fill="#141413"
      />
      <Circle
        cx="64"
        cy="78"
        r="50"
        fill="#C5EC4B"
        stroke="#141413"
        strokeWidth="5"
      />
      <Ellipse cx="48" cy="72" rx="5.5" ry="8" fill="#141413" />
      <Ellipse cx="80" cy="72" rx="5.5" ry="8" fill="#141413" />
      <Circle cx="64" cy="93" r="5.5" fill="#141413" />
    </Svg>
  );
}

export function NoxThinkingIcon({ size = 38 }: NoxMascotProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 38 38" fill="none">
      <Path
        d="M19 6V2.5"
        stroke="#141413"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path d="M19.5 3.5C21.5 2 24 2.2 25 3.8C23.2 4.8 21 4.8 19.5 3.5Z" fill="#141413" />
      <Circle
        cx="19"
        cy="20"
        r="14"
        fill="#C5EC4B"
        stroke="#141413"
        strokeWidth="2"
      />
      <Path d="M12.5 18H16" stroke="#141413" strokeWidth="2" strokeLinecap="round" />
      <Path d="M22 18H25.5" stroke="#141413" strokeWidth="2" strokeLinecap="round" />
      <Path d="M16.5 24H21.5" stroke="#141413" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function NoxSplashMascot({ size = 104 }: NoxMascotProps) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 128 140" fill="none">
      {/* White Stem */}
      <Path
        d="M64 26V10"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* White Leaf */}
      <Path
        d="M65 13C72 7 82 8 86 14C80 18 71 18 65 13Z"
        fill="#FFFFFF"
      />
      {/* Body with White Outline */}
      <Circle
        cx="64"
        cy="78"
        r="50"
        fill="#C5EC4B"
        stroke="#FFFFFF"
        strokeWidth="5"
      />
      {/* Eyes */}
      <Ellipse cx="48" cy="73" rx="5.5" ry="8" fill="#141413" />
      <Ellipse cx="80" cy="73" rx="5.5" ry="8" fill="#141413" />
      {/* Smile */}
      <Path
        d="M52 91C56.5 96.5 71.5 96.5 76 91"
        stroke="#141413"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}
