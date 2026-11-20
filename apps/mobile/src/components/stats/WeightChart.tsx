import { fromISODate, formatOne, type MemberWeightDto } from '@eatandcalc/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Text } from '@/components/ui';
import { colors, fonts } from '@/theme';

export type WeightChartProps = {
  /** Records inside `from..to`, by date ascending. */
  points: readonly MemberWeightDto[];
  from: string;
  to: string;
  color: string;
  height?: number;
  /** Axis labels under the plot (`[date, text]`, e.g. month starts). */
  ticks?: readonly (readonly [string, string])[];
  selected?: string | null;
  onSelect?: (date: string | null) => void;
};

const DOT = 8;
const HIT = 24;
const PAD_KG = 0.5;
const DAY_MS = 86_400_000;

/** Weight line chart drawn with Views (no SVG): x by date over `from..to`, y from min to max ±0,5 kg; tap selects. */
export function WeightChart({ points, from, to, color, height = 120, ticks = [], selected, onSelect }: WeightChartProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const kgs = points.map((p) => p.kg);
  const min = Math.min(...kgs) - PAD_KG;
  const max = Math.max(...kgs) + PAD_KG;
  const t0 = fromISODate(from).getTime();
  const span = Math.max(DAY_MS, fromISODate(to).getTime() - t0);
  const xOf = (date: string) => DOT / 2 + ((fromISODate(date).getTime() - t0) / span) * (width - DOT);
  const yOf = (kg: number) => DOT / 2 + ((max - kg) / (max - min)) * (height - DOT);
  const xy = points.map((p) => ({ ...p, x: xOf(p.date), y: yOf(p.kg) }));

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        <View style={[styles.axis, { height }]}>
          <Text style={styles.axisText} color={colors.textMuted}>{formatOne(max)}</Text>
          <Text style={styles.axisText} color={colors.textMuted}>{formatOne(min)}</Text>
        </View>
        <View style={styles.flex}>
          <View style={[styles.plot, { height }]} onLayout={onLayout}>
            {width > 0
              ? xy.slice(1).map((b, i) => {
                  const a = xy[i]!;
                  const dx = b.x - a.x;
                  const dy = b.y - a.y;
                  const len = Math.hypot(dx, dy);
                  return (
                    <View
                      key={`l${b.date}`}
                      pointerEvents="none"
                      style={[
                        styles.line,
                        {
                          backgroundColor: color,
                          width: len,
                          left: (a.x + b.x) / 2 - len / 2,
                          top: (a.y + b.y) / 2 - 1,
                          transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                        },
                      ]}
                    />
                  );
                })
              : null}
            {width > 0
              ? xy.map((p) => {
                  const on = selected === p.date;
                  return (
                    <Pressable
                      key={p.date}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.date} · ${formatOne(p.kg)} кг`}
                      accessibilityState={{ selected: on }}
                      onPress={() => onSelect?.(on ? null : p.date)}
                      style={[styles.hit, { left: p.x - HIT / 2, top: p.y - HIT / 2 }]}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: on ? colors.text : color },
                          on && styles.dotOn,
                          selected != null && !on && styles.dim,
                        ]}
                      />
                    </Pressable>
                  );
                })
              : null}
          </View>
          <View style={styles.ticks}>
            {width > 0
              ? ticks.map(([date, label]) => (
                  <Text
                    key={date}
                    style={[styles.tick, { left: xOf(date) - TICK_W / 2 }]}
                    color={colors.textMuted}
                    numberOfLines={1}>
                    {label}
                  </Text>
                ))
              : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const TICK_W = 36;

const styles = StyleSheet.create({
  root: {},
  body: { flexDirection: 'row', gap: 6 },
  flex: { flex: 1 },
  axis: { justifyContent: 'space-between' },
  axisText: { fontSize: 11, fontFamily: fonts.bodyMedium, fontVariant: ['tabular-nums'] },
  plot: { borderBottomWidth: 1, borderBottomColor: colors.border },
  line: { position: 'absolute', height: 2, borderRadius: 1 },
  hit: { position: 'absolute', width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  dotOn: { width: DOT + 4, height: DOT + 4, borderRadius: (DOT + 4) / 2 },
  dim: { opacity: 0.45 },
  ticks: { height: 16, marginTop: 4 },
  tick: {
    position: 'absolute',
    width: TICK_W,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
  },
});
