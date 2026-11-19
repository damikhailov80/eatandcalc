/**
 * Local development seed. Households are created by accounts on first sign-in (the account becomes the owner),
 * so there is nothing to seed yet; the shared product catalog will go here (Stage 2).
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

import { PrismaClient } from '../src/generated/prisma/client';

config({ path: ['.env.local', '.env'], quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const households = await prisma.household.count();
  console.log(`Nothing to seed yet (${households} household(s) in the database).`);
}

main().finally(() => prisma.$disconnect());
