/**
 * Pure nutrition math. All screens must use these helpers instead of computing inline.
 * Formulas: CLAUDE.md → "Data model".
 */
import type { CookingItem, Nutrients, Product, Quantity, UnitKey } from './domain';

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
