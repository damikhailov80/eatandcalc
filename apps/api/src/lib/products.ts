import { Prisma, prisma, type HouseholdProduct, type Product } from '@eatandcalc/db';
import {
  ApiErrors,
  compareNames,
  ProductDataSchema,
  ProductSchema,
  ProductUnitsSchema,
  UNIT_KEYS,
  type ProductData,
  type ProductDto,
} from '@eatandcalc/shared';

import { HttpError } from './http';
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

/** Stable JSON form of product data (units in `UNIT_KEYS` order) for storing and comparing. */
function canonical(d: ProductData) {
  const units: ProductData['units'] = {};
  for (const key of UNIT_KEYS) if (d.units[key] != null) units[key] = d.units[key];
  return {
    name: d.name,
    category: d.category,
    nutrients: { kcal: d.nutrients.kcal, protein: d.nutrients.protein, fat: d.nutrients.fat, carbs: d.nutrients.carbs },
    units,
  };
}

const sameData = (a: ProductData, b: ProductData) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

const rowFields = (d: ProductData) => {
  const c = canonical(d);
  return { name: c.name, category: c.category, ...c.nutrients, units: c.units };
};

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

/** Rows the household can see: the catalog and its own products. */
const visibleTo = (householdId: string): Prisma.ProductWhereInput => ({
  OR: [{ householdId: null }, { householdId }],
});

/** Catalog + the family's own products with its edits, hiding and the account's favorites; sorted by name. */
export async function listProducts(me: RequestUser): Promise<ProductDto[]> {
  const [rows, favorites] = await Promise.all([
    prisma.product.findMany({
      where: visibleTo(me.householdId),
      include: { states: { where: { householdId: me.householdId } } },
    }),
    prisma.productFavorite.findMany({ where: { userId: me.user.id }, select: { productId: true } }),
  ]);
  const favoriteIds = new Set(favorites.map((f) => f.productId));
  return rows.map((p) => toProductDto(p, p.states[0], favoriteIds.has(p.id))).sort(compareNames);
}

/** One product as the family sees it, or 404 (unknown id or another family's product). */
export async function getProduct(me: RequestUser, id: string): Promise<ProductDto> {
  const p = await prisma.product.findFirst({
    where: { id, ...visibleTo(me.householdId) },
    include: {
      states: { where: { householdId: me.householdId } },
      favorites: { where: { userId: me.user.id } },
    },
  });
  if (!p) throw new HttpError(404, ApiErrors.notFound);
  return toProductDto(p, p.states[0], p.favorites.length > 0);
}

export async function createProduct(me: RequestUser, data: ProductData): Promise<ProductDto> {
  const p = await prisma.product.create({ data: { householdId: me.householdId, ...rowFields(data) } });
  return toProductDto(p, undefined, false);
}

/**
 * Own product → updated in place. Catalog product → the family's override is set;
 * saving values equal to the catalog drops the override (the product is no longer "modified").
 */
export async function updateProduct(me: RequestUser, id: string, data: ProductData): Promise<ProductDto> {
  const p = await prisma.product.findFirst({ where: { id, ...visibleTo(me.householdId) } });
  if (!p) throw new HttpError(404, ApiErrors.notFound);
  if (p.householdId) {
    await prisma.product.update({ where: { id }, data: rowFields(data) });
  } else {
    const override = sameData(data, rowData(p)) ? null : canonical(data);
    await setOverride(me.householdId, id, override);
  }
  return getProduct(me, id);
}

/** Back to catalog values. */
export async function resetProduct(me: RequestUser, id: string): Promise<ProductDto> {
  const p = await prisma.product.findFirst({ where: { id, householdId: null } });
  if (!p) throw new HttpError(404, ApiErrors.notFound);
  await setOverride(me.householdId, id, null);
  return getProduct(me, id);
}

/**
 * Hides a catalog product for the family or brings it back. Own products are deleted instead;
 * bringing back still works for any product (own ones hidden by an older app version).
 */
export async function setHidden(me: RequestUser, id: string, hidden: boolean): Promise<ProductDto> {
  const where = hidden ? { id, householdId: null } : { id, ...visibleTo(me.householdId) };
  const p = await prisma.product.findFirst({ where, select: { id: true } });
  if (!p) throw new HttpError(404, ApiErrors.notFound);
  await writeState(me.householdId, id, { hiddenAt: hidden ? new Date() : null });
  return getProduct(me, id);
}

/** Deletes the family's own product for good (its state and favorites cascade). Catalog products → 404. */
export async function deleteProduct(me: RequestUser, id: string): Promise<void> {
  const { count } = await prisma.product.deleteMany({ where: { id, householdId: me.householdId } });
  if (count === 0) throw new HttpError(404, ApiErrors.notFound);
}

/** ♥ of the current account (not shared with the family). */
export async function setFavorite(me: RequestUser, id: string, favorite: boolean): Promise<ProductDto> {
  const p = await prisma.product.findFirst({ where: { id, ...visibleTo(me.householdId) }, select: { id: true } });
  if (!p) throw new HttpError(404, ApiErrors.notFound);
  const key = { userId: me.user.id, productId: id };
  if (favorite) {
    await prisma.productFavorite.upsert({ where: { userId_productId: key }, create: key, update: {} });
  } else {
    await prisma.productFavorite.deleteMany({ where: key });
  }
  return getProduct(me, id);
}

const setOverride = (householdId: string, productId: string, override: ProductData | null) =>
  writeState(householdId, productId, { override: override ?? Prisma.DbNull });

/** Updates the family's state row; removes it when neither an override nor hiding is left. */
async function writeState(
  householdId: string,
  productId: string,
  patch: { override?: ProductData | typeof Prisma.DbNull; hiddenAt?: Date | null },
) {
  const key = { householdId_productId: { householdId, productId } };
  await prisma.$transaction(async (tx) => {
    const state = await tx.householdProduct.upsert({
      where: key,
      create: { householdId, productId, ...patch },
      update: patch,
    });
    if (!state.override && !state.hiddenAt) await tx.householdProduct.delete({ where: key });
  });
}
