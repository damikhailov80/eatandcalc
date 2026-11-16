/** Local development seed: one household. Accounts are created by signing in with Google. */
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

import { PrismaClient } from '../src/generated/prisma/client';

config({ path: ['.env.local', '.env'], quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const existing = await prisma.household.findFirst();
  if (existing) {
    console.log(`Household already exists: ${existing.name} (${existing.id})`);
    return;
  }
  const household = await prisma.household.create({ data: { name: 'Семья' } });
  console.log(`Created household ${household.id}`);
}

main().finally(() => prisma.$disconnect());
