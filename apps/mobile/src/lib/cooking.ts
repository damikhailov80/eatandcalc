import {
  cookedWeight,
  cookingItemGrams,
  cookingTotals,
  matchesSearch,
  quantityGrams,
  type CookingDto,
  type CookingItemDto,
  type CookingTotals,
  type ProductDto,
  type RecipeDto,
  type RecipeItem,
  todayISO,
  type CookingData,
} from '@eatandcalc/shared';

import type { ProductsById } from '@/lib/recipes';

/** Multipliers offered for a recipe (×1..×4). */
export const RECIPE_SCALES = [1, 2, 3, 4] as const;

/** A row frozen from the product as the family sees it now. */
export const snapshotOf = (p: ProductDto, amount: number, unit: CookingItemDto['unit']): CookingItemDto => ({
  productId: p.id,
  name: p.name,
  nutrients: p.nutrients,
  units: p.units,
  amount,
  unit,
});

/**
 * Rows of a recipe × `scale`. A row already in `keep` (same product) keeps its frozen copy, only the amount changes;
 * other products are taken as they are now. Products gone or without the recipe's unit are left out.
 */
export function rowsFromRecipe(
  recipe: Pick<RecipeDto, 'items'>,
  products: ProductsById,
  scale: number,
  keep: readonly CookingItemDto[] = [],
): CookingItemDto[] {
  const kept = new Map(keep.flatMap((i) => (i.productId ? [[i.productId, i] as const] : [])));
  return recipe.items.flatMap((item) => {
    const amount = item.amount * scale;
    const old = kept.get(item.productId);
    if (old && (item.unit === 'g' || old.units[item.unit] != null)) return [{ ...old, amount, unit: item.unit }];
    const p = products.get(item.productId);
    if (!p || quantityGrams(p, item) == null) return [];
    return [snapshotOf(p, amount, item.unit)];
  });
}

/** Grams of the recipe item × scale, measured with the row's own unit weights (falls back to the live product). */
function recipeGrams(item: RecipeItem, scale: number, row: CookingItemDto | undefined, products: ProductsById) {
  const q = { amount: item.amount * scale, unit: item.unit };
  const fromRow = row ? quantityGrams(row, q) : null;
  if (fromRow != null) return fromRow;
  const p = products.get(item.productId);
  return p ? quantityGrams(p, q) : null;
}

export type RecipeDiff = {
  /** Recipe grams (× scale) per product id present in the recipe. */
  baseGrams: ReadonlyMap<string, number>;
  /** Rows added, removed or with another weight than the recipe × scale. */
  changes: number;
};

/** How a pot differs from its recipe × scale ("как в рецепте" / "изменено: N"). */
export function recipeDiff(
  items: readonly Pick<CookingItemDto, 'productId' | 'units' | 'amount' | 'unit'>[],
  recipe: Pick<RecipeDto, 'items'>,
  scale: number,
  products: ProductsById,
): RecipeDiff {
  const rows = new Map(items.flatMap((i) => (i.productId ? [[i.productId, i as CookingItemDto] as const] : [])));
  const baseGrams = new Map<string, number>();
  let changes = 0;
  for (const item of recipe.items) {
    const row = rows.get(item.productId);
    const g = recipeGrams(item, scale, row, products);
    if (g != null) baseGrams.set(item.productId, g);
    if (!row) changes++;
    else if (g == null || Math.abs(cookingItemGrams(row) - g) > 0.5) changes++;
  }
  const inRecipe = new Set(recipe.items.map((i) => i.productId));
  changes += items.filter((i) => !i.productId || !inRecipe.has(i.productId)).length;
  return { baseGrams, changes };
}

/** "Приготовить снова": the same rows (frozen copies as they are), weights and origin, cooked today. */
export const copyOfSession = (s: CookingDto): CookingData => ({
  name: s.name,
  date: todayISO(),
  recipeId: s.recipeId,
  recipeScale: s.recipeScale,
  copiedFromId: s.id,
  items: s.items,
  potWeightG: s.potWeightG,
  grossWeightG: s.grossWeightG,
});

/** What a cooking card shows. */
export type CookingView = {
  session: CookingDto;
  totals: CookingTotals;
  /** "По рецепту", "По рецепту · изменено 2", "Копия", "Без рецепта". */
  source: string;
};

export function toCookingView(
  session: CookingDto,
  recipes: ReadonlyMap<string, RecipeDto>,
  products: ProductsById,
): CookingView {
  const totals = cookingTotals(session.items, cookedWeight(session.grossWeightG, session.potWeightG));
  const recipe = session.recipeId ? recipes.get(session.recipeId) : undefined;
  let source = 'Без рецепта';
  if (session.copiedFromId && !recipe) source = 'Копия';
  else if (recipe) {
    const { changes } = recipeDiff(session.items, recipe, session.recipeScale ?? 1, products);
    source = changes ? `По рецепту · изменено ${changes}` : 'По рецепту';
  } else if (session.recipeId) source = 'По рецепту';
  return { session, totals, source };
}

export const filterCooking = (list: readonly CookingDto[], query: string) =>
  query.trim() ? list.filter((s) => matchesSearch(s.name, query)) : list;

/** Flat list for a FlatList: a day title before each day's sessions (the list comes sorted by date). */
export type CookingListRow = { kind: 'day'; date: string } | { kind: 'session'; view: CookingView };

export function withDayTitles(views: readonly CookingView[]): CookingListRow[] {
  const rows: CookingListRow[] = [];
  let day: string | null = null;
  for (const view of views) {
    if (view.session.date !== day) {
      day = view.session.date;
      rows.push({ kind: 'day', date: day });
    }
    rows.push({ kind: 'session', view });
  }
  return rows;
}
