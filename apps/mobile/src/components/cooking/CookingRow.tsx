import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatGrams, formatInt, formatOne } from '@eatandcalc/shared';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MacroBar, Text } from '@/components/ui';
import type { CookingView } from '@/lib/cooking';
import { colors, fonts, radii, shadow, spacing } from '@/theme';

export type CookingRowProps = {
  view: CookingView;
  /** Keep stable (useCallback): rows are memoized for the virtualized list. */
  onPress?: (view: CookingView) => void;
  /** "Приготовить снова"; keep stable as well. */
  onRepeat?: (view: CookingView) => void;
};

/** Cooking card: name and kcal of the pot, where it came from, macro bar, weight and kcal per 100 g. */
export const CookingRow = memo(function CookingRow({ view, onPress, onRepeat }: CookingRowProps) {
  const { session, totals, source } = view;
  const n = totals.nutrients;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={() => onPress?.(view)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.title}>
        <Text style={styles.name}>{session.name}</Text>
        <Text style={styles.kcal}>{formatInt(n.kcal)} ккал</Text>
      </View>
      <Text variant="caption">{source}</Text>
      <MacroBar nutrients={n} />
      <View style={styles.meta}>
        {totals.weighed ? null : (
          <View style={styles.badge}>
            <Text style={styles.badgeText} color={colors.warn}>не взвешено</Text>
          </View>
        )}
        <Text style={styles.metaText} color={colors.textSecondary}>
          {`${formatGrams(totals.weightG)} · ${formatInt(totals.per100.kcal)} ккал на 100 г`}
        </Text>
        <Text style={styles.metaText} color={colors.textSecondary}>
          {`Б ${formatOne(n.protein)} · Ж ${formatOne(n.fat)} · У ${formatOne(n.carbs)}`}
        </Text>
      </View>
      {onRepeat ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Приготовить снова — ${session.name}`}
          hitSlop={6}
          onPress={() => onRepeat(view)}
          style={({ pressed }) => [styles.repeat, pressed && styles.repeatPressed]}>
          <MaterialCommunityIcons name="repeat" size={16} color={colors.primaryDark} />
          <Text style={styles.repeatText} color={colors.primaryDark}>Приготовить снова</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  pressed: { backgroundColor: colors.bg },
  title: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  name: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 16 },
  kcal: { fontFamily: fonts.bodyBold, fontSize: 15 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 2 },
  metaText: { fontSize: 12, fontFamily: fonts.body },
  repeat: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    marginLeft: -10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  repeatPressed: { backgroundColor: colors.primarySoft },
  repeatText: { fontFamily: fonts.bodySemibold, fontSize: 13 },
  badge: { borderRadius: radii.pill, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: colors.warnSoft },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 11 },
});
