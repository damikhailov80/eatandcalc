/**
 * History and stats math (pure): what a member or the family ate per day and how a day compares with the norm.
 * Norms are dated: a day is compared with the norm in effect on it (`normOn`).
 */
import type { ISODate, Id, Meal, NormRecord, Nutrients } from './domain';
import { add, dishConsumed, scale, sum, ZERO } from './nutrition';

export type DayStatus = 'ok' | 'over' | 'under';

/** Kcal within ±`tolerance` of the norm = ok; above = over; below = under. */
export const DAY_TOLERANCE = 0.1;

export function dayStatus(eatenKcal: number, normKcal: number, tolerance = DAY_TOLERANCE): DayStatus {
  if (normKcal <= 0) return 'ok';
  const share = eatenKcal / normKcal;
  if (share > 1 + tolerance) return 'over';
  if (share < 1 - tolerance) return 'under';
  return 'ok';
}

/** What the given members ate together on each day that has anything they ate (by date). */
export function eatenByDay(
  meals: readonly Pick<Meal, 'date' | 'dishes'>[],
  memberIds: ReadonlySet<Id>,
): Map<ISODate, Nutrients> {
  const days = new Map<ISODate, Nutrients>();
  for (const meal of meals)
    for (const dish of meal.dishes)
      for (const c of dish.consumptions) {
        if (!memberIds.has(c.memberId)) continue;
        days.set(meal.date, add(days.get(meal.date) ?? ZERO, dishConsumed(dish.nutrients, c.grams)));
      }
  return days;
}

/** Sum of the members' norms (the family's norm). */
export const normOf = (members: readonly { norms: Nutrients }[]) => sum(members.map((m) => m.norms));

/**
 * The norm in effect on `date`: the latest record on or before it; before the first record, the first one.
 * `history` is sorted by date ascending; null without records.
 */
export function normOn(history: readonly NormRecord[], date: ISODate): Nutrients | null {
  let found: Nutrients | null = history[0]?.norms ?? null;
  for (const r of history) {
    if (r.date > date) break;
    found = r.norms;
  }
  return found;
}

type WithNorms = { norms: Nutrients; normHistory?: readonly NormRecord[] };

/** A member's norm on `date` (`norms` when there is no history, e.g. an old server). */
export const memberNormOn = (m: WithNorms, date: ISODate) => normOn(m.normHistory ?? [], date) ?? m.norms;

/** Copies of the members with `norms` = the norm in effect on `date`. */
export const withNormsOn = <M extends WithNorms>(members: readonly M[], date: ISODate): M[] =>
  members.map((m) => ({ ...m, norms: memberNormOn(m, date) }));

/** The family's norm on `date` (sum of the members' norms in effect then). */
export const familyNormOn = (members: readonly WithNorms[], date: ISODate) =>
  sum(members.map((m) => memberNormOn(m, date)));

export type PeriodSummary = {
  /** Days with anything eaten. */
  days: number;
  ok: number;
  over: number;
  under: number;
  /** Average per day with data (ZERO without days). */
  average: Nutrients;
  /** Average norm over the same days (ZERO without days). */
  norm: Nutrients;
};

/**
 * Days of `eaten` that pass `include` (e.g. the month without today), averaged and counted by status;
 * each day is compared with its own norm (`normFor`).
 */
export function periodSummary(
  eaten: ReadonlyMap<ISODate, Nutrients>,
  normFor: (date: ISODate) => Nutrients,
  include: (date: ISODate) => boolean = () => true,
): PeriodSummary {
  const list = [...eaten].filter(([date]) => include(date));
  const counts = { ok: 0, over: 0, under: 0 };
  const norms = list.map(([date, n]) => {
    const norm = normFor(date);
    counts[dayStatus(n.kcal, norm.kcal)]++;
    return norm;
  });
  const avg = (all: Nutrients[]) => (all.length ? scale(sum(all), 1 / all.length) : ZERO);
  return { days: list.length, ...counts, average: avg(list.map(([, n]) => n)), norm: avg(norms) };
}

/** Shares of energy from protein, fat and carbs (P×4, F×9, C×4), 0..1 each; all 0 without macros. */
export function energyShares(n: Pick<Nutrients, 'protein' | 'fat' | 'carbs'>) {
  const p = n.protein * 4;
  const f = n.fat * 9;
  const c = n.carbs * 4;
  const total = p + f + c;
  return total > 0 ? { protein: p / total, fat: f / total, carbs: c / total } : { protein: 0, fat: 0, carbs: 0 };
}
