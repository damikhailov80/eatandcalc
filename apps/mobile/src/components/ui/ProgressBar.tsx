import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme';

export type ProgressBarProps = {
  /** 0..1; clamped. */
  value: number;
  color?: string;
  height?: number;
};

/** Thin rounded progress track ("Сегодня 1 962 / 2 400 ккал"). */
export function ProgressBar({ value, color = colors.primary, height = 8 }: ProgressBarProps) {
  const width = `${Math.max(0, Math.min(1, value)) * 100}%` as const;
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width, height, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radii.pill, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { borderRadius: radii.pill },
});
