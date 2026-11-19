/**
 * API contract between apps/mobile and apps/api.
 * Every response body is described by a zod schema; the server validates before sending,
 * the client parses on receipt.
 */
import { z } from 'zod';

import { memberColors } from './tokens';

export const HouseholdSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const HouseholdRoleSchema = z.enum(['owner', 'member']);

/** A Google account that belongs to the household. */
export const AccountSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  role: HouseholdRoleSchema,
});
export type Account = z.infer<typeof AccountSchema>;

export const MeResponseSchema = z.object({
  user: AccountSchema,
  household: HouseholdSchema,
  accounts: z.array(AccountSchema),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

/** `GET /api/sync`: changes whenever anyone writes to the household (or the account moves to another one). */
export const SyncResponseSchema = z.object({
  householdId: z.string(),
  revision: z.number().int(),
});
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

// ---------- Invites ----------

/** Invite codes: 8 characters from an alphabet without look-alikes (0/O, 1/I/L). */
export const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;

/** Normalizes user input ("abcd-efgh", spaces) to the stored form ("ABCDEFGH"). */
export const normalizeInviteCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const InviteSchema = z.object({
  code: z.string(),
  expiresAt: z.iso.datetime(),
});
export type Invite = z.infer<typeof InviteSchema>;

export const InviteResponseSchema = z.object({ invite: InviteSchema.nullable() });
export type InviteResponse = z.infer<typeof InviteResponseSchema>;

export const JoinRequestSchema = z.object({
  code: z.string().transform(normalizeInviteCode).pipe(z.string().length(INVITE_CODE_LENGTH)),
});
export type JoinRequest = z.input<typeof JoinRequestSchema>;

export const OkResponseSchema = z.object({ ok: z.literal(true) });

// ---------- Family members ----------

const norm = z.number().min(0).max(9999);

export const FamilyMemberInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  sex: z.enum(['male', 'female']),
  color: z.enum(memberColors),
  norms: z.object({ kcal: norm, protein: norm, fat: norm, carbs: norm }),
});
export type FamilyMemberInput = z.infer<typeof FamilyMemberInputSchema>;

export const FamilyMemberSchema = FamilyMemberInputSchema.extend({
  id: z.string(),
  color: z.string(),
});
export type FamilyMemberDto = z.infer<typeof FamilyMemberSchema>;

export const FamilyMembersResponseSchema = z.object({ members: z.array(FamilyMemberSchema) });
export const FamilyMemberResponseSchema = z.object({ member: FamilyMemberSchema });

export const ApiErrorSchema = z.object({
  error: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Error code the server returns when a Google account is not on the family allowlist. */
export const NOT_ALLOWED_ERROR = 'NOT_IN_FAMILY';

/** Error codes of household/family endpoints (never 401/403, so the client doesn't sign out). */
export const ApiErrors = {
  validation: 'VALIDATION',
  notFound: 'NOT_FOUND',
  ownerOnly: 'OWNER_ONLY',
  inviteInvalid: 'INVITE_INVALID',
  alreadyMember: 'ALREADY_MEMBER',
  householdNotEmpty: 'HOUSEHOLD_NOT_EMPTY',
  ownerCannotLeave: 'OWNER_CANNOT_LEAVE',
  cannotRemoveSelf: 'CANNOT_REMOVE_SELF',
} as const;
