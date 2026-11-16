import { prisma } from '@eatandcalc/db';

const DEFAULT_HOUSEHOLD_NAME = 'Семья';

/**
 * There is exactly one family: the first allowed account creates it, everyone else joins it.
 * Idempotent, safe to call on every sign-in.
 */
export async function ensureHouseholdMembership(userId: string) {
  const existing = await prisma.householdUser.findUnique({ where: { userId } });
  if (existing) return existing.householdId;

  return prisma.$transaction(async (tx) => {
    const household =
      (await tx.household.findFirst({ orderBy: { createdAt: 'asc' } })) ??
      (await tx.household.create({ data: { name: DEFAULT_HOUSEHOLD_NAME } }));
    await tx.householdUser.upsert({
      where: { userId },
      create: { userId, householdId: household.id },
      update: {},
    });
    return household.id;
  });
}
