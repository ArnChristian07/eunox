import React from 'react';
import { Text } from 'react-native';

/**
 * Visible label above a form field. Placeholders vanish once a field has a value,
 * so every field also needs a label that stays on screen.
 */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[12.5px] font-medium text-warm-gray mb-1.5">{children}</Text>
  );
}
