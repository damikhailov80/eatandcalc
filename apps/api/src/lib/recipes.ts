import { Prisma, prisma, type HouseholdRecipe, type Recipe } from '@eatandcalc/db';
import {
  ApiErrors,
  compareNames,
  recipeTotals,
  RecipeDataSchema,
  RecipeItemSchema,
  RecipeSchema,
  type RecipeData,
  type RecipeDto,
  type RecipeItemDto,
  type JoinRecipeConflict,
  type JoinRecipeVersion,
  type ProductDto,
} from '@eatandcalc/shared';
import { randomUUID } from 'node:crypto';

import { HttpError } from './http';
import { productViews, toProductDto } from './products';
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

/** Hides a catalog recipe for the family or brings it back. Own recipes are deleted instead. */
export async function setRecipeHidden(me: RequestUser, id: string, hidden: boolean): Promise<RecipeDto> {
  const where = hidden ? { id, householdId: null } : { id, ...visibleTo(me.householdId) };
  const r = await prisma.recipe.findFirst({ where, select: { id: true } });
  if (!r) throw new HttpError(404, ApiErrors.notFound);
  await writeState(me.householdId, id, { hiddenAt: hidden ? new Date() : null });
  return getRecipe(me, id);
}

/** ♥ of the current account (not shared with the family). */
export async function setRecipeFavorite(me: RequestUser, id: string, favorite: boolean): Promise<RecipeDto> {
  const r = await prisma.recipe.findFirst({ where: { id, ...visibleTo(me.householdId) }, select: { id: true } });
  if (!r) throw new HttpError(404, ApiErrors.notFound);
  const key = { userId: me.user.id, recipeId: id };
  if (favorite) {
    await prisma.recipeFavorite.upsert({ where: { userId_recipeId: key }, create: key, update: {} });
  } else {
    await prisma.recipeFavorite.deleteMany({ where: key });
  }
  return getRecipe(me, id);
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

// ---------- Joining / leaving a family ----------

type Tx = Prisma.TransactionClient;

async function recipeOverridesOf(tx: Tx, householdId: string) {
  const states = await tx.householdRecipe.findMany({ where: { householdId, override: { not: Prisma.DbNull } } });
  return states.flatMap((s) => {
    const override = overrideData(s);
    return override ? [{ recipeId: s.recipeId, override }] : [];
  });
}

/** A recipe version with product names, weight and kcal as the household sees its products. */
function versionOf(data: RecipeData, products: ReadonlyMap<string, ProductDto>): JoinRecipeVersion {
  const totals = recipeTotals(data.items, products);
  return {
    name: data.name,
    items: data.items.map((i) => ({ name: products.get(i.productId)?.name ?? '?', amount: i.amount, unit: i.unit })),
    grams: totals.grams,
    kcal: totals.nutrients.kcal,
  };
}

/** Catalog recipes edited both by the joiner's household (`mine`) and the family, differently. */
export async function joinRecipeConflicts(tx: Tx, fromId: string, toId: string): Promise<JoinRecipeConflict[]> {
  const [mine, family] = await Promise.all([recipeOverridesOf(tx, fromId), recipeOverridesOf(tx, toId)]);
  const familyById = new Map(family.map((s) => [s.recipeId, s.override]));
  const pairs = mine.flatMap(({ recipeId, override }) => {
    const theirs = familyById.get(recipeId);
    return theirs && !sameData(override, theirs) ? [{ id: recipeId, mine: override, family: theirs }] : [];
  });
  if (pairs.length === 0) return [];
  const [myProducts, familyProducts] = await Promise.all([productViews(tx, fromId), productViews(tx, toId)]);
  return pairs
    .map((c) => ({ id: c.id, mine: versionOf(c.mine, myProducts), family: versionOf(c.family, familyProducts) }))
    .sort((a, b) => compareNames(a.mine, b.mine));
}

/**
 * Brings the joiner's recipes into the family, after its products: own recipes move (ids, ♥ survive),
 * hiding is united, edits are added; where both edited a recipe differently the joiner's version wins
 * unless its id is in `keepFamily`.
 */
export async function mergeRecipesOnJoin(tx: Tx, fromId: string, toId: string, keepFamily: readonly string[]) {
  await tx.recipe.updateMany({ where: { householdId: fromId }, data: { householdId: toId } });
  const keep = new Set(keepFamily);
  const [mine, family] = await Promise.all([
    tx.householdRecipe.findMany({ where: { householdId: fromId } }),
    tx.householdRecipe.findMany({ where: { householdId: toId } }),
  ]);
  const familyById = new Map(family.map((s) => [s.recipeId, s]));
  for (const s of mine) {
    const theirs = familyById.get(s.recipeId);
    const myOverride = overrideData(s);
    const familyOverride = overrideData(theirs);
    const override = myOverride && !(familyOverride && keep.has(s.recipeId)) ? myOverride : familyOverride;
    const data = {
      override: override ? canonical(override) : Prisma.DbNull,
      hiddenAt: theirs?.hiddenAt ?? s.hiddenAt,
    };
    await tx.householdRecipe.upsert({
      where: { householdId_recipeId: { householdId: toId, recipeId: s.recipeId } },
      create: { householdId: toId, recipeId: s.recipeId, ...data },
      update: data,
    });
  }
}

/**
 * An account leaves (or is removed): the family keeps everything, the account's new household gets a copy of
 * own recipes (new ids, ♥ move to the copies), edits and hiding. Ingredients point to the copied own products
 * (`productIds`: old → new, from `copyProductsOnLeave`). Returns the own recipe ids, old → new.
 */
export async function copyRecipesOnLeave(
  tx: Tx,
  fromId: string,
  toId: string,
  userId: string,
  productIds: ReadonlyMap<string, string>,
): Promise<Map<string, string>> {
  const remap = (d: RecipeData): RecipeData =>
    canonical({ ...d, items: d.items.map((i) => ({ ...i, productId: productIds.get(i.productId) ?? i.productId })) });

  const own = await tx.recipe.findMany({ where: { householdId: fromId } });
  const newId = new Map(own.map((r) => [r.id, randomUUID()]));
  if (own.length) {
    await tx.recipe.createMany({
      data: own.map((r) => {
        const d = remap(rowData(r));
        return { id: newId.get(r.id)!, householdId: toId, name: d.name, items: d.items };
      }),
    });
  }
  const states = await tx.householdRecipe.findMany({ where: { householdId: fromId } });
  if (states.length) {
    await tx.householdRecipe.createMany({
      data: states.map((s) => {
        const override = overrideData(s);
        return {
          householdId: toId,
          recipeId: newId.get(s.recipeId) ?? s.recipeId,
          override: override ? remap(override) : Prisma.DbNull,
          hiddenAt: s.hiddenAt,
        };
      }),
    });
  }
  const favorites = await tx.recipeFavorite.findMany({ where: { userId, recipeId: { in: [...newId.keys()] } } });
  if (favorites.length) {
    await tx.recipeFavorite.createMany({
      data: favorites.map((f) => ({ userId, recipeId: newId.get(f.recipeId)!, createdAt: f.createdAt })),
    });
    await tx.recipeFavorite.deleteMany({ where: { userId, recipeId: { in: favorites.map((f) => f.recipeId) } } });
  }
  return newId;
}
