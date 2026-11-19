import { prisma, type HouseholdRecipe, type Prisma, type Recipe } from '@eatandcalc/db';
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
