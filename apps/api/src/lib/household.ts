import { prisma, type HouseholdRole, type Prisma } from '@eatandcalc/db';
import {
  ApiErrors,
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  MeResponseSchema,
  type MeResponse,
} from '@eatandcalc/shared';
import { randomInt } from 'node:crypto';

import { HttpError } from './http';
import type { RequestUser } from './session';

const DEFAULT_HOUSEHOLD_NAME = 'Семья';
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

/** Moves an account out of its household into a new own one (leave / removed by the owner). */
async function moveToFreshHousehold(tx: Tx, userId: string) {
  await tx.householdUser.delete({ where: { userId } });
  return createOwnHousehold(tx, userId);
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
  return prisma.householdInvite.findFirst({
    where: { householdId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
}

/** Replaces the household's invite with a fresh code valid for 7 days. */
export async function createInvite(me: RequestUser) {
  return prisma.$transaction(async (tx) => {
    await tx.householdInvite.deleteMany({ where: { householdId: me.householdId } });
    return tx.householdInvite.create({
      data: {
        code: generateInviteCode(),
        householdId: me.householdId,
        createdById: me.user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });
  });
}

export async function revokeInvites(householdId: string) {
  await prisma.householdInvite.deleteMany({ where: { householdId } });
}

/**
 * Joins the household of an invite. Allowed only when the account is alone in its current household;
 * that household (with its family profiles) is deleted, since nobody else uses it.
 */
export async function joinHousehold(me: RequestUser, code: string) {
  await prisma.$transaction(async (tx) => {
    const invite = await tx.householdInvite.findUnique({ where: { code } });
    if (!invite || invite.expiresAt <= new Date()) throw new HttpError(404, ApiErrors.inviteInvalid);
    if (invite.householdId === me.householdId) throw new HttpError(409, ApiErrors.alreadyMember);

    const others = await tx.householdUser.count({
      where: { householdId: me.householdId, userId: { not: me.user.id } },
    });
    if (others > 0) throw new HttpError(409, ApiErrors.householdNotEmpty);

    await tx.householdUser.update({
      where: { userId: me.user.id },
      data: { householdId: invite.householdId, role: 'member' satisfies HouseholdRole },
    });
    await tx.household.delete({ where: { id: me.householdId } });
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
