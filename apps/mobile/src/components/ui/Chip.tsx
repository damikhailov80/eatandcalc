import { Pressable, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useSwipeLockZone } from '@/lib/swipeLock';
import { colors, fonts, radii, spacing } from '@/theme';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

/** Filter pill: white with a border, dark when selected. 36 high, hit area extended to 44. */
export function Chip({ label, selected, onPress, style }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={{ top: 4, bottom: 4 }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed, style]}>
      <Text style={styles.label} color={selected ? colors.chipActiveFg : colors.text}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Horizontally scrolling chip row that bleeds to the screen edges (inside `Screen`'s padding). */
export function ChipRow({ children }: { children: ReactNode }) {
  const swipeLockZone = useSwipeLockZone();
  return (
    <ScrollView
      horizontal
      {...swipeLockZone}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.row}
      contentContainerStyle={styles.rowContent}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.chipActiveBg, borderColor: colors.chipActiveBg },
  pressed: { opacity: 0.7 },
  label: { fontFamily: fonts.bodySemibold, fontSize: 13 },
  row: { marginHorizontal: -spacing.xl, flexGrow: 0 },
  rowContent: { paddingHorizontal: spacing.xl, gap: 6 },
});
