import { Prisma, prisma, type HouseholdRecipe, type Recipe } from '@eatandcalc/db';
import {
  ApiErrors,
  compareNames,
  RecipeDataSchema,
  RecipeItemSchema,
  RecipeSchema,
  type RecipeData,
  type RecipeDto,
  type RecipeItemDto,
} from '@eatandcalc/shared';

import { HttpError } from './http';
import { toProductDto } from './products';
import type { RequestUser } from './session';

/** Stored items of a row; invalid entries are dropped rather than failing the list. */
function rowItems(r: Recipe): RecipeItemDto[] {
  if (!Array.isArray(r.items)) return [];
  return r.items.flatMap((item) => {
    const parsed = RecipeItemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

const rowData = (r: Recipe): RecipeData => ({ name: r.name, items: rowItems(r) });

/** The family's override of a catalog recipe, or null when absent/invalid. */
function overrideData(state: HouseholdRecipe | undefined): RecipeData | null {
  if (!state?.override) return null;
  const parsed = RecipeDataSchema.safeParse(state.override);
  if (!parsed.success) console.warn(`[recipes] invalid override for ${state.recipeId}`);
  return parsed.success ? parsed.data : null;
}

export function toRecipeDto(r: Recipe, state: HouseholdRecipe | undefined, favorite: boolean): RecipeDto {
  const own = r.householdId != null;
  const base = rowData(r);
  const override = own ? null : overrideData(state);
  return RecipeSchema.parse({
    ...(override ?? base),
    id: r.id,
    source: own ? 'own' : 'catalog',
    modified: override != null,
    hidden: state?.hiddenAt != null,
    favorite,
    original: override ? base : null,
  });
}

/** Rows the household can see: the catalog and its own recipes. */
const visibleTo = (householdId: string): Prisma.RecipeWhereInput => ({
  OR: [{ householdId: null }, { householdId }],
});

/** Catalog + the family's own recipes with its edits, hiding and the account's favorites; sorted by name. */
export async function listRecipes(me: RequestUser): Promise<RecipeDto[]> {
  const [rows, favorites] = await Promise.all([
    prisma.recipe.findMany({
      where: visibleTo(me.householdId),
      include: { states: { where: { householdId: me.householdId } } },
    }),
    prisma.recipeFavorite.findMany({ where: { userId: me.user.id }, select: { recipeId: true } }),
  ]);
  const favoriteIds = new Set(favorites.map((f) => f.recipeId));
  return rows.map((r) => toRecipeDto(r, r.states[0], favoriteIds.has(r.id))).sort(compareNames);
}

/** One recipe as the family sees it, or 404 (unknown id or another family's recipe). */
export async function getRecipe(me: RequestUser, id: string): Promise<RecipeDto> {
  const r = await prisma.recipe.findFirst({
    where: { id, ...visibleTo(me.householdId) },
    include: {
      states: { where: { householdId: me.householdId } },
      favorites: { where: { userId: me.user.id } },
    },
  });
  if (!r) throw new HttpError(404, ApiErrors.notFound);
  return toRecipeDto(r, r.states[0], r.favorites.length > 0);
}

/** Stable JSON form of recipe data (only known keys, in order) for storing and comparing. */
const canonical = (d: RecipeData): RecipeData => ({
  name: d.name,
  items: d.items.map(({ productId, amount, unit }) => ({ productId, amount, unit })),
});

const sameData = (a: RecipeData, b: RecipeData) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/**
 * Every ingredient must be a product the family sees, measured in a unit it has (with the family's edits).
 * Otherwise 400: the app only offers such products and units.
 */
async function checkItems(me: RequestUser, items: readonly RecipeItemDto[]) {
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, OR: [{ householdId: null }, { householdId: me.householdId }] },
    include: { states: { where: { householdId: me.householdId } } },
  });
  const units = new Map(products.map((p) => [p.id, toProductDto(p, p.states[0], false).units]));
  const ok = items.every((i) => {
    const u = units.get(i.productId);
    return u != null && (i.unit === 'g' || u[i.unit] != null);
  });
  if (!ok) throw new HttpError(400, ApiErrors.validation);
}

export async function createRecipe(me: RequestUser, data: RecipeData): Promise<RecipeDto> {
  await checkItems(me, data.items);
  const c = canonical(data);
  const r = await prisma.recipe.create({ data: { householdId: me.householdId, name: c.name, items: c.items } });
  return toRecipeDto(r, undefined, false);
}

/**
 * Own recipe → updated in place. Catalog recipe → the family's override is set;
 * saving data equal to the catalog drops the override.
 */
export async function updateRecipe(me: RequestUser, id: string, data: RecipeData): Promise<RecipeDto> {
  const r = await prisma.recipe.findFirst({ where: { id, ...visibleTo(me.householdId) } });
  if (!r) throw new HttpError(404, ApiErrors.notFound);
  await checkItems(me, data.items);
  const c = canonical(data);
  if (r.householdId) {
    await prisma.recipe.update({ where: { id }, data: { name: c.name, items: c.items } });
  } else {
    await writeState(me.householdId, id, { override: sameData(c, rowData(r)) ? Prisma.DbNull : c });
  }
  return getRecipe(me, id);
}

/** Back to the catalog recipe. */
export async function resetRecipe(me: RequestUser, id: string): Promise<RecipeDto> {
  const r = await prisma.recipe.findFirst({ where: { id, householdId: null }, select: { id: true } });
  if (!r) throw new HttpError(404, ApiErrors.notFound);
  await writeState(me.householdId, id, { override: Prisma.DbNull });
  return getRecipe(me, id);
}

/** Deletes the family's own recipe for good (state and favorites cascade). Catalog recipes → 404. */
export async function deleteRecipe(me: RequestUser, id: string): Promise<void> {
  const { count } = await prisma.recipe.deleteMany({ where: { id, householdId: me.householdId } });
  if (count === 0) throw new HttpError(404, ApiErrors.notFound);
}

/** Updates the family's state row; removes it when neither an override nor hiding is left. */
async function writeState(
  householdId: string,
  recipeId: string,
  patch: { override?: RecipeData | typeof Prisma.DbNull; hiddenAt?: Date | null },
) {
  const key = { householdId_recipeId: { householdId, recipeId } };
  await prisma.$transaction(async (tx) => {
    const state = await tx.householdRecipe.upsert({
      where: key,
      create: { householdId, recipeId, ...patch },
      update: patch,
    });
    if (!state.override && !state.hiddenAt) await tx.householdRecipe.delete({ where: key });
  });
}

/** Names of the family's recipes (own ones and its versions of catalog ones) that use the product. */
export async function recipesUsing(householdId: string, productId: string): Promise<string[]> {
  const contains = [{ productId }];
  const [own, overrides] = await Promise.all([
    prisma.recipe.findMany({ where: { householdId, items: { array_contains: contains } }, select: { name: true } }),
    prisma.householdRecipe.findMany({
      where: { householdId, override: { path: ['items'], array_contains: contains } },
      select: { override: true },
    }),
  ]);
  return [
    ...own.map((r) => r.name),
    ...overrides.flatMap((s) => {
      const parsed = RecipeDataSchema.safeParse(s.override);
      return parsed.success ? [parsed.data.name] : [];
    }),
  ];
}
