/**
 * Seed: upserts the shared product catalog (`prisma/catalog.ts`). Safe to re-run after editing the catalog.
 * Catalog rows dropped from the file are deleted only while nothing references them (no family edits,
 * hiding or favorites); referenced ones are kept and reported.
 * Households are created by accounts on first sign-in, so there is nothing else to seed.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

import { PrismaClient } from '../src/generated/prisma/client';
import { CATALOG } from './catalog';

config({ path: ['.env.local', '.env'], quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const ids = new Set<string>();
  for (const { id } of CATALOG) {
    if (ids.has(id)) throw new Error(`Duplicate catalog id: ${id}`);
    ids.add(id);
  }

  await prisma.$transaction(
    CATALOG.map(({ id, fdcId: _fdcId, ...data }) =>
      prisma.product.upsert({
        where: { id },
        create: { id, householdId: null, ...data },
        update: data,
      }),
    ),
  );
  console.log(`Catalog: ${CATALOG.length} products upserted.`);

  const stale = await prisma.product.findMany({
    where: { householdId: null, id: { notIn: [...ids] } },
    select: { id: true, _count: { select: { states: true, favorites: true } } },
  });
  const unused = stale.filter((p) => p._count.states === 0 && p._count.favorites === 0).map((p) => p.id);
  if (unused.length) await prisma.product.deleteMany({ where: { id: { in: unused } } });
  const kept = stale.filter((p) => !unused.includes(p.id)).map((p) => p.id);
  console.log(`Removed ${unused.length} old catalog products.${kept.length ? ` Kept (in use): ${kept.join(', ')}` : ''}`);
}

main().finally(() => prisma.$disconnect());
