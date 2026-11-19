/**
 * Seed: upserts the shared product catalog (`prisma/catalog.ts`). Safe to re-run after editing the catalog;
 * catalog rows are never deleted (families' edits and favorites reference them).
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
    CATALOG.map(({ id, ...data }) =>
      prisma.product.upsert({
        where: { id },
        create: { id, householdId: null, ...data },
        update: data,
      }),
    ),
  );
  console.log(`Catalog: ${CATALOG.length} products upserted.`);
}

main().finally(() => prisma.$disconnect());
