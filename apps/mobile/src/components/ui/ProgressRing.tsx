import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

export type ProgressRingProps = {
  /** 0..1; clamped (over the norm draws a full ring, the caller picks the color). */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  /** Centered inside the ring ("82%"). */
  children?: ReactNode;
};

/**
 * Circular progress drawn with plain Views (no SVG in the app): a circle with two colored border sides is a
 * half-ring; two of them, each clipped to one half of the box and rotated, cover 0..360°.
 */
export function ProgressRing({ value, size = 60, stroke = 6, color = colors.primary, children }: ProgressRingProps) {
  const deg = Math.max(0, Math.min(1, value)) * 360;
  const circle = { width: size, height: size, borderRadius: size / 2, borderWidth: stroke };
  // The half-ring (top + right borders) covers the right half once rotated by 45°; rotating it back by 180° − θ
  // shows exactly 0..θ through the right-half clip, and θ..360° in the left one.
  const arc = (theta: number) => [
    styles.abs,
    circle,
    {
      borderTopColor: color,
      borderRightColor: color,
      borderBottomColor: 'transparent',
      borderLeftColor: 'transparent',
      transform: [{ rotate: `${45 + theta - 180}deg` }],
    },
  ];
  const half = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.abs, circle, { borderColor: colors.track }]} />
      {deg > 0 ? (
        <View style={[styles.clip, { left: half, width: half, height: size }]}>
          <View style={[arc(Math.min(deg, 180)), { left: -half }]} />
        </View>
      ) : null}
      {deg > 180 ? (
        <View style={[styles.clip, { left: 0, width: half, height: size }]}>
          <View style={arc(deg)} />
        </View>
      ) : null}
      <View style={[styles.abs, styles.center, { width: size, height: size }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', top: 0, left: 0 },
  clip: { position: 'absolute', top: 0, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
