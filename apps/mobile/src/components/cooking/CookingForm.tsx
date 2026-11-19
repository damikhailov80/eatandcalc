import {
  cookedWeight,
  CookingDataSchema,
  cookingItemGrams,
  cookingTotals,
  formatDayTitle,
  formatGrams,
  formatInt,
  formatNumberInput,
  parseNumberInput,
  pluralRu,
  shiftISODate,
  todayISO,
  type CookingData,
  type CookingItemDto,
  type RecipeDto,
} from '@eatandcalc/shared';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  AddIngredientButton,
  amountText,
  IngredientRow,
  macrosText,
  parseAmount,
} from '@/components/recipes/IngredientRow';
import { newKey } from '@/components/recipes/RecipeForm';
import { Card, IconButton, MacroBar, NumberField, SegmentedControl, Text, TextField } from '@/components/ui';
import { RECIPE_SCALES, recipeDiff, rowsFromRecipe } from '@/lib/cooking';
import type { ProductsById } from '@/lib/recipes';
import { colors, fonts, radii, spacing } from '@/theme';

/** One row while editing: the frozen product copy plus the amount as typed. */
export type CookingRowDraft = { key: string; item: CookingItemDto; amount: string };
export type CookingDraft = Omit<CookingData, 'items' | 'potWeightG' | 'grossWeightG'> & {
  items: CookingRowDraft[];
  pot: string;
  gross: string;
};

const weightText = (g: number | null) => (g == null ? '' : formatNumberInput(g, 0));

export const toRowDraft = (item: CookingItemDto, amount = amountText(item.amount)): CookingRowDraft => ({
  key: newKey(),
  item,
  amount,
});

export const toCookingDraft = (d: CookingData): CookingDraft => ({
  name: d.name,
  date: d.date,
  recipeId: d.recipeId,
  recipeScale: d.recipeScale,
  copiedFromId: d.copiedFromId,
  items: d.items.map((i) => toRowDraft(i)),
  pot: weightText(d.potWeightG),
  gross: weightText(d.grossWeightG),
});

/** Rows that can already be counted (amount typed). */
const draftItems = (d: CookingDraft): CookingItemDto[] =>
  d.items.flatMap((r) => {
    const amount = parseAmount(r.amount);
    return amount == null ? [] : [{ ...r.item, amount }];
  });

/** Blank = not weighed; otherwise a number ≥ 0. Undefined = invalid text. */
function parseWeight(text: string): number | null | undefined {
  if (!text.trim()) return null;
  const v = parseNumberInput(text);
  return v == null ? undefined : v;
}

const weightsOf = (d: CookingDraft) => {
  const pot = parseWeight(d.pot);
  const gross = parseWeight(d.gross);
  const cooked = pot === undefined || gross === undefined ? null : cookedWeight(gross, pot);
  // Weighed, but the dish came out at zero or less: the pot weight is off.
  const wrong = gross != null && pot !== undefined && cooked == null;
  return { pot, gross, cooked, wrong };
};

/** Valid session data from the form, or null (then the save button stays disabled). */
export function fromCookingDraft(d: CookingDraft): CookingData | null {
  const items = draftItems(d);
  if (items.length !== d.items.length) return null;
  const { pot, gross, wrong } = weightsOf(d);
  if (pot === undefined || gross === undefined || wrong) return null;
  const parsed = CookingDataSchema.safeParse({
    name: d.name,
    date: d.date,
    recipeId: d.recipeId,
    recipeScale: d.recipeId ? (d.recipeScale ?? 1) : null,
    copiedFromId: d.copiedFromId,
    items,
    potWeightG: pot,
    grossWeightG: gross,
  });
  return parsed.success ? parsed.data : null;
}

const scaleOptions = RECIPE_SCALES.map((n) => ({ value: String(n), label: `×${n}` }));

export type CookingFormProps = {
  value: CookingDraft;
  onChange: (value: CookingDraft) => void;
  /** The recipe it was started from, as the family sees it now (for ×N and the comparison). */
  recipe: RecipeDto | undefined;
  products: ProductsById;
  onAddProduct: () => void;
  focusKey?: string | null;
};

/** CookingEdit mockup body: recipe ×N and comparison, name, date, rows, pot weights, totals and per 100 g. */
export function CookingForm({ value, onChange, recipe, products, onAddProduct, focusKey }: CookingFormProps) {
  const items = draftItems(value);
  const { cooked, wrong } = weightsOf(value);
  const totals = cookingTotals(items, cooked);
  const n = totals.nutrients;
  const scale = value.recipeScale ?? 1;
  const diff = recipe ? recipeDiff(items, recipe, scale, products) : null;
  const today = todayISO();
  // ×N resets the amounts to the recipe: offered freely only while nothing was changed by hand,
  // otherwise behind a confirmation, so exact weighed grams aren't lost by a stray tap.
  const [scaleUnlocked, setScaleUnlocked] = useState(false);
  const showScales = diff != null && (diff.changes === 0 || scaleUnlocked);
  const confirmUnlock = () =>
    diff &&
    Alert.alert(
      `Сбросить ${diff.changes} ${pluralRu(diff.changes, ['изменение', 'изменения', 'изменений'])} на рецепт?`,
      undefined,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Выбрать множитель', style: 'destructive', onPress: () => setScaleUnlocked(true) },
      ],
    );

  const setRow = (i: number, row: CookingRowDraft) =>
    onChange({ ...value, items: value.items.map((x, j) => (j === i ? row : x)) });
  const removeRow = (i: number) => onChange({ ...value, items: value.items.filter((_, j) => j !== i) });
  const pickScale = (next: number) => {
    if (!recipe) return;
    const rows = rowsFromRecipe(recipe, products, next, value.items.map((r) => r.item));
    onChange({ ...value, recipeScale: next, items: rows.map((r) => toRowDraft(r)) });
    setScaleUnlocked(false);
  };

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

      <View style={styles.dateRow}>
        <IconButton
          icon="chevron-left"
          variant="plain"
          label="День раньше"
          onPress={() => onChange({ ...value, date: shiftISODate(value.date, -1) })}
        />
        <Text variant="bodyStrong" style={styles.date}>{formatDayTitle(value.date, today)}</Text>
        <IconButton
          icon="chevron-right"
          variant="plain"
          label="День позже"
          disabled={value.date >= today}
          onPress={() => onChange({ ...value, date: shiftISODate(value.date, 1) })}
        />
      </View>

      {recipe && diff ? (
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Text variant="bodyStrong" style={styles.flex}>{`Рецепт «${recipe.name}»`}</Text>
            {showScales ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Множитель ×${scale}. Изменить`}
                hitSlop={8}
                onPress={confirmUnlock}
                style={({ pressed }) => [styles.badge, styles.badgeScale, pressed && styles.pressed]}>
                <Text style={styles.badgeText}>{`×${scale}`}</Text>
              </Pressable>
            )}
            <View style={[styles.badge, diff.changes ? styles.badgeChanged : styles.badgeSame]}>
              <Text style={styles.badgeText} color={diff.changes ? colors.warn : colors.primaryDark}>
                {diff.changes ? `изменено: ${diff.changes}` : 'как в рецепте'}
              </Text>
            </View>
          </View>
          {showScales ? (
            <SegmentedControl
              accessibilityLabel="Сколько порций рецепта"
              options={scaleOptions}
              value={String(scale)}
              onChange={(v) => pickScale(Number(v))}
            />
          ) : null}
        </Card>
      ) : null}

      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <Text variant="h3">{`Состав · ${value.items.length}`}</Text>
          <Text variant="caption">{`сырой вес ${formatGrams(totals.rawGrams)}`}</Text>
        </View>
        {value.items.map((row, i) => {
          const base = row.item.productId ? diff?.baseGrams.get(row.item.productId) : undefined;
          const now = parseAmount(row.amount);
          const nowGrams = now == null ? null : cookingItemGrams({ ...row.item, amount: now });
          return (
            <IngredientRow
              key={row.key}
              product={row.item}
              amount={row.amount}
              unit={row.item.unit}
              hint={diff ? (base == null ? 'нет в рецепте' : `в рецепте ${formatGrams(base)}`) : undefined}
              hintChanged={diff != null && (base == null || nowGrams == null || Math.abs(nowGrams - base) > 0.5)}
              autoFocus={row.key === focusKey}
              first={i === 0}
              onChange={(next) => setRow(i, { ...row, amount: next.amount, item: { ...row.item, unit: next.unit } })}
              onRemove={() => removeRow(i)}
            />
          );
        })}
        <AddIngredientButton onPress={onAddProduct} />
      </Card>

      <Card style={styles.card}>
        <Text variant="h3">Вес готового блюда</Text>
        <View style={styles.weights}>
          <View style={styles.weight}>
            <Text variant="caption">Посуда</Text>
            <NumberField
              label="Вес пустой посуды"
              unit="г"
              value={value.pot}
              onChangeText={(t) => onChange({ ...value, pot: t })}
              placeholder="0"
              invalid={wrong}
            />
          </View>
          <View style={styles.weight}>
            <Text variant="caption">С едой</Text>
            <NumberField
              label="Вес посуды с едой"
              unit="г"
              value={value.gross}
              onChangeText={(t) => onChange({ ...value, gross: t })}
              placeholder="—"
              invalid={wrong}
            />
          </View>
        </View>
        <View style={[styles.totalRow, styles.divider]}>
          <Text variant="bodyStrong" style={styles.flex}>Готовое блюдо</Text>
          <Text style={styles.cooked} color={wrong ? colors.over : colors.text}>
            {cooked != null ? formatGrams(cooked) : '—'}
          </Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.totalRow}>
          <View style={styles.flex}>
            <Text variant="h3">Всё блюдо</Text>
            <Text variant="caption">{formatGrams(totals.weightG)}</Text>
          </View>
          <View style={styles.totalValue}>
            <Text style={styles.kcal}>{`${formatInt(n.kcal)} ккал`}</Text>
            <Text variant="caption">{macrosText(n)}</Text>
          </View>
        </View>
        <MacroBar nutrients={n} />
        <View style={[styles.totalRow, styles.divider, styles.per100]}>
          <View style={[styles.flex, styles.per100Title]}>
            <Text variant="bodyStrong">На 100 г</Text>
            {totals.weighed ? null : (
              <View style={[styles.badge, styles.badgeChanged]}>
                <Text style={styles.badgeText} color={colors.warn}>сырой вес</Text>
              </View>
            )}
          </View>
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
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { flex: 1, textAlign: 'center' },
  badge: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeSame: { backgroundColor: colors.primarySoft },
  badgeChanged: { backgroundColor: colors.warnSoft },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 12 },
  badgeScale: { backgroundColor: colors.track, paddingHorizontal: 10, paddingVertical: 4 },
  pressed: { opacity: 0.7 },
  weights: { flexDirection: 'row', gap: spacing.md },
  weight: { flex: 1, gap: 4 },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  totalValue: { alignItems: 'flex-end', gap: 2 },
  kcal: { fontFamily: fonts.headingHeavy, fontSize: 20 },
  cooked: { fontFamily: fonts.bodyBold, fontSize: 18 },
  per100: { marginTop: spacing.xs },
  per100Title: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
