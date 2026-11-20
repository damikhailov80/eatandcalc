/**
 * Seed: upserts the shared product catalog (`prisma/catalog.ts`), fast-food catalog (`prisma/fastfood.ts`, products
 * with a restaurant) and recipe catalog (`prisma/recipes.ts`).
 * Safe to re-run after editing them. Catalog rows dropped from the files are deleted only while nothing
 * references them (no family edits, hiding, favorites; for products also no recipe); referenced ones are
 * kept and reported.
 * Households are created by accounts on first sign-in, so there is nothing else to seed.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

import { Prisma, PrismaClient } from '../src/generated/prisma/client';
import { CATALOG } from './catalog';
import { FASTFOOD } from './fastfood';
import { RECIPES } from './recipes';

config({ path: ['.env.local', '.env'], quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const ids = new Set<string>();
  for (const { id } of [...CATALOG, ...FASTFOOD]) {
    if (ids.has(id)) throw new Error(`Duplicate catalog id: ${id}`);
    ids.add(id);
  }

  const byId = new Map(CATALOG.map((p) => [p.id, p]));
  const recipeIds = new Set<string>();
  for (const r of RECIPES) {
    if (recipeIds.has(r.id)) throw new Error(`Duplicate recipe id: ${r.id}`);
    recipeIds.add(r.id);
    for (const item of r.items) {
      const product = byId.get(item.productId);
      if (!product) throw new Error(`${r.id}: unknown product ${item.productId}`);
      if (item.unit !== 'g' && product.units[item.unit] == null) {
        throw new Error(`${r.id}: ${item.productId} has no unit ${item.unit}`);
      }
      if (!(item.amount > 0)) throw new Error(`${r.id}: ${item.productId} amount must be positive`);
    }
  }

  // Wake a suspended cloud DB (Neon) first: its cold start can exceed the transaction's 2 s default wait.
  await prisma.$queryRaw`SELECT 1`;
  await prisma.$transaction(
    async (tx) => {
      for (const { id, fdcId: _fdcId, ...data } of CATALOG) {
        const row = { ...data, restaurant: null };
        await tx.product.upsert({ where: { id }, create: { id, householdId: null, ...row }, update: row });
      }
      for (const { id, portionG, source: _source, ...rest } of FASTFOOD) {
        const row = { ...rest, units: { pieceM: portionG } };
        await tx.product.upsert({ where: { id }, create: { id, householdId: null, ...row }, update: row });
      }
      for (const { id, name, items } of RECIPES) {
        await tx.recipe.upsert({
          where: { id },
          create: { id, householdId: null, name, items },
          update: { name, items },
        });
      }
    },
    { maxWait: 30_000, timeout: 300_000 },
  );
  console.log(
    `Catalog: ${CATALOG.length} products, ${FASTFOOD.length} fast-food dishes, ${RECIPES.length} recipes upserted.`,
  );

  const staleRecipes = await prisma.recipe.findMany({
    where: { householdId: null, id: { notIn: [...recipeIds] } },
    select: { id: true, _count: { select: { states: true, favorites: true } } },
  });
  const unusedRecipes = staleRecipes.filter((r) => r._count.states === 0 && r._count.favorites === 0).map((r) => r.id);
  if (unusedRecipes.length) await prisma.recipe.deleteMany({ where: { id: { in: unusedRecipes } } });
  const keptRecipes = staleRecipes.filter((r) => !unusedRecipes.includes(r.id)).map((r) => r.id);
  console.log(
    `Removed ${unusedRecipes.length} old catalog recipes.${keptRecipes.length ? ` Kept (in use): ${keptRecipes.join(', ')}` : ''}`,
  );

  const stale = await prisma.product.findMany({
    where: { householdId: null, id: { notIn: [...ids] } },
    select: { id: true, _count: { select: { states: true, favorites: true } } },
  });
  const usedInRecipes = await productsInRecipes(stale.map((p) => p.id));
  const unused = stale
    .filter((p) => p._count.states === 0 && p._count.favorites === 0 && !usedInRecipes.has(p.id))
    .map((p) => p.id);
  if (unused.length) await prisma.product.deleteMany({ where: { id: { in: unused } } });
  const kept = stale.filter((p) => !unused.includes(p.id)).map((p) => p.id);
  console.log(`Removed ${unused.length} old catalog products.${kept.length ? ` Kept (in use): ${kept.join(', ')}` : ''}`);
}

/** Which of `ids` any recipe (catalog, own or a family's override) still uses. */
async function productsInRecipes(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const [recipes, states] = await Promise.all([
    prisma.recipe.findMany({ select: { items: true } }),
    prisma.householdRecipe.findMany({ where: { override: { not: Prisma.DbNull } }, select: { override: true } }),
  ]);
  const wanted = new Set(ids);
  const used = new Set<string>();
  const scan = (items: unknown) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      const id = (item as { productId?: unknown } | null)?.productId;
      if (typeof id === 'string' && wanted.has(id)) used.add(id);
    }
  };
  for (const r of recipes) scan(r.items);
  for (const s of states) scan((s.override as { items?: unknown } | null)?.items);
  return used;
}

main().finally(() => prisma.$disconnect());
