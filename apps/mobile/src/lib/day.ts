import {
  eatenByMember,
  fromISODate,
  shiftISODate,
  ZERO,
  type MealDto,
  type Nutrients,
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

/** Shown on every day, even with nothing planned (stored only with the first dish). */
const STANDARD: readonly MealType[] = ['breakfast', 'lunch', 'dinner'];

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
  /** "Завтрак", "Перекус 2". */
  title: string;
  meal: MealDto | null;
};

/** The day's meal cards: breakfast, lunch, dinner (stored or empty), then snacks in the order they were added. */
export function daySlots(meals: readonly MealDto[], date: string): MealSlot[] {
  const own = meals.filter((m) => m.date === date);
  const slots: MealSlot[] = [];
  for (const type of STANDARD) {
    const stored = own.filter((m) => m.type === type);
    if (!stored.length) slots.push({ key: type, type, title: MEAL_TITLES[type], meal: null });
    for (const meal of stored) slots.push(slotOf(meal, MEAL_TITLES[type]));
  }
  own
    .filter((m) => m.type === 'snack')
    .forEach((meal, i) => slots.push(slotOf(meal, i ? `${MEAL_TITLES.snack} ${i + 1}` : MEAL_TITLES.snack)));
  return slots;
}

const slotOf = (meal: MealDto, title: string): MealSlot => ({
  key: meal.id,
  type: meal.type,
  title,
  meal,
});

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
