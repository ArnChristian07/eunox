import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { stepMatchesScreen, TOUR_STEPS, useTour } from '@/context/TourContext';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SPOT_PADDING = 6;
const SPOT_RADIUS = 22;
const CARD_GAP = 14;
const SIDE_GUTTER = 16;
/** Rough tip-card height, used to choose which side of the spotlight it fits on. */
const CARD_HEIGHT = 250;
const MEASURE_INTERVAL = 300;
/** Polls (~1s) a target may be missing before the step's ifMissing kicks in. */
const MISSING_LIMIT = 4;

/** Rounded-rect path, used as the hole in the dimmed backdrop. */
function roundedRect({ x, y, width: w, height: h }: Rect, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  return [
    `M${x + rr},${y}`,
    `H${x + w - rr}`,
    `A${rr},${rr} 0 0 1 ${x + w},${y + rr}`,
    `V${y + h - rr}`,
    `A${rr},${rr} 0 0 1 ${x + w - rr},${y + h}`,
    `H${x + rr}`,
    `A${rr},${rr} 0 0 1 ${x},${y + h - rr}`,
    `V${y + rr}`,
    `A${rr},${rr} 0 0 1 ${x + rr},${y}`,
    'Z',
  ].join(' ');
}

/**
 * Hands-on tutorial overlay. Dims the app and spotlights the current step's
 * element. On action steps, touches inside the spotlight reach the real UI so
 * the user can do the task themselves. Rendered once at the root.
 */
export function TourOverlay() {
  const { active, stepIndex, satisfied, screen, next, goToStep, finish, getTarget } =
    useTour();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Tagged with the step it was measured for, so a stale box is never drawn.
  const [measured, setMeasured] = useState<{ key: string; rect: Rect } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // The tip card must stay above the keyboard (e.g. while asking Nox).
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const step = TOUR_STEPS[stepIndex];
  const onScreen = !!step && stepMatchesScreen(step, screen);
  const rect = step && measured?.key === step.key ? measured.rect : null;

  // Keep re-measuring while the step shows: layouts shift with the keyboard,
  // scrolling and entry animations.
  useEffect(() => {
    if (!active || !step || !onScreen || !step.target) return;
    const target = step.target;
    let cancelled = false;
    let misses = 0;

    const measure = () => {
      const node = getTarget(target)?.current;
      if (!node) {
        misses += 1;
        if (misses === MISSING_LIMIT && step.ifMissing) goToStep(step.ifMissing);
        setMeasured((m) => (m?.key === step.key ? null : m));
        return;
      }
      misses = 0;
      node.measureInWindow((x, y, width, height) => {
        if (cancelled) return;
        if (width <= 0 || height <= 0) return;
        setMeasured((m) =>
          m?.key === step.key &&
          m.rect.x === x &&
          m.rect.y === y &&
          m.rect.width === width &&
          m.rect.height === height
            ? m
            : { key: step.key, rect: { x, y, width, height } }
        );
      });
    };

    const first = setTimeout(measure, 250);
    const interval = setInterval(measure, MEASURE_INTERVAL);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [active, step, onScreen, getTarget, goToStep]);

  // Android back button ends the tutorial instead of navigating mid-step.
  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      finish();
      return true;
    });
    return () => sub.remove();
  }, [active, finish]);

  if (!active || !step || !onScreen) return null;
  // Waiting for the target to lay out (e.g. during a screen transition).
  if (step.target && !rect) return null;

  const isHandsOn = !!step.waitFor;
  const waiting = isHandsOn && !satisfied;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const handleNext = isLast ? finish : next;

  // Spotlight, clipped to the visible window so tall targets still fit.
  let spot: Rect | null = null;
  if (rect) {
    const top = Math.max(insets.top, rect.y - SPOT_PADDING);
    const bottom = Math.min(screenH, rect.y + rect.height + SPOT_PADDING);
    spot = {
      x: Math.max(4, rect.x - SPOT_PADDING),
      y: top,
      width: Math.min(screenW - 8, rect.width + SPOT_PADDING * 2),
      height: Math.max(0, bottom - top),
    };
  }

  // Card goes below the spotlight if it fits, else above, else pinned to the
  // bottom of the screen (for very tall targets).
  let cardPosition: { top?: number; bottom?: number };
  if (!spot) {
    cardPosition = { top: insets.top + 72 };
  } else {
    const visibleBottom = keyboardHeight > 0 ? screenH - keyboardHeight : screenH - insets.bottom;
    const spaceBelow = visibleBottom - (spot.y + spot.height) - CARD_GAP;
    const spaceAbove = spot.y - insets.top - CARD_GAP;
    if (spaceBelow >= CARD_HEIGHT) cardPosition = { top: spot.y + spot.height + CARD_GAP };
    else if (spaceAbove >= CARD_HEIGHT) cardPosition = { bottom: screenH - spot.y + CARD_GAP };
    else cardPosition = { bottom: screenH - visibleBottom + 16 };
  }

  const full = `M0,0 H${screenW} V${screenH} H0 Z`;
  const hole = spot ? roundedRect(spot, SPOT_RADIUS) : '';

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Dimmed backdrop with a hole around the target (visual only). */}
      <Svg
        width={screenW}
        height={screenH}
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Path
          d={`${full} ${hole}`}
          fill={spot ? 'rgba(20,20,19,0.72)' : 'rgba(20,20,19,0.25)'}
          fillRule="evenodd"
        />
        {spot ? (
          <Path d={hole} fill="none" stroke="#C5EC4B" strokeWidth={2.5} />
        ) : null}
      </Svg>

      {/* Touch blockers. Hands-on steps leave the spotlight open so the real
          button underneath can be used; info steps block everything. */}
      {spot && isHandsOn ? (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: spot.y }} />
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: spot.y + spot.height,
              bottom: 0,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: 0,
              width: spot.x,
              top: spot.y,
              height: spot.height,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: spot.x + spot.width,
              right: 0,
              top: spot.y,
              height: spot.height,
            }}
          />
        </>
      ) : spot ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      ) : null}

      <Animated.View
        key={step.key}
        entering={FadeIn.duration(220)}
        style={[{ position: 'absolute', left: SIDE_GUTTER, right: SIDE_GUTTER }, cardPosition]}
        className="bg-white rounded-3xl p-4 border border-warm-border"
        accessibilityLiveRegion="polite"
      >
        <View className="flex-row items-center gap-2.5">
          <NoxMiniIcon size={26} />
          <Text className="flex-1 text-[16px] font-bold text-charcoal">{step.title}</Text>
          <Text className="text-[12.5px] font-medium text-warm-gray">
            {stepIndex + 1} of {TOUR_STEPS.length}
          </Text>
        </View>
        <Text className="mt-2 text-[14px] leading-[20px] text-warm-gray">{step.body}</Text>

        {/* Full-width actions, stacked so long hints never overflow the card. */}
        <View className="mt-4">
          {waiting ? (
            <View className="flex-row items-center justify-center gap-2 bg-nox-lime rounded-full px-5 h-[54px]">
              <View className="w-2 h-2 rounded-full bg-charcoal" />
              <Text
                numberOfLines={1}
                className="flex-shrink text-[16px] font-semibold text-charcoal"
              >
                {step.hint}
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={handleNext}
              accessibilityRole="button"
              className="bg-charcoal rounded-full h-[54px] items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[16px] font-semibold">
                {isLast ? 'Finish' : 'Next'}
              </Text>
            </Pressable>
          )}

          {!isLast ? (
            <Pressable
              onPress={finish}
              accessibilityRole="button"
              className="mt-1 py-3 items-center active:opacity-60"
            >
              <Text className="text-[15px] font-semibold text-warm-gray">Skip tutorial</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}
