import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDayMonth, formatInt, fromISODate, type MemberNormDto } from '@eatandcalc/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, IconButton, Text } from '@/components/ui';
import { colors, fonts, radii, spacing } from '@/theme';

export type NormHistoryCardProps = {
  /** Records by date ascending. */
  history: readonly MemberNormDto[];
  today: string;
  onOpen: (date: string) => void;
  onAdd: () => void;
};

const since = (iso: string, today: string) => {
  const date = fromISODate(iso);
  const year = iso.slice(0, 4) === today.slice(0, 4) ? '' : ` ${date.getFullYear()}`;
  return `с ${formatDayMonth(date)}${year}`;
};

/** The member's norm records, newest first; the one in effect today is badged, a tap opens it. */
export function NormHistoryCard({ history, today, onOpen, onAdd }: NormHistoryCardProps) {
  const current = history.filter((r) => r.date <= today).at(-1)?.date ?? history[0]?.date;
  const rows = [...history].reverse();
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text variant="h3" style={styles.flex}>Дневные нормы</Text>
        <IconButton icon="plus" label="Новая норма" onPress={onAdd} />
      </View>
      {rows.map((r) => (
        <Pressable
          key={r.date}
          accessibilityRole="button"
          accessibilityLabel={`Норма ${since(r.date, today)}`}
          onPress={() => onOpen(r.date)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={styles.flex}>
            <View style={styles.titleRow}>
              <Text variant="bodyStrong">{since(r.date, today)}</Text>
              {r.date === current ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} color={colors.primaryDark}>сейчас</Text>
                </View>
              ) : null}
            </View>
            <Text variant="caption">
              {`${formatInt(r.norms.kcal)} ккал · Б ${formatInt(r.norms.protein)} · Ж ${formatInt(
                r.norms.fat,
              )} · У ${formatInt(r.norms.carbs)} г`}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  flex: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingVertical: 10,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  pressed: { backgroundColor: colors.bg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { backgroundColor: colors.primarySoft, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 1 },
  badgeText: { fontSize: 11, fontFamily: fonts.bodySemibold },
});
