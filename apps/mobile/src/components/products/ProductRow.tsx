import { categoryAbbr, formatInt, formatOne, nutrientsOf, restaurantAbbr, type ProductDto } from '@eatandcalc/shared';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton, Text, type IconName } from '@/components/ui';
import { categoryColors, colors, fonts, radii, restaurantColors, spacing } from '@/theme';

export type ProductRowAction = { icon: IconName; label: string; onPress: (product: ProductDto) => void };

export type ProductRowProps = {
  product: ProductDto;
  /** Rows of a list look like one card: the first and last round their corners. */
  first?: boolean;
  last?: boolean;
  /** Keep stable (useCallback): rows are memoized for long virtualized lists. */
  onPress?: (product: ProductDto) => void;
  /** ♥ after the kcal column (stable callback). */
  onToggleFavorite?: (product: ProductDto) => void;
  /** Trailing button instead of ♥ (reset in "Изменённые", restore in "Скрытые"). */
  action?: ProductRowAction;
};

/**
 * One line of the products list: category tile, name with badges, macros, kcal per 100 g.
 * A fast-food dish: chain tile, macros and kcal of one portion.
 */
export const ProductRow = memo(function ProductRow({
  product,
  first,
  last,
  onPress,
  onToggleFavorite,
  action,
}: ProductRowProps) {
  const portion = product.restaurant ? nutrientsOf(product, { amount: 1, unit: 'pieceM' }) : null;
  const n = portion ?? product.nutrients;
  const tile = product.restaurant ? restaurantColors[product.restaurant] : categoryColors[product.category];
  const abbr = product.restaurant ? restaurantAbbr[product.restaurant] : categoryAbbr[product.category];
  const badge = product.source === 'own' ? 'свой' : product.modified ? 'изменён' : null;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={() => onPress?.(product)}
      style={({ pressed }) => [
        styles.row,
        first ? styles.first : styles.divider,
        last && styles.last,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.tile, { backgroundColor: tile.bg }]}>
        <Text style={styles.abbr} color={tile.fg}>{abbr}</Text>
      </View>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <View style={styles.meta}>
          {badge ? (
            <View style={[styles.badge, product.source === 'own' ? styles.badgeOwn : styles.badgeModified]}>
              <Text style={styles.badgeText} color={product.source === 'own' ? colors.primaryDark : colors.warn}>
                {badge}
              </Text>
            </View>
          ) : null}
          <Text variant="caption">
            {`Б\u00A0${formatOne(n.protein)} · Ж\u00A0${formatOne(n.fat)} · У\u00A0${formatOne(n.carbs)}`}
          </Text>
        </View>
      </View>
      <View style={styles.kcal}>
        <Text style={styles.kcalValue}>{formatInt(n.kcal)} ккал</Text>
        <Text style={styles.basis} color={colors.textMuted}>
          {portion ? `за ${formatInt(product.units.pieceM ?? 0)} г` : 'на 100 г'}
        </Text>
      </View>
      {action ? (
        <IconButton icon={action.icon} label={`${action.label} — ${product.name}`} onPress={() => action.onPress(product)} />
      ) : onToggleFavorite ? (
        <IconButton
          icon={product.favorite ? 'heart' : 'heart-outline'}
          variant="plain"
          color={product.favorite ? colors.danger : colors.textDisabled}
          label={product.favorite ? `Убрать из избранного — ${product.name}` : `В избранное — ${product.name}`}
          accessibilityState={{ selected: product.favorite }}
          onPress={() => onToggleFavorite(product)}
          style={styles.heart}
        />
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
    backgroundColor: colors.surface,
  },
  first: { borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card },
  last: { borderBottomLeftRadius: radii.card, borderBottomRightRadius: radii.card },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  pressed: { backgroundColor: colors.bg },
  tile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  abbr: { fontFamily: fonts.bodyBold, fontSize: 12 },
  main: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bodySemibold, fontSize: 15 },
  // The macros move under the badge when they don't fit next to it.
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 2 },
  badge: { borderRadius: radii.pill, paddingHorizontal: 6, paddingVertical: 1 },
  badgeOwn: { backgroundColor: colors.primarySoft },
  badgeModified: { backgroundColor: colors.warnSoft },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 11 },
  kcal: { alignItems: 'flex-end', gap: 2 },
  kcalValue: { fontFamily: fonts.bodyBold, fontSize: 15 },
  basis: { fontSize: 11, fontFamily: fonts.body },
  heart: { marginRight: -spacing.sm },
});
