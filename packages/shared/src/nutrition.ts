/**
 * Pure nutrition math. All screens must use these helpers instead of computing inline.
 * Formulas: CLAUDE.md → "Data model".
 */
import type { CookingItem, Id, Nutrients, Product, Quantity, RecipeItem, UnitKey } from './domain';

export const ZERO: Nutrients = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

export function scale(n: Nutrients, factor: number): Nutrients {
  return {
    kcal: n.kcal * factor,
    protein: n.protein * factor,
    fat: n.fat * factor,
    carbs: n.carbs * factor,
  };
}

export function add(a: Nutrients, b: Nutrients): Nutrients {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    carbs: a.carbs + b.carbs,
  };
}

export function sum(list: readonly Nutrients[]): Nutrients {
  return list.reduce(add, ZERO);
}

export function subtract(a: Nutrients, b: Nutrients): Nutrients {
  return add(a, scale(b, -1));
}

/** Grams of one unit of the product; `'g'` is always 1. Null if the product has no weight for that unit. */
export function unitGrams(product: Pick<Product, 'units'>, unit: UnitKey): number | null {
  if (unit === 'g') return 1;
  return product.units[unit] ?? null;
}

/** Weight in grams of a quantity, or null if it can't be converted. */
export function quantityGrams(product: Pick<Product, 'units'>, q: Quantity): number | null {
  const g = unitGrams(product, q.unit);
  return g == null ? null : g * q.amount;
}

/** Nutrients of a quantity of a product (nutrients are per 100 g). Null if the unit has no gram weight. */
export function nutrientsOf(product: Pick<Product, 'units' | 'nutrients'>, q: Quantity): Nutrients | null {
  const grams = quantityGrams(product, q);
  return grams == null ? null : scale(product.nutrients, grams / 100);
}

export type RecipeTotals = {
  /** Raw weight: sum of ingredient grams. */
  grams: number;
  nutrients: Nutrients;
  per100: Nutrients;
  /** Items left out of the sums: the product is gone or isn't measured in the item's unit any more. */
  missing: RecipeItem[];
};

/** Weight and nutrition of a recipe from the products as the family sees them now. */
export function recipeTotals(
  items: readonly RecipeItem[],
  productsById: ReadonlyMap<Id, Pick<Product, 'units' | 'nutrients'>>,
): RecipeTotals {
  let grams = 0;
  const parts: Nutrients[] = [];
  const missing: RecipeItem[] = [];
  for (const item of items) {
    const product = productsById.get(item.productId);
    const g = product ? quantityGrams(product, item) : null;
    if (product == null || g == null) {
      missing.push(item);
      continue;
    }
    grams += g;
    parts.push(scale(product.nutrients, g / 100));
  }
  const nutrients = sum(parts);
  return { grams, nutrients, per100: per100g(nutrients, grams), missing };
}

/** Grams of a cooking row from its frozen unit weights; 0 if the unit has no weight. */
export const cookingItemGrams = (item: Pick<CookingItem, 'units' | 'amount' | 'unit'>) => quantityGrams(item, item) ?? 0;

/** Weight of the finished dish: pot with food minus the empty pot. Null until weighed (or not above zero). */
export function cookedWeight(grossWeightG: number | null, potWeightG: number | null): number | null {
  if (grossWeightG == null) return null;
  const net = grossWeightG - (potWeightG ?? 0);
  return net > 0 ? net : null;
}

export type CookingTotals = {
  /** Sum of raw ingredient grams. */
  rawGrams: number;
  nutrients: Nutrients;
  /** Cooked weight when weighed, otherwise the raw weight. */
  weightG: number;
  weighed: boolean;
  /** Per 100 g of the finished dish (of the raw weight until weighed). */
  per100: Nutrients;
};

/** Weight and nutrition of a real pot from its frozen rows. */
export function cookingTotals(
  items: readonly Pick<CookingItem, 'units' | 'amount' | 'unit' | 'nutrients'>[],
  cookedG: number | null = null,
): CookingTotals {
  let rawGrams = 0;
  const parts: Nutrients[] = [];
  for (const item of items) {
    const g = cookingItemGrams(item);
    rawGrams += g;
    parts.push(scale(item.nutrients, g / 100));
  }
  const nutrients = sum(parts);
  const weighed = cookedG != null && cookedG > 0;
  const weightG = weighed ? cookedG : rawGrams;
  return { rawGrams, nutrients, weightG, weighed, per100: per100g(nutrients, weightG) };
}

/** Nutrients per 100 g of a finished dish. */
export function per100g(total: Nutrients, dishWeightG: number): Nutrients {
  return dishWeightG > 0 ? scale(total, 100 / dishWeightG) : ZERO;
}

export function perPortion(total: Nutrients, portions: number): Nutrients {
  return portions > 0 ? scale(total, 1 / portions) : ZERO;
}

/** What a person got from eating `gramsEaten` of a dish: total ÷ cooked weight × grams eaten. */
export function consumed(sessionTotal: Nutrients, cookedWeightG: number, gramsEaten: number): Nutrients {
  return cookedWeightG > 0 ? scale(sessionTotal, gramsEaten / cookedWeightG) : ZERO;
}

/** Norm minus eaten; negative values mean the norm is exceeded. */
export function remaining(norm: Nutrients, eaten: Nutrients): Nutrients {
  return subtract(norm, eaten);
}

/** Energy implied by macros (4/9/4 kcal per gram). Used to sanity-check entered values. */
export function kcalFromMacros(n: Pick<Nutrients, 'protein' | 'fat' | 'carbs'>): number {
  return n.protein * 4 + n.fat * 9 + n.carbs * 4;
}

export type EnergyCheck = {
  /** kcal implied by the macros. */
  fromMacros: number;
  /** Entered kcal minus `fromMacros`; positive = macros give less than the kcal norm. */
  diff: number;
  /** Within the tolerance (default 3 % of the entered kcal). */
  close: boolean;
  /** Share of each macro in `fromMacros`, 0..1. */
  shares: { protein: number; fat: number; carbs: number };
};

/**
 * Compares entered kcal with the energy of the entered macros (norms editor, product editor).
 * `tolerance` is a share of kcal, `minKcal` an absolute floor (products: real data uses food-specific
 * factors, so ±10 % / 10 kcal; norms: 3 %).
 */
export function energyCheck(n: Nutrients, { tolerance = 0.03, minKcal = 0 } = {}): EnergyCheck {
  const fromMacros = kcalFromMacros(n);
  const diff = n.kcal - fromMacros;
  const total = fromMacros || 1;
  return {
    fromMacros,
    diff,
    close: Math.abs(diff) <= Math.max(n.kcal * tolerance, minKcal),
    shares: { protein: (n.protein * 4) / total, fat: (n.fat * 9) / total, carbs: (n.carbs * 4) / total },
  };
}
