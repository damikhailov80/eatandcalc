import { prisma, type HouseholdRole, type Prisma } from '@eatandcalc/db';
import {
  ApiErrors,
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  MeResponseSchema,
  type JoinPreviewResponse,
  type MeResponse,
} from '@eatandcalc/shared';
import { randomInt } from 'node:crypto';

import { copyCookingOnLeave, moveCookingOnJoin } from './cooking';
import { HttpError } from './http';
import { copyProductsOnLeave, joinConflicts, mergeProductsOnJoin } from './products';
import { copyRecipesOnLeave, joinRecipeConflicts, mergeRecipesOnJoin } from './recipes';
import type { RequestUser } from './session';

const DEFAULT_HOUSEHOLD_NAME = 'Семья';

type Tx = Prisma.TransactionClient;

/** Creates a new household with `userId` as its owner (the account must not belong to another one). */
async function createOwnHousehold(tx: Tx, userId: string) {
  const household = await tx.household.create({ data: { name: DEFAULT_HOUSEHOLD_NAME } });
  await tx.householdUser.create({ data: { userId, householdId: household.id, role: 'owner' } });
  return household.id;
}

/**
 * Every account belongs to exactly one household. On first sign-in the account gets its own household
 * and becomes its owner; it moves to another one only through an invite. Idempotent, safe on every sign-in.
 */
export async function ensureHouseholdMembership(userId: string) {
  const existing = await prisma.householdUser.findUnique({ where: { userId } });
  if (existing) return existing.householdId;
  return prisma.$transaction((tx) => createOwnHousehold(tx, userId));
}

/**
 * Moves an account out of its household into a new own one (leave / removed by the owner).
 * The family keeps its data; the account takes a copy of the products, recipes and cooking sessions along.
 */
async function moveToFreshHousehold(tx: Tx, userId: string) {
  const { householdId: fromId } = await tx.householdUser.delete({ where: { userId } });
  const toId = await createOwnHousehold(tx, userId);
  const productIds = await copyProductsOnLeave(tx, fromId, toId, userId);
  const recipeIds = await copyRecipesOnLeave(tx, fromId, toId, userId, productIds);
  await copyCookingOnLeave(tx, fromId, toId, productIds, recipeIds);
  return toId;
}

/**
 * Marks the household's data as changed so other devices refetch (see `/api/sync`).
 * `updateMany`: a no-op when the household is already gone (deleted on join).
 */
export async function bumpRevision(householdId: string, tx: Tx | typeof prisma = prisma) {
  await tx.household.updateMany({ where: { id: householdId }, data: { revision: { increment: 1 } } });
}

export function requireOwner(me: RequestUser) {
  if (me.role !== 'owner') throw new HttpError(409, ApiErrors.ownerOnly);
}

export async function buildMeResponse(userId: string): Promise<MeResponse> {
  const membership = await prisma.householdUser.findUniqueOrThrow({
    where: { userId },
    include: {
      household: {
        include: { users: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
      },
    },
  });
  const accounts = membership.household.users.map(({ user, role }) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role,
  }));
  return MeResponseSchema.parse({
    user: accounts.find((a) => a.id === userId),
    household: { id: membership.household.id, name: membership.household.name },
    accounts,
  });
}

// ---------- Invites ----------

function generateInviteCode() {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  return code;
}

export async function getActiveInvite(householdId: string) {
  return prisma.householdInvite.findFirst({ where: { householdId }, orderBy: { createdAt: 'desc' } });
}

/** Replaces the household's invite with a fresh code; it stays valid until revoked or replaced. */
export async function createInvite(me: RequestUser) {
  return prisma.$transaction(async (tx) => {
    await tx.householdInvite.deleteMany({ where: { householdId: me.householdId } });
    return tx.householdInvite.create({
      data: {
        code: generateInviteCode(),
        householdId: me.householdId,
        createdById: me.user.id,
      },
    });
  });
}

export async function revokeInvites(householdId: string) {
  await prisma.householdInvite.deleteMany({ where: { householdId } });
}

/** The household an invite leads to, if the account may join it (alone in its current household). */
async function joinTarget(tx: Tx, me: RequestUser, code: string) {
  const invite = await tx.householdInvite.findUnique({ where: { code } });
  if (!invite) throw new HttpError(404, ApiErrors.inviteInvalid);
  if (invite.householdId === me.householdId) throw new HttpError(409, ApiErrors.alreadyMember);

  const others = await tx.householdUser.count({
    where: { householdId: me.householdId, userId: { not: me.user.id } },
  });
  if (others > 0) throw new HttpError(409, ApiErrors.householdNotEmpty);
  return invite.householdId;
}

/** Products and recipes edited differently on both sides: the joiner picks whose version stays. */
export async function previewJoin(me: RequestUser, code: string): Promise<JoinPreviewResponse> {
  return prisma.$transaction(async (tx) => {
    const targetId = await joinTarget(tx, me, code);
    return {
      conflicts: await joinConflicts(tx, me.householdId, targetId),
      recipeConflicts: await joinRecipeConflicts(tx, me.householdId, targetId),
    };
  });
}

/**
 * Joins the household of an invite. Allowed only when the account is alone in its current household.
 * Its products, recipes and cooking sessions move into the family (`mergeProductsOnJoin`, `mergeRecipesOnJoin`,
 * `moveCookingOnJoin`); the old household (with its family profiles)
 * is deleted, since nobody else uses it.
 */
export async function joinHousehold(
  me: RequestUser,
  code: string,
  keep: { products?: readonly string[]; recipes?: readonly string[] } = {},
) {
  await prisma.$transaction(async (tx) => {
    const targetId = await joinTarget(tx, me, code);
    await mergeProductsOnJoin(tx, me.householdId, targetId, keep.products ?? []);
    await mergeRecipesOnJoin(tx, me.householdId, targetId, keep.recipes ?? []);
    await moveCookingOnJoin(tx, me.householdId, targetId);
    await tx.householdUser.update({
      where: { userId: me.user.id },
      data: { householdId: targetId, role: 'member' satisfies HouseholdRole },
    });
    await tx.household.delete({ where: { id: me.householdId } });
    // The owner's devices must see the new account.
    await bumpRevision(targetId, tx);
  });
}

export async function leaveHousehold(me: RequestUser) {
  if (me.role === 'owner') throw new HttpError(409, ApiErrors.ownerCannotLeave);
  await prisma.$transaction((tx) => moveToFreshHousehold(tx, me.user.id));
}

export async function removeAccount(me: RequestUser, userId: string) {
  requireOwner(me);
  if (userId === me.user.id) throw new HttpError(409, ApiErrors.cannotRemoveSelf);
  await prisma.$transaction(async (tx) => {
    const target = await tx.householdUser.findUnique({ where: { userId } });
    if (!target || target.householdId !== me.householdId) throw new HttpError(404, ApiErrors.notFound);
    await moveToFreshHousehold(tx, userId);
  });
}
