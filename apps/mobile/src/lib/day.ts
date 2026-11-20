import {
  dishConsumed,
  dishUnitShort,
  eatenByMember,
  formatGrams,
  formatNumberInput,
  fromISODate,
  sum,
  shiftISODate,
  ZERO,
  unitGrams,
  UNIT_KEYS,
  type ConsumptionDto,
  type DishUnit,
  type MealDishDto,
  type MealDto,
  type Nutrients,
  type ProductUnits,
} from '@eatandcalc/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query';

export type MealType = MealDto['type'];

export const MEAL_TITLES: Record<MealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

/** Shown on every day, even with nothing planned (stored only with the first dish); one of each per day. */
const STANDARD: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Monday of the week the date falls in. */
export function weekStart(iso: string): string {
  const day = (fromISODate(iso).getDay() + 6) % 7; // Monday = 0
  return shiftISODate(iso, -day);
}

export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => shiftISODate(monday, i));

/** A meal card of the day: stored, or an empty standard one (`meal` null). */
export type MealSlot = {
  key: string;
  type: MealType;
  title: string;
  meal: MealDto | null;
};

/** The day's meal cards: breakfast, lunch, dinner, snack (stored or empty). */
export function daySlots(meals: readonly MealDto[], date: string): MealSlot[] {
  const own = meals.filter((m) => m.date === date);
  const slots: MealSlot[] = [];
  for (const type of STANDARD) {
    const stored = own.filter((m) => m.type === type);
    if (!stored.length) slots.push({ key: type, type, title: MEAL_TITLES[type], meal: null });
    for (const meal of stored) slots.push({ key: meal.id, type, title: MEAL_TITLES[type], meal });
  }
  return slots;
}

/** What each member ate on the date (optionally without one dish, e.g. the one being edited). */
export function dayEaten(meals: readonly MealDto[], date: string, exceptDishId?: string): Map<string, Nutrients> {
  const own = meals
    .filter((m) => m.date === date)
    .map((m) => ({ dishes: m.dishes.filter((d) => d.id !== exceptDishId) }));
  return eatenByMember(own);
}

export const eatenOf = (eaten: ReadonlyMap<string, Nutrients>, memberId: string) => eaten.get(memberId) ?? ZERO;

export const findDish = (meals: readonly MealDto[], dishId: string) => {
  for (const meal of meals) {
    const dish = meal.dishes.find((d) => d.id === dishId);
    if (dish) return { meal, dish };
  }
  return null;
};

/** "1 шт (сред.)", "1 порц." when entered in a unit, otherwise "150 г". */
export const amountText = (c: ConsumptionDto) =>
  c.unit && c.unit !== 'g' && c.amount != null
    ? `${formatNumberInput(c.amount)} ${dishUnitShort(c.unit)}`
    : formatGrams(c.grams);

export type MemberLine = { dish: MealDishDto; amount: string; eaten: Nutrients };
export type MemberMeal = { key: string; title: string; lines: MemberLine[]; eaten: Nutrients };

/** What the member ate in each meal of the date (meals in the day's order, only those with their dishes). */
export function memberMeals(meals: readonly MealDto[], date: string, memberId: string): MemberMeal[] {
  const result: MemberMeal[] = [];
  for (const slot of daySlots(meals, date)) {
    const lines: MemberLine[] = [];
    for (const dish of slot.meal?.dishes ?? [])
      for (const c of dish.consumptions)
        if (c.memberId === memberId)
          lines.push({ dish, amount: amountText(c), eaten: dishConsumed(dish.nutrients, c.grams) });
    if (lines.length) result.push({ key: slot.key, title: slot.title, lines, eaten: sum(lines.map((l) => l.eaten)) });
  }
  return result;
}

/** What a dish is served from (one of the ids). */
export type DishSource = { sessionId?: string; recipeId?: string; productId?: string };

/** Who ate how much the last time (up to `date`) the same session / recipe / product was served; null if never. */
export function lastSplit(meals: readonly MealDto[], source: DishSource, date: string): ConsumptionDto[] | null {
  let last: { date: string; consumptions: ConsumptionDto[] } | null = null;
  for (const meal of meals) {
    if (meal.date > date || (last && meal.date < last.date)) continue;
    for (const d of meal.dishes) {
      const same =
        (source.sessionId && d.sessionId === source.sessionId) ||
        (source.recipeId && d.recipeId === source.recipeId) ||
        (source.productId && d.productId === source.productId);
      if (same && d.consumptions.length) last = { date: meal.date, consumptions: d.consumptions };
    }
  }
  return last?.consumptions ?? null;
}

/** Meals of the week the date falls in (one cached query per week). */
export function useWeekMeals(date: string) {
  const monday = weekStart(date);
  return useQuery({
    queryKey: queryKeys.mealsWeek(monday),
    queryFn: () => api.meals(monday, shiftISODate(monday, 6)),
    // Switching weeks keeps the old week on screen until the new one arrives (no spinner flash).
    placeholderData: keepPreviousData,
  });
}

/** How a dish is measured: its unit weights (products) and one portion (recipes). */
export type DishMeasure = { units: ProductUnits; portionG: number | null };

/** Grams in one `unit` of the dish, or null when it isn't measured that way. */
export const dishUnitGrams = (m: DishMeasure, unit: DishUnit) =>
  unit === 'portion' ? (m.portionG && m.portionG > 0 ? m.portionG : null) : unitGrams(m, unit);

/** Units a dish can be eaten in: a portion first (recipes), grams, then the product's own (spoons, pieces). */
export const dishUnits = (m: DishMeasure): DishUnit[] => [
  ...(m.portionG ? (['portion'] as const) : []),
  'g',
  ...UNIT_KEYS.filter((k) => m.units[k] != null),
];

/** What a new dish is counted in: a portion (recipe), pieces when the product has them ("1 яблоко"), else grams. */
export const defaultDishUnit = (m: DishMeasure): DishUnit =>
  m.portionG ? 'portion' : ((['pieceM', 'pieceS', 'pieceL'] as const).find((k) => m.units[k] != null) ?? 'g');
