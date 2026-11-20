import { prisma, type Consumption, type Meal, type MealDish, type Prisma } from '@eatandcalc/db';
import {
  ApiErrors,
  cookedWeight,
  cookingTotals,
  MealSchema,
  ProductUnitsSchema,
  recipeTotals,
  DishUnitSchema,
  type AddDishRequest,
  type ConsumptionInput,
  type MealDto,
  type Nutrients,
  type Restaurant,
} from '@eatandcalc/shared';

import { dbDate, isoDate, rowItems } from './cooking';
import { HttpError } from './http';
import { getProduct, listProducts } from './products';
import { getRecipe } from './recipes';
import type { RequestUser } from './session';

type DishRow = MealDish & { consumptions: Consumption[] };
type MealRow = Meal & { dishes: DishRow[] };

const mealInclude = {
  dishes: {
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    include: { consumptions: { orderBy: { id: 'asc' } } },
  },
} satisfies Prisma.MealInclude;

const toMealDto = (m: MealRow): MealDto =>
  MealSchema.parse({
    id: m.id,
    date: isoDate(m.date),
    type: m.type,
    createdAt: m.createdAt.toISOString(),
    dishes: m.dishes.map((d) => ({
      id: d.id,
      sessionId: d.sessionId,
      recipeId: d.recipeId,
      productId: d.productId,
      restaurant: d.restaurant,
      name: d.name,
      nutrients: { kcal: d.kcal, protein: d.protein, fat: d.fat, carbs: d.carbs },
      sourceDate: d.sourceDate ? isoDate(d.sourceDate) : null,
      weightG: d.weightG,
      rawWeight: d.rawWeight,
      units: ProductUnitsSchema.catch({}).parse(d.units),
      consumptions: d.consumptions.map((c) => ({
        memberId: c.memberId,
        grams: c.grams,
        amount: c.amount,
        unit: DishUnitSchema.nullable().catch(null).parse(c.unit),
      })),
    })),
  });

const MAX_RANGE_DAYS = 400;

/** Meals of the days `from`..`to` (inclusive), by date and creation. */
export async function listMeals(me: RequestUser, from: string, to: string): Promise<MealDto[]> {
  const start = dbDate(from);
  const end = dbDate(to);
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  if (days < 0 || days > MAX_RANGE_DAYS) throw new HttpError(400, ApiErrors.validation);
  const rows = await prisma.meal.findMany({
    where: { householdId: me.householdId, date: { gte: start, lte: end } },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    include: mealInclude,
  });
  return rows.map(toMealDto);
}

async function findMeal(me: RequestUser, id: string) {
  const meal = await prisma.meal.findFirst({ where: { id, householdId: me.householdId }, include: mealInclude });
  if (!meal) throw new HttpError(404, ApiErrors.notFound);
  return meal;
}

async function findDish(me: RequestUser, id: string) {
  const dish = await prisma.mealDish.findFirst({ where: { id, meal: { householdId: me.householdId } } });
  if (!dish) throw new HttpError(404, ApiErrors.notFound);
  return dish;
}

/** Every member must be one of the family's (archived ones too: their history stays); otherwise 400. */
async function checkMembers(me: RequestUser, consumptions: readonly ConsumptionInput[]) {
  if (!consumptions.length) return;
  const ids = consumptions.map((c) => c.memberId);
  const found = await prisma.familyMember.count({ where: { id: { in: ids }, householdId: me.householdId } });
  if (found !== ids.length) throw new HttpError(400, ApiErrors.validation);
}

type Snapshot = {
  sessionId: string | null;
  recipeId: string | null;
  productId: string | null;
  restaurant: Restaurant | null;
  name: string;
  nutrients: Nutrients;
  sourceDate: Date | null;
  weightG: number | null;
  rawWeight: boolean;
  units: Prisma.InputJsonValue;
};

/** The dish as a frozen copy of the source as the family sees it now. */
async function snapshot(me: RequestUser, source: AddDishRequest['source']): Promise<Snapshot> {
  if ('sessionId' in source) {
    const s = await prisma.cookingSession.findFirst({ where: { id: source.sessionId, householdId: me.householdId } });
    if (!s) throw new HttpError(400, ApiErrors.validation);
    const totals = cookingTotals(rowItems(s), cookedWeight(s.grossWeightG, s.potWeightG));
    return {
      sessionId: s.id,
      recipeId: null,
      productId: null,
      restaurant: null,
      name: s.name,
      nutrients: totals.per100,
      sourceDate: s.date,
      weightG: totals.weightG,
      rawWeight: !totals.weighed,
      units: {},
    };
  }
  if ('recipeId' in source) {
    const fail = () => {
      throw new HttpError(400, ApiErrors.validation);
    };
    const [r, products] = await Promise.all([getRecipe(me, source.recipeId).catch(fail), listProducts(me)]);
    const totals = recipeTotals(r.items, new Map(products.map((p) => [p.id, p])));
    if (totals.grams <= 0) fail();
    return {
      sessionId: null,
      recipeId: r.id,
      productId: null,
      restaurant: null,
      name: r.name,
      nutrients: totals.per100,
      sourceDate: null,
      // One portion = the whole recipe.
      weightG: totals.grams,
      rawWeight: false,
      units: {},
    };
  }
  const p = await getProduct(me, source.productId).catch(() => {
    throw new HttpError(400, ApiErrors.validation);
  });
  return {
    sessionId: null,
    recipeId: null,
    productId: p.id,
    restaurant: p.restaurant,
    name: p.name,
    nutrients: p.nutrients,
    sourceDate: null,
    weightG: null,
    rawWeight: false,
    units: p.units,
  };
}

/** Entered in grams (or no unit) = stored as plain grams. */
const consumptionRows = (list: readonly ConsumptionInput[]) =>
  list.map((c) => {
    const inUnit = c.unit != null && c.unit !== 'g' && c.amount != null;
    return { memberId: c.memberId, grams: c.grams, amount: inUnit ? c.amount : null, unit: inUnit ? c.unit : null };
  });

/** Adds a dish to the meal (`mealId`) or to a new meal of `type` on `date`; returns the meal. */
export async function addDish(me: RequestUser, input: AddDishRequest): Promise<MealDto> {
  await checkMembers(me, input.consumptions);
  const snap = await snapshot(me, input.source);
  const { nutrients, ...rest } = snap;
  const dish = {
    ...rest,
    kcal: nutrients.kcal,
    protein: nutrients.protein,
    fat: nutrients.fat,
    carbs: nutrients.carbs,
    consumptions: { create: consumptionRows(input.consumptions) },
  };
  let mealId = input.mealId;
  // One meal of each type per day: an empty one on another phone may already have been filled.
  if (!mealId) {
    const existing = await prisma.meal.findFirst({
      where: { householdId: me.householdId, date: dbDate(input.date), type: input.type },
      orderBy: { createdAt: 'asc' },
    });
    mealId = existing?.id ?? null;
  }
  if (mealId) {
    const meal = await findMeal(me, mealId);
    const position = Math.max(-1, ...meal.dishes.map((d) => d.position)) + 1;
    await prisma.mealDish.create({ data: { ...dish, mealId, position } });
  } else {
    const meal = await prisma.meal.create({
      data: {
        householdId: me.householdId,
        date: dbDate(input.date),
        type: input.type,
        dishes: { create: { ...dish, position: 0 } },
      },
    });
    mealId = meal.id;
  }
  return toMealDto(await findMeal(me, mealId));
}

/** Replaces who ate how much; returns the meal. */
export async function updateDish(me: RequestUser, id: string, consumptions: readonly ConsumptionInput[]) {
  const dish = await findDish(me, id);
  await checkMembers(me, consumptions);
  await prisma.$transaction([
    prisma.consumption.deleteMany({ where: { dishId: id } }),
    prisma.consumption.createMany({ data: consumptionRows(consumptions).map((c) => ({ ...c, dishId: id })) }),
  ]);
  return toMealDto(await findMeal(me, dish.mealId));
}

/** Removes the dish; a meal left without dishes goes too. */
export async function deleteDish(me: RequestUser, id: string): Promise<void> {
  const dish = await findDish(me, id);
  await prisma.$transaction(async (tx) => {
    await tx.mealDish.delete({ where: { id } });
    const left = await tx.mealDish.count({ where: { mealId: dish.mealId } });
    if (!left) await tx.meal.delete({ where: { id: dish.mealId } });
  });
}
