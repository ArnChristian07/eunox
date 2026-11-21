import React, { useCallback, useEffect, useRef } from 'react';
import { View, ViewProps } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { TourScreen, TourTargetId, useTour } from '@/context/TourContext';

interface TourTargetProps extends ViewProps {
  id: TourTargetId;
}

/** Marks a UI element the tutorial can spotlight. Renders a plain View. */
export function TourTarget({ id, children, ...rest }: TourTargetProps) {
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const { registerTarget, unregisterTarget } = useTour();

  useEffect(() => {
    registerTarget(id, ref);
    return () => unregisterTarget(id);
  }, [id, registerTarget, unregisterTarget]);

  return (
    <View ref={ref} collapsable={false} {...rest}>
      {children}
    </View>
  );
}

/** Tells the tutorial which screen is showing, so steps only appear on theirs. */
export function useTourScreen(screen: TourScreen) {
  const { setScreenFocused } = useTour();
  useFocusEffect(
    useCallback(() => {
      setScreenFocused(screen, true);
      return () => setScreenFocused(screen, false);
    }, [screen, setScreenFocused])
  );
}
