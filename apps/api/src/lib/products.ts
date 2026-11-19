import { prisma, type HouseholdProduct, type Product } from '@eatandcalc/db';
import {
  compareNames,
  ProductDataSchema,
  ProductSchema,
  ProductUnitsSchema,
  type ProductData,
  type ProductDto,
} from '@eatandcalc/shared';

import type { RequestUser } from './session';

/** Catalog values or own product values of a row. Invalid stored units are dropped rather than failing the list. */
function rowData(p: Product): ProductData {
  const units = ProductUnitsSchema.safeParse(p.units);
  return {
    name: p.name,
    category: p.category,
    nutrients: { kcal: p.kcal, protein: p.protein, fat: p.fat, carbs: p.carbs },
    units: units.success ? units.data : {},
  };
}

/** The family's override of a catalog product, or null when absent/invalid. */
function overrideData(state: HouseholdProduct | undefined): ProductData | null {
  if (!state?.override) return null;
  const parsed = ProductDataSchema.safeParse(state.override);
  if (!parsed.success) console.warn(`[products] invalid override for ${state.productId}`);
  return parsed.success ? parsed.data : null;
}

export function toProductDto(p: Product, state: HouseholdProduct | undefined, favorite: boolean): ProductDto {
  const own = p.householdId != null;
  const base = rowData(p);
  const override = own ? null : overrideData(state);
  return ProductSchema.parse({
    ...(override ?? base),
    id: p.id,
    source: own ? 'own' : 'catalog',
    modified: override != null,
    hidden: state?.hiddenAt != null,
    favorite,
    original: override ? base : null,
  });
}

/** Catalog + the family's own products with its edits, hiding and the account's favorites; sorted by name. */
export async function listProducts(me: RequestUser): Promise<ProductDto[]> {
  const [rows, favorites] = await Promise.all([
    prisma.product.findMany({
      where: { OR: [{ householdId: null }, { householdId: me.householdId }] },
      include: { states: { where: { householdId: me.householdId } } },
    }),
    prisma.productFavorite.findMany({ where: { userId: me.user.id }, select: { productId: true } }),
  ]);
  const favoriteIds = new Set(favorites.map((f) => f.productId));
  return rows.map((p) => toProductDto(p, p.states[0], favoriteIds.has(p.id))).sort(compareNames);
}
