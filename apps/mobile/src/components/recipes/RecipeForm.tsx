import {
  formatGrams,
  formatInt,
  formatNumberInput,
  formatOne,
  parseNumberInput,
  quantityGrams,
  RecipeDataSchema,
  recipeTotals,
  UNIT_KEYS,
  unitGrams,
  unitShort,
  type Nutrients,
  type RecipeData,
  type RecipeItem,
  type UnitKey,
} from '@eatandcalc/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Chip, IconButton, MacroBar, NumberField, Text, TextField } from '@/components/ui';
import type { ProductsById } from '@/lib/recipes';
import { colors, fonts, radii, spacing } from '@/theme';

/** One ingredient while editing: the amount stays as typed text until saving. */
export type IngredientDraft = { key: string; productId: string; amount: string; unit: UnitKey };
export type RecipeDraft = { name: string; items: IngredientDraft[] };

let nextKey = 0;
const newKey = () => `i${nextKey++}`;

const amountText = (amount: number) => formatNumberInput(amount, 2);

export const toDraft = (d: RecipeData): RecipeDraft => ({
  name: d.name,
  items: d.items.map((i) => ({ key: newKey(), productId: i.productId, amount: amountText(i.amount), unit: i.unit })),
});

export const blankDraft = (name = ''): RecipeDraft => ({ name, items: [] });

/** A new ingredient: grams, amount typed by hand. */
export const newIngredient = (productId: string): IngredientDraft => ({ key: newKey(), productId, amount: '', unit: 'g' });

const parseAmount = (text: string) => {
  const v = parseNumberInput(text);
  return v != null && v > 0 ? v : null;
};

/** Ingredients that can already be counted (amount typed). */
const draftItems = (d: RecipeDraft): RecipeItem[] =>
  d.items.flatMap((i) => {
    const amount = parseAmount(i.amount);
    return amount == null ? [] : [{ productId: i.productId, amount, unit: i.unit }];
  });

/** Valid recipe data from the form, or null (then the save button stays disabled). */
export function fromDraft(d: RecipeDraft, products: ProductsById): RecipeData | null {
  const items = draftItems(d);
  if (items.length !== d.items.length) return null;
  // Every ingredient must still exist and have its unit (the server checks the same).
  if (items.some((i) => !products.has(i.productId) || unitGrams(products.get(i.productId)!, i.unit) == null)) {
    return null;
  }
  const parsed = RecipeDataSchema.safeParse({ name: d.name, items });
  return parsed.success ? parsed.data : null;
}

/** Units the product is measured in (grams first); the current one stays even if the product lost it. */
function unitsOf(units: Partial<Record<UnitKey, number>> | undefined, current: UnitKey): UnitKey[] {
  const list: UnitKey[] = ['g', ...UNIT_KEYS.filter((k) => units?.[k] != null)];
  return list.includes(current) ? list : [...list, current];
}

/** Same weight in another unit: 55 г → 1 шт, 2 ст. л. → 34 г. Blank stays blank. */
function convertAmount(text: string, product: Parameters<typeof quantityGrams>[0] | undefined, from: UnitKey, to: UnitKey) {
  const amount = parseAmount(text);
  const grams = product && amount != null ? quantityGrams(product, { amount, unit: from }) : null;
  const per = product ? unitGrams(product, to) : null;
  if (grams == null || per == null) return text;
  const v = grams / per;
  return amountText(to === 'g' ? Math.round(v) : Math.round(v * 10) / 10 || 0.1);
}

const kcalText = (kcal: number) => `${kcal < 10 ? formatOne(kcal) : formatInt(kcal)} ккал`;
const macrosText = (n: Nutrients) => `Б ${formatOne(n.protein)} · Ж ${formatOne(n.fat)} · У ${formatOne(n.carbs)}`;

type IngredientRowProps = {
  item: IngredientDraft;
  products: ProductsById;
  autoFocus: boolean;
  first: boolean;
  onChange: (item: IngredientDraft) => void;
  onRemove: () => void;
};

function IngredientRow({ item, products, autoFocus, first, onChange, onRemove }: IngredientRowProps) {
  const product = products.get(item.productId);
  const amount = parseAmount(item.amount);
  const grams = product && amount != null ? quantityGrams(product, { amount, unit: item.unit }) : null;
  const kcal = product && grams != null ? (product.nutrients.kcal * grams) / 100 : null;
  const unitMissing = product != null && unitGrams(product, item.unit) == null;
  const name = product?.name ?? 'Продукт удалён';

  return (
    <View style={[styles.item, !first && styles.divider]}>
      <View style={styles.itemHead}>
        <View style={styles.flex}>
          <Text variant="bodyStrong" color={product ? colors.text : colors.over}>{name}</Text>
          <Text variant="caption" color={unitMissing ? colors.over : undefined}>
            {unitMissing
              ? `Нет веса для «${unitShort[item.unit]}»`
              : grams != null && kcal != null
                ? `${formatGrams(grams)} · ${kcalText(kcal)}`
                : '—'}
          </Text>
        </View>
        <IconButton icon="close" variant="plain" color={colors.textMuted} label={`Убрать — ${name}`} onPress={onRemove} />
      </View>
      {product ? (
        <View style={styles.amountRow}>
          <NumberField
            label={`Количество — ${name}`}
            value={item.amount}
            onChangeText={(t) => onChange({ ...item, amount: t })}
            placeholder="0"
            invalid={item.amount.trim() !== '' && amount == null}
            autoFocus={autoFocus}
            style={styles.amount}
          />
          <View style={styles.units}>
            {unitsOf(product.units, item.unit).map((u) => (
              <Chip
                key={u}
                label={unitShort[u]}
                selected={u === item.unit}
                onPress={() =>
                  u !== item.unit &&
                  onChange({ ...item, unit: u, amount: convertAmount(item.amount, product, item.unit, u) })
                }
                style={styles.unitChip}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export type RecipeFormProps = {
  value: RecipeDraft;
  onChange: (value: RecipeDraft) => void;
  products: ProductsById;
  /** Opens the product picker; the picked product comes back through `onChange`. */
  onAddProduct: () => void;
  /** Key of a just-added ingredient: its amount field gets the focus. */
  focusKey?: string | null;
};

/** RecipeEdit mockup body: name, ingredients in their units, weight and KBJU per dish and per 100 g. */
export function RecipeForm({ value, onChange, products, onAddProduct, focusKey }: RecipeFormProps) {
  const totals = recipeTotals(draftItems(value), products);
  const n = totals.nutrients;
  const setItem = (i: number, item: IngredientDraft) =>
    onChange({ ...value, items: value.items.map((x, j) => (j === i ? item : x)) });
  const removeItem = (i: number) => onChange({ ...value, items: value.items.filter((_, j) => j !== i) });

  return (
    <>
      <TextField
        label="Название"
        value={value.name}
        onChangeText={(t) => onChange({ ...value, name: t })}
        placeholder="Например, Сырники"
        maxLength={80}
        autoCapitalize="sentences"
      />

      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <Text variant="h3">{`Ингредиенты · ${value.items.length}`}</Text>
          <Text variant="caption">{formatGrams(totals.grams)}</Text>
        </View>
        {value.items.map((item, i) => (
          <IngredientRow
            key={item.key}
            item={item}
            products={products}
            autoFocus={item.key === focusKey}
            first={i === 0}
            onChange={(next) => setItem(i, next)}
            onRemove={() => removeItem(i)}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={onAddProduct}
          style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
          <MaterialCommunityIcons name="plus" size={20} color={colors.primaryDark} />
          <Text variant="bodyStrong" color={colors.primaryDark}>Добавить продукт</Text>
        </Pressable>
      </Card>

      <Card style={styles.card}>
        <View style={styles.totalRow}>
          <View style={styles.flex}>
            <Text variant="h3">Всё блюдо</Text>
            <Text variant="caption">{formatGrams(totals.grams)}</Text>
          </View>
          <View style={styles.totalValue}>
            <Text style={styles.kcal}>{`${formatInt(n.kcal)} ккал`}</Text>
            <Text variant="caption">{macrosText(n)}</Text>
          </View>
        </View>
        <MacroBar nutrients={n} />
        <View style={[styles.totalRow, styles.divider, styles.per100]}>
          <Text variant="bodyStrong" style={styles.flex}>На 100 г</Text>
          <View style={styles.totalValue}>
            <Text variant="bodyStrong">{`${formatInt(totals.per100.kcal)} ккал`}</Text>
            <Text variant="caption">{macrosText(totals.per100)}</Text>
          </View>
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: { gap: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
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
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  totalValue: { alignItems: 'flex-end', gap: 2 },
  kcal: { fontFamily: fonts.headingHeavy, fontSize: 20 },
  per100: { marginTop: spacing.xs },
});
