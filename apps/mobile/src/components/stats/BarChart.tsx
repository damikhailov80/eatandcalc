import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, fonts, radii } from '@/theme';

export type Bar = {
  key: string;
  value: number;
  color: string;
  /** Axis label under the bar (only some bars have one). */
  label?: string;
};

export type BarChartProps = {
  bars: readonly Bar[];
  /** Horizontal line (e.g. the kcal norm). */
  norm?: number;
  height?: number;
  selected?: string | null;
  onSelect?: (key: string | null) => void;
};

/** Column chart drawn with Views (no SVG): bars from the baseline, a norm line, labels below; tap selects. */
export function BarChart({ bars, norm = 0, height = 140, selected, onSelect }: BarChartProps) {
  const max = Math.max(norm * 1.15, ...bars.map((b) => b.value), 1);
  const gap = bars.length > 14 ? 2 : 8;
  return (
    <View>
      <View style={[styles.plot, { height, gap }]}>
        {bars.map((b) => {
          const dim = selected != null && selected !== b.key;
          return (
            <Pressable
              key={b.key}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === b.key }}
              onPress={() => onSelect?.(selected === b.key ? null : b.key)}
              style={styles.column}>
              <View
                style={[
                  styles.bar,
                  { height: `${(b.value / max) * 100}%`, backgroundColor: b.color, opacity: dim ? 0.35 : 1 },
                ]}
              />
            </Pressable>
          );
        })}
        {norm > 0 ? <View pointerEvents="none" style={[styles.norm, { bottom: (norm / max) * height }]} /> : null}
      </View>
      <View style={[styles.labels, { gap }]}>
        {bars.map((b) => (
          <View key={b.key} style={styles.labelCell}>
            {b.label ? (
              <Text style={styles.label} color={colors.textMuted} numberOfLines={1}>
                {b.label}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: colors.border },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: radii.sm / 3, borderTopRightRadius: radii.sm / 3, minHeight: 2 },
  norm: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: colors.text, opacity: 0.55 },
  labels: { flexDirection: 'row', marginTop: 4 },
  labelCell: { flex: 1, alignItems: 'center' },
  label: { width: 36, textAlign: 'center', fontSize: 11, fontFamily: fonts.bodyMedium, fontVariant: ['tabular-nums'] },
});
