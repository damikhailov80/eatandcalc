import { formatGrams, formatInt, formatOne } from '@eatandcalc/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton, MacroBar, Text, type IconName } from '@/components/ui';
import type { RecipeView } from '@/lib/recipes';
import { colors, fonts, radii, shadow, spacing } from '@/theme';

export type RecipeRowAction = { icon: IconName; label: string; onPress: (view: RecipeView) => void };

export type RecipeRowProps = {
  view: RecipeView;
  /** Keep stable (useCallback): rows are memoized for the virtualized list. */
  onPress?: (view: RecipeView) => void;
  onToggleFavorite?: (view: RecipeView) => void;
  /** Trailing button instead of ♥ (reset in "Изменённые", restore in "Скрытые"). */
  action?: RecipeRowAction;
};

/** Recipe card: name and kcal of the whole dish, ingredients, macro bar, raw weight and kcal per 100 g. */
export const RecipeRow = memo(function RecipeRow({ view, onPress, onToggleFavorite, action }: RecipeRowProps) {
  const { recipe, totals, ingredients } = view;
  const n = totals.nutrients;
  const badge = recipe.source === 'own' ? 'свой' : recipe.modified ? 'изменён' : null;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={() => onPress?.(view)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.main}>
        <View style={styles.title}>
          <Text style={styles.name}>{recipe.name}</Text>
          {totals.missing.length > 0 ? (
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={18}
              color={colors.over}
              accessibilityLabel="Не у всех продуктов есть вес"
            />
          ) : null}
          <Text style={styles.kcal}>{formatInt(n.kcal)} ккал</Text>
        </View>
        <Text variant="caption" numberOfLines={3}>{ingredients}</Text>
        <MacroBar nutrients={n} />
        <View style={styles.meta}>
          {badge ? (
            <View style={[styles.badge, recipe.source === 'own' ? styles.badgeOwn : styles.badgeModified]}>
              <Text style={styles.badgeText} color={recipe.source === 'own' ? colors.primaryDark : colors.warn}>
                {badge}
              </Text>
            </View>
          ) : null}
          <Text style={styles.metaText} color={colors.textSecondary}>
            {`${formatGrams(totals.grams)} · ${formatInt(totals.per100.kcal)} ккал на 100 г`}
          </Text>
          <Text style={styles.metaText} color={colors.textSecondary}>
            {`Б ${formatOne(n.protein)} · Ж ${formatOne(n.fat)} · У ${formatOne(n.carbs)}`}
          </Text>
        </View>
      </View>
      {action ? (
        <IconButton
          icon={action.icon}
          label={`${action.label} — ${recipe.name}`}
          onPress={() => action.onPress(view)}
          style={styles.action}
        />
      ) : onToggleFavorite ? (
        <IconButton
          icon={recipe.favorite ? 'heart' : 'heart-outline'}
          variant="plain"
          color={recipe.favorite ? colors.danger : colors.textDisabled}
          label={recipe.favorite ? `Убрать из избранного — ${recipe.name}` : `В избранное — ${recipe.name}`}
          accessibilityState={{ selected: recipe.favorite }}
          onPress={() => onToggleFavorite(view)}
          style={styles.heart}
        />
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    ...shadow.card,
  },
  pressed: { backgroundColor: colors.bg },
  main: { flex: 1, minWidth: 0, gap: spacing.sm },
  title: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  name: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 16 },
  kcal: { fontFamily: fonts.bodyBold, fontSize: 15 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 2 },
  metaText: { fontSize: 12, fontFamily: fonts.body },
  badge: { borderRadius: radii.pill, paddingHorizontal: 6, paddingVertical: 1 },
  badgeOwn: { backgroundColor: colors.primarySoft },
  badgeModified: { backgroundColor: colors.warnSoft },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 11 },
  heart: { marginTop: -10, marginRight: -spacing.sm },
  action: { marginTop: -6 },
});
