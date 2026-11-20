import {
  categoryLabels,
  energyCheck,
  formatInt,
  formatNumberInput,
  formatOne,
  nutrientsOf,
  parseNumberInput,
  PRODUCT_CATEGORIES,
  ProductDataSchema,
  RESTAURANTS,
  restaurantLabels,
  UNIT_KEYS,
  unitLong,
  unitShortFor,
  type ExtraUnit,
  type Nutrients,
  type ProductCategory,
  type ProductData,
  type Restaurant,
} from '@eatandcalc/shared';
import { StyleSheet, View } from 'react-native';

import { Card, Chip, NumberField, Text, TextField } from '@/components/ui';
import { colors, fonts, macroColors, radii, spacing } from '@/theme';

type NutrientKey = keyof Nutrients;

/** KBJU per 100 g as typed. */
export type NutrientsDraft = Record<NutrientKey, string>;

/** Form state: numbers stay as typed text until saving. */
export type ProductDraft = {
  name: string;
  category: ProductCategory;
  /** Set = a fast-food dish: a chain instead of a category, one portion (`pieceM`) instead of the units list. */
  restaurant: Restaurant | null;
  nutrients: NutrientsDraft;
  units: Record<ExtraUnit, string>;
};

const NUTRIENT_ROWS: { key: NutrientKey; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Калории', unit: 'ккал' },
  { key: 'protein', label: 'Белки', unit: 'г' },
  { key: 'fat', label: 'Жиры', unit: 'г' },
  { key: 'carbs', label: 'Углеводы', unit: 'г' },
];

const num = (n: number | undefined, digits = 1) => (n == null ? '' : formatNumberInput(n, digits));

export const nutrientsText = (n: Nutrients): NutrientsDraft => ({
  kcal: num(n.kcal),
  protein: num(n.protein),
  fat: num(n.fat),
  carbs: num(n.carbs),
});

export function toDraft(d: ProductData): ProductDraft {
  const units = {} as Record<ExtraUnit, string>;
  for (const key of UNIT_KEYS) units[key] = num(d.units[key], key === 'ml' ? 3 : 1);
  return {
    name: d.name,
    category: d.category,
    restaurant: d.restaurant ?? null,
    nutrients: nutrientsText(d.nutrients),
    units,
  };
}

/** "398 ккал · Б 0,0 · Ж 0,0 · У 99,7\nст. л. 25 г, ч. л. 8 г". */
export function productSummary(d: ProductData) {
  const n = d.nutrients;
  const units = UNIT_KEYS.filter((k) => d.units[k] != null)
    .map((k) => `${unitShortFor(k, d.restaurant)} ${formatNumberInput(d.units[k]!, k === 'ml' ? 3 : 1)} г`)
    .join(', ');
  return [
    `${formatInt(n.kcal)} ккал · Б ${formatOne(n.protein)} · Ж ${formatOne(n.fat)} · У ${formatOne(n.carbs)}`,
    units,
  ]
    .filter(Boolean)
    .join('\n');
}

export const blankDraft = (name = '', restaurant: Restaurant | null = null): ProductDraft => ({
  ...toDraft({ name, category: 'other', restaurant, nutrients: { kcal: 0, protein: 0, fat: 0, carbs: 0 }, units: {} }),
  nutrients: { kcal: '', protein: '', fat: '', carbs: '' },
});

/** Blank = 0 for nutrients and "no such unit" for units; null = something can't be parsed. */
const parseOr = (text: string, blank: number | undefined) => (text.trim() ? parseNumberInput(text) : blank);

/** Typed KBJU (blank = 0), or null when something can't be parsed. */
export function parseNutrientsDraft(d: NutrientsDraft): Nutrients | null {
  const out = {} as Nutrients;
  for (const { key } of NUTRIENT_ROWS) {
    const v = parseOr(d[key], 0);
    if (v == null) return null;
    out[key] = v;
  }
  return out;
}

/** Units the form edits: a fast-food dish has one portion size. */
const unitKeysOf = (d: Pick<ProductDraft, 'restaurant'>): readonly ExtraUnit[] =>
  d.restaurant ? ['pieceM'] : UNIT_KEYS;

/** Valid product data from the form, or null (then the save button stays disabled). */
export function fromDraft(d: ProductDraft): ProductData | null {
  const nutrients = parseNutrientsDraft(d.nutrients);
  if (!nutrients) return null;
  const units: ProductData['units'] = {};
  for (const key of unitKeysOf(d)) {
    const v = parseOr(d.units[key], undefined);
    if (v === null) return null;
    if (v) units[key] = v;
  }
  const parsed = ProductDataSchema.safeParse({
    name: d.name,
    category: d.category,
    restaurant: d.restaurant,
    nutrients,
    units,
  });
  return parsed.success ? parsed.data : null;
}

export type ProductFormProps = {
  value: ProductDraft;
  onChange: (value: ProductDraft) => void;
  /** Catalog values of a catalog product: while the form shows them, a mismatch is explained, not flagged. */
  reference?: Nutrients;
  /** A catalog dish keeps its chain: no chain chips. */
  restaurantFixed?: boolean;
};

/** Products: real data uses food-specific energy factors, so the check is looser than for norms. */
const PRODUCT_CHECK = { tolerance: 0.1, minKcal: 10 };

export const sameNutrients = (a: Nutrients, b: Nutrients) =>
  a.kcal === b.kcal && a.protein === b.protein && a.fat === b.fat && a.carbs === b.carbs;

export type NutrientsCardProps = {
  value: NutrientsDraft;
  onChange: (value: NutrientsDraft) => void;
  /** Values to explain rather than flag while the card shows them (catalog data). */
  reference?: Nutrients;
  /** Where the reference values come from: "… — так в <label>". */
  referenceLabel?: string;
};

/** "Пищевая ценность" card: KBJU per 100 g with an energy check. */
export function NutrientsCard({ value, onChange, reference, referenceLabel }: NutrientsCardProps) {
  const nutrients = parseNutrientsDraft(value);
  const check = nutrients && nutrients.kcal > 0 ? energyCheck(nutrients, PRODUCT_CHECK) : null;
  const fromReference = nutrients != null && reference != null && sameNutrients(nutrients, reference);
  return (
    <Card style={styles.card}>
      <View style={styles.cardHead}>
        <Text variant="h3">Пищевая ценность</Text>
        <Text variant="caption">на 100 г</Text>
      </View>
      {NUTRIENT_ROWS.map((row) => {
        const invalid = value[row.key].trim() !== '' && parseNumberInput(value[row.key]) == null;
        return (
          <View key={row.key} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: macroColors[row.key] }]} />
            <Text variant="bodyStrong" style={styles.flex}>{row.label}</Text>
            <NumberField
              label={row.label}
              value={value[row.key]}
              onChangeText={(t) => onChange({ ...value, [row.key]: t })}
              unit={row.unit}
              placeholder="0"
              invalid={invalid}
              style={styles.field}
            />
          </View>
        );
      })}
      {check && !check.close ? (
        <View style={[styles.note, { backgroundColor: fromReference ? colors.bg : colors.warnSoft }]}>
          {fromReference ? (
            <Text variant="caption" color={colors.textSecondary}>
              По БЖУ выходит {formatInt(check.fromMacros)} ккал — так в {referenceLabel}
            </Text>
          ) : (
            <Text variant="caption" style={styles.noteText} color={colors.warn}>
              По БЖУ выходит {formatInt(check.fromMacros)} ккал — расходится на {formatInt(Math.abs(check.diff))} ккал
            </Text>
          )}
        </View>
      ) : null}
    </Card>
  );
}

/**
 * ProductEdit mockup body: name, category, KBJU per 100 g with an energy check, units in grams.
 * A fast-food dish: chain instead of category, the weight of one portion instead of the units list.
 */
export function ProductForm({ value, onChange, reference, restaurantFixed }: ProductFormProps) {
  const set = <K extends keyof ProductDraft>(key: K, v: ProductDraft[K]) => onChange({ ...value, [key]: v });
  const nutrients = parseNutrientsDraft(value.nutrients);

  return (
    <>
      <TextField
        label="Название"
        value={value.name}
        onChangeText={(t) => set('name', t)}
        placeholder={value.restaurant ? 'Например, Чикенбургер' : 'Например, Сыр тофу копчёный'}
        maxLength={80}
        autoCapitalize="sentences"
      />

      {value.restaurant ? (
        restaurantFixed ? null : (
          <View style={styles.section}>
            <Text variant="label">Ресторан</Text>
            <View style={styles.wrap}>
              {RESTAURANTS.map((r) => (
                <Chip
                  key={r}
                  label={restaurantLabels[r]}
                  selected={r === value.restaurant}
                  onPress={() => set('restaurant', r)}
                />
              ))}
            </View>
          </View>
        )
      ) : (
        <View style={styles.section}>
          <Text variant="label">Категория</Text>
          <View style={styles.wrap}>
            {PRODUCT_CATEGORIES.map((c) => (
              <Chip key={c} label={categoryLabels[c]} selected={c === value.category} onPress={() => set('category', c)} />
            ))}
          </View>
        </View>
      )}

      <NutrientsCard
        value={value.nutrients}
        onChange={(n) => set('nutrients', n)}
        reference={reference}
        referenceLabel={value.restaurant ? 'таблице ресторана' : 'справочнике USDA'}
      />

      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <Text variant="h3">{value.restaurant ? 'Порция' : 'Единицы измерения'}</Text>
          <Text variant="caption">граммов в одной</Text>
        </View>
        {unitKeysOf(value).map((key) => {
          const text = value.units[key];
          const grams = parseOr(text, undefined);
          const kcal = nutrients && grams ? nutrientsOf({ nutrients, units: { [key]: grams } }, { amount: 1, unit: key }) : null;
          const label = value.restaurant ? '1 шт' : unitLong[key];
          return (
            <View key={key} style={styles.row}>
              <View style={styles.flex}>
                <Text variant="bodyStrong">{label}</Text>
                <Text variant="caption">
                  {kcal ? `${kcal.kcal < 10 ? formatOne(kcal.kcal) : formatInt(kcal.kcal)} ккал` : '—'}
                </Text>
              </View>
              <NumberField
                label={`${label}, граммов`}
                value={text}
                onChangeText={(t) => set('units', { ...value.units, [key]: t })}
                unit="г"
                placeholder="—"
                invalid={grams === null}
                style={styles.field}
              />
            </View>
          );
        })}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  card: { padding: 0, overflow: 'hidden', paddingBottom: spacing.sm },
  cardHead: { paddingTop: 14, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  dot: { width: 10, height: 10, borderRadius: 3 },
  field: { width: 112 },
  note: { marginHorizontal: spacing.lg, marginTop: spacing.xs, borderRadius: radii.sm, paddingVertical: spacing.sm, paddingHorizontal: 10 },
  noteText: { fontFamily: fonts.bodySemibold },
});
