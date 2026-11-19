import { categoryAbbr, formatInt, formatOne, type ProductDto } from '@eatandcalc/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { categoryColors, colors, fonts, spacing } from '@/theme';

export type ProductRowProps = {
  product: ProductDto;
  first?: boolean;
  onPress?: () => void;
};

/** One line of the products list: category tile, name, macros, kcal per 100 g. */
export function ProductRow({ product, first, onPress }: ProductRowProps) {
  const { nutrients: n } = product;
  const tile = categoryColors[product.category];
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && styles.pressed]}>
      <View style={[styles.tile, { backgroundColor: tile.bg }]}>
        <Text style={styles.abbr} color={tile.fg}>{categoryAbbr[product.category]}</Text>
      </View>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text variant="caption">
          Б {formatOne(n.protein)} · Ж {formatOne(n.fat)} · У {formatOne(n.carbs)}
        </Text>
      </View>
      <View style={styles.kcal}>
        <Text style={styles.kcalValue}>{formatInt(n.kcal)} ккал</Text>
        <Text style={styles.basis} color={colors.textMuted}>на 100 г</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  pressed: { backgroundColor: colors.bg },
  tile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  abbr: { fontFamily: fonts.bodyBold, fontSize: 12 },
  main: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bodySemibold, fontSize: 15 },
  kcal: { alignItems: 'flex-end', gap: 2 },
  kcalValue: { fontFamily: fonts.bodyBold, fontSize: 15 },
  basis: { fontSize: 11, fontFamily: fonts.body },
});
