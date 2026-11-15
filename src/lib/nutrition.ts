/**
 * Pure nutrition math. All screens must use these helpers instead of computing inline.
 * Formulas: CLAUDE.md → "Data model".
 */
import type { CookingItem, Nutrients, Product, Quantity } from '@/types/domain';

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

/** Grams of one unit of the product; `'g'` is always 1. Null if the unit has no known weight. */
export function unitGrams(product: Product, unitId: Quantity['unitId']): number | null {
  if (unitId === 'g') return 1;
  return product.units.find((u) => u.id === unitId)?.grams ?? null;
}

/** Weight in grams of a quantity, or null if it can't be converted. */
export function quantityGrams(product: Product, q: Quantity): number | null {
  const g = unitGrams(product, q.unitId);
  return g == null ? null : g * q.amount;
}

/**
 * Nutrients of a quantity of a product. Works when the quantity is in the basis unit
 * (even without a gram weight, e.g. "2 шт") or when both units have gram weights.
 * Returns null if the units can't be related.
 */
export function nutrientsOf(product: Product, q: Quantity): Nutrients | null {
  if (q.unitId === product.basisUnitId) return scale(product.nutrients, q.amount);
  const basisG = unitGrams(product, product.basisUnitId);
  const grams = quantityGrams(product, q);
  if (basisG == null || grams == null || basisG === 0) return null;
  return scale(product.nutrients, grams / basisG);
}

export function cookingTotals(items: readonly CookingItem[]): Nutrients {
  return sum(items.map((i) => i.nutrients));
}

export function rawWeight(items: readonly { grams: number }[]): number {
  return items.reduce((s, i) => s + i.grams, 0);
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
