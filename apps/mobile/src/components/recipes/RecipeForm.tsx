import {
  formatGrams,
  formatInt,
  RecipeDataSchema,
  recipeTotals,
  unitGrams,
  type RecipeData,
  type RecipeItem,
  type UnitKey,
} from '@eatandcalc/shared';
import { StyleSheet, View } from 'react-native';

import { Card, MacroBar, Text, TextField } from '@/components/ui';
import type { ProductsById } from '@/lib/recipes';
import { colors, fonts, spacing } from '@/theme';
import { AddIngredientButton, amountText, IngredientRow, macrosText, parseAmount } from './IngredientRow';

/** One ingredient while editing: the amount stays as typed text until saving. */
export type IngredientDraft = { key: string; productId: string; amount: string; unit: UnitKey };
export type RecipeDraft = { name: string; items: IngredientDraft[] };

let nextKey = 0;
export const newKey = () => `i${nextKey++}`;

export const toDraft = (d: RecipeData): RecipeDraft => ({
  name: d.name,
  items: d.items.map((i) => ({ key: newKey(), productId: i.productId, amount: amountText(i.amount), unit: i.unit })),
});

export const blankDraft = (name = ''): RecipeDraft => ({ name, items: [] });

/** A new ingredient: grams, amount typed by hand. */
export const newIngredient = (productId: string): IngredientDraft => ({ key: newKey(), productId, amount: '', unit: 'g' });

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
            product={products.get(item.productId)}
            amount={item.amount}
            unit={item.unit}
            autoFocus={item.key === focusKey}
            first={i === 0}
            onChange={(next) => setItem(i, { ...item, ...next })}
            onRemove={() => removeItem(i)}
          />
        ))}
        <AddIngredientButton onPress={onAddProduct} />
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
  divider: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  totalValue: { alignItems: 'flex-end', gap: 2 },
  kcal: { fontFamily: fonts.headingHeavy, fontSize: 20 },
  per100: { marginTop: spacing.xs },
});
