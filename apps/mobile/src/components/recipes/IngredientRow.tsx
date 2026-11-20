import {
  formatGrams,
  formatInt,
  formatNumberInput,
  formatOne,
  parseNumberInput,
  quantityGrams,
  UNIT_KEYS,
  unitGrams,
  unitShort,
  type Nutrients,
  type ProductUnits,
  type UnitKey,
} from '@eatandcalc/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip, IconButton, NumberField, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

/** What a row needs of its product: the live one (recipes) or a frozen copy (cooking). */
export type MeasuredProduct = { name: string; units: ProductUnits; nutrients: Nutrients };

export const amountText = (amount: number) => formatNumberInput(amount, 2);

/** A typed amount above zero, or null. */
export const parseAmount = (text: string) => {
  const v = parseNumberInput(text);
  return v != null && v > 0 ? v : null;
};

/** Units the product is measured in (grams first); the current one stays even if the product lost it. */
function unitsOf(units: ProductUnits | undefined, current: UnitKey): UnitKey[] {
  const list: UnitKey[] = ['g', ...UNIT_KEYS.filter((k) => units?.[k] != null)];
  return list.includes(current) ? list : [...list, current];
}

/** Same weight in another unit: 55 г → 1 шт, 2 ст. л. → 34 г. Blank stays blank. */
function convertAmount(text: string, product: MeasuredProduct, from: UnitKey, to: UnitKey) {
  const amount = parseAmount(text);
  const grams = amount != null ? quantityGrams(product, { amount, unit: from }) : null;
  const per = unitGrams(product, to);
  if (grams == null || per == null) return text;
  const v = grams / per;
  return amountText(to === 'g' ? Math.round(v) : Math.round(v * 10) / 10 || 0.1);
}

export const kcalText = (kcal: number) => `${kcal < 10 ? formatOne(kcal) : formatInt(kcal)} ккал`;
export const macrosText = (n: Nutrients) => `Б ${formatOne(n.protein)} · Ж ${formatOne(n.fat)} · У ${formatOne(n.carbs)}`;

export type IngredientRowProps = {
  /** Undefined = the product is gone (recipes only). */
  product: MeasuredProduct | undefined;
  amount: string;
  unit: UnitKey;
  /** Extra line under the weight ("в рецепте 150 г"); `hintChanged` paints it as a change. */
  hint?: string;
  hintChanged?: boolean;
  autoFocus: boolean;
  first: boolean;
  onChange: (next: { amount: string; unit: UnitKey }) => void;
  onRemove: () => void;
  /** Edit the row's own name and KBJU (cooking only); `edited` marks a row that differs from its product. */
  onEdit?: () => void;
  edited?: boolean;
};

/** Ingredient: name, weight and kcal, KBJU per 100 g, amount field with unit chips (switching a unit keeps the weight). */
export function IngredientRow({
  product,
  amount: text,
  unit,
  hint,
  hintChanged,
  autoFocus,
  first,
  onChange,
  onRemove,
  onEdit,
  edited,
}: IngredientRowProps) {
  const amount = parseAmount(text);
  const grams = product && amount != null ? quantityGrams(product, { amount, unit }) : null;
  const kcal = product && grams != null ? (product.nutrients.kcal * grams) / 100 : null;
  const unitMissing = product != null && unitGrams(product, unit) == null;
  const name = product?.name ?? 'Продукт удалён';

  return (
    <View style={[styles.item, !first && styles.divider]}>
      <View style={styles.itemHead}>
        <View style={styles.flex}>
          <Text variant="bodyStrong" color={product ? colors.text : colors.over}>{name}</Text>
          <Text variant="caption" color={unitMissing ? colors.over : undefined}>
            {unitMissing
              ? `Нет веса для «${unitShort[unit]}»`
              : grams != null && kcal != null
                ? `${formatGrams(grams)} · ${kcalText(kcal)}`
                : '—'}
          </Text>
          {product ? (
            <Text variant="caption" color={colors.textMuted}>
              {`100 г: ${kcalText(product.nutrients.kcal)} · ${macrosText(product.nutrients)}`}
            </Text>
          ) : null}
          {hint ? (
            <Text variant="caption" color={hintChanged ? colors.warn : colors.textMuted}>{hint}</Text>
          ) : null}
        </View>
        {onEdit ? (
          <IconButton
            icon={edited ? 'pencil' : 'pencil-outline'}
            variant="plain"
            color={edited ? colors.warn : colors.textMuted}
            label={`Изменить — ${name}`}
            onPress={onEdit}
          />
        ) : null}
        <IconButton icon="close" variant="plain" color={colors.textMuted} label={`Убрать — ${name}`} onPress={onRemove} />
      </View>
      {product ? (
        <View style={styles.amountRow}>
          <NumberField
            label={`Количество — ${name}`}
            value={text}
            onChangeText={(t) => onChange({ amount: t, unit })}
            placeholder="0"
            invalid={text.trim() !== '' && amount == null}
            autoFocus={autoFocus}
            style={styles.amount}
          />
          <View style={styles.units}>
            {unitsOf(product.units, unit).map((u) => (
              <Chip
                key={u}
                label={unitShort[u]}
                selected={u === unit}
                onPress={() => u !== unit && onChange({ unit: u, amount: convertAmount(text, product, unit, u) })}
                style={styles.unitChip}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Dashed "Добавить продукт" button under the ingredient rows. */
export function AddIngredientButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
      <MaterialCommunityIcons name="plus" size={20} color={colors.primaryDark} />
      <Text variant="bodyStrong" color={colors.primaryDark}>Добавить продукт</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  item: { gap: spacing.sm, paddingTop: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginRight: -spacing.sm },
  amountRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  amount: { width: 92, minWidth: 92 },
  units: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4 },
  unitChip: { height: 36, paddingHorizontal: 12 },
  add: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.dashed,
    marginTop: spacing.xs,
  },
  pressed: { opacity: 0.7 },
});
