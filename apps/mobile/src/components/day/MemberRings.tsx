import { formatInt, type FamilyMemberDto, type Nutrients } from '@eatandcalc/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, ProgressRing, Text } from '@/components/ui';
import { eatenOf } from '@/lib/day';
import { colors, fonts, spacing } from '@/theme';

export type MemberRingsProps = {
  members: readonly FamilyMemberDto[];
  eaten: ReadonlyMap<string, Nutrients>;
};

/** "Калории за день": the family total and a kcal ring per member (eaten / norm, "ещё N" or over). */
export function MemberRings({ members, eaten }: MemberRingsProps) {
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
      <Text variant="h3">Калории за день</Text>
      <View style={styles.rings}>
        {members.map((m) => {
          const kcal = eatenOf(eaten, m.id).kcal;
          const norm = m.norms.kcal;
          const left = norm - kcal;
          const over = left < 0;
          return (
            <View key={m.id} style={styles.member}>
              <ProgressRing value={norm > 0 ? kcal / norm : 0} color={over ? colors.over : colors.primary}>
                <Text style={styles.pct}>{norm > 0 ? `${formatInt((kcal / norm) * 100)}%` : '—'}</Text>
              </ProgressRing>
              <Text style={styles.name} numberOfLines={1}>{m.name}</Text>
              <Text style={styles.kcal} color={colors.textSecondary}>
                {`${formatInt(kcal)} / ${formatInt(norm)}`}
              </Text>
              <Text style={styles.left} color={over ? colors.over : colors.textMuted}>
                {over ? `+${formatInt(-left)}` : `ещё ${formatInt(left)}`}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  rings: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  member: { width: '25%', alignItems: 'center', gap: 2 },
  pct: { fontFamily: fonts.bodyBold, fontSize: 13 },
  name: { fontFamily: fonts.bodySemibold, fontSize: 13, marginTop: 4 },
  kcal: { fontSize: 11, fontFamily: fonts.body },
  left: { fontSize: 11, fontFamily: fonts.bodySemibold },
});
