import { formatInt, type FamilyMemberDto, type Nutrients } from '@eatandcalc/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, MemberAvatar, ProgressBar, Text } from '@/components/ui';
import { eatenOf } from '@/lib/day';
import { colors, fonts, macroColors, spacing } from '@/theme';

const MACROS = [
  { key: 'protein', short: 'Б' },
  { key: 'fat', short: 'Ж' },
  { key: 'carbs', short: 'У' },
] as const;

export type DayTotalsProps = {
  members: readonly FamilyMemberDto[];
  eaten: ReadonlyMap<string, Nutrients>;
  /** Tapping a member opens their day (`day/member`). */
  date: string;
};

const share = (eaten: number, norm: number) => (norm > 0 ? eaten / norm : 0);

/** "Итоги дня": per member a kcal bar (eaten / norm, "ещё N" or "+N") and Б / Ж / У bars. */
export function DayTotals({ members, eaten, date }: DayTotalsProps) {
  if (!members.length) {
    return (
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/family')}>
        <Card>
          <Text variant="h3">Добавьте членов семьи</Text>
        </Card>
      </Pressable>
    );
  }
  return (
    <Card style={styles.card}>
      <Text variant="h3">Итоги дня</Text>
      {members.map((m) => {
        const e = eatenOf(eaten, m.id);
        const norm = m.norms.kcal;
        const left = norm - e.kcal;
        const over = left < 0;
        return (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityLabel={`Итоги дня — ${m.name}`}
            onPress={() => router.push({ pathname: '/day/member', params: { id: m.id, date } })}
            style={({ pressed }) => [styles.member, pressed && styles.pressed]}>
            <View style={styles.head}>
              <MemberAvatar name={m.name} color={m.color} size={32} />
              <Text style={styles.name} numberOfLines={1}>{m.name}</Text>
              <Text style={styles.kcal}>
                <Text style={styles.kcalValue} color={over ? colors.over : colors.text}>{formatInt(e.kcal)}</Text>
                <Text style={styles.kcal} color={colors.textMuted}>{` / ${formatInt(norm)} ккал`}</Text>
              </Text>
            </View>
            <View style={styles.kcalRow}>
              <View style={styles.bar}>
                <ProgressBar value={share(e.kcal, norm)} height={10} color={over ? colors.over : colors.primary} />
              </View>
              <Text style={styles.left} color={over ? colors.over : colors.textSecondary}>
                {over ? `+${formatInt(-left)}` : `ещё ${formatInt(left)}`}
              </Text>
            </View>
            <View style={styles.macros}>
              {MACROS.map(({ key, short }) => {
                const value = e[key];
                const mnorm = m.norms[key];
                const mover = mnorm > 0 && value > mnorm;
                return (
                  <View key={key} style={styles.macro}>
                    <Text style={styles.macroText} color={mover ? colors.over : colors.textSecondary}>
                      <Text style={styles.macroName} color={mover ? colors.over : macroColors[key]}>{`${short} `}</Text>
                      {`${formatInt(value)}/${formatInt(mnorm)}`}
                    </Text>
                    <ProgressBar
                      value={share(value, mnorm)}
                      height={4}
                      color={mover ? colors.over : macroColors[key]}
                    />
                  </View>
                );
              })}
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  member: { gap: spacing.sm },
  pressed: { opacity: 0.6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 15 },
  kcal: { fontFamily: fonts.body, fontSize: 13, fontVariant: ['tabular-nums'] },
  kcalValue: { fontFamily: fonts.bodyBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  kcalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bar: { flex: 1 },
  left: {
    minWidth: 64,
    textAlign: 'right',
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  macros: { flexDirection: 'row', gap: spacing.md },
  macro: { flex: 1, gap: 4 },
  macroText: { fontFamily: fonts.body, fontSize: 12, fontVariant: ['tabular-nums'] },
  macroName: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
