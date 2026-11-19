/**
 * API contract between apps/mobile and apps/api.
 * Every response body is described by a zod schema; the server validates before sending,
 * the client parses on receipt.
 */
import { z } from 'zod';

import { PRODUCT_CATEGORIES, UNIT_KEYS } from './domain';
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

/**
 * Invite code from a scanned QR: the landing link (`…/invite/<code>`), the deep link (`eatandcalc://join/<code>`)
 * or a bare code. `null` when the text is not an invite.
 */
export function parseInviteCode(text: string): string | null {
  const fromLink = /\/(?:invite|join)\/([^/?#\s]+)/.exec(text.trim())?.[1];
  const code = normalizeInviteCode(fromLink ?? text);
  const valid = code.length === INVITE_CODE_LENGTH && [...code].every((c) => INVITE_ALPHABET.includes(c));
  return valid ? code : null;
}

/** Valid until the owner revokes it or creates a new code (no expiry). */
export const InviteSchema = z.object({ code: z.string() });
export type Invite = z.infer<typeof InviteSchema>;

export const InviteResponseSchema = z.object({ invite: InviteSchema.nullable() });
export type InviteResponse = z.infer<typeof InviteResponseSchema>;

const InviteCodeSchema = z.string().transform(normalizeInviteCode).pipe(z.string().length(INVITE_CODE_LENGTH));

export const JoinRequestSchema = z.object({
  code: InviteCodeSchema,
  /** Products edited on both sides where the family's version stays (otherwise the joiner's wins). */
  keepFamily: z.array(z.string()).max(2000).default([]),
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

// ---------- Products ----------

const macro = z.number().min(0).max(100);
const unitWeight = z.number().positive().max(10_000);

export const NutrientsSchema = z.object({
  kcal: z.number().min(0).max(1000),
  protein: macro,
  fat: macro,
  carbs: macro,
});

/** Grams per one unit; keys from `UNIT_KEYS`. */
export const ProductUnitsSchema = z.partialRecord(z.enum(UNIT_KEYS), unitWeight);

/** Editable product data (an own product, or a family's override of a catalog product). */
export const ProductDataSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(PRODUCT_CATEGORIES),
  /** Per 100 g. */
  nutrients: NutrientsSchema,
  units: ProductUnitsSchema,
});
export type ProductData = z.infer<typeof ProductDataSchema>;

export const ProductSourceSchema = z.enum(['catalog', 'own']);
export type ProductSource = z.infer<typeof ProductSourceSchema>;

/** A product as the family sees it: catalog values with the family's edits applied, plus flags. */
export const ProductSchema = ProductDataSchema.extend({
  id: z.string(),
  /** `catalog` = from the shared list; `own` = added by the family. */
  source: ProductSourceSchema,
  /** A catalog product the family edited (`original` holds the catalog values). */
  modified: z.boolean(),
  hidden: z.boolean(),
  /** In the signed-in account's favorites (favorites are per account). */
  favorite: z.boolean(),
  original: ProductDataSchema.nullable(),
});
export type ProductDto = z.infer<typeof ProductSchema>;

/** A catalog product the joiner's household and the family both edited, differently. */
export const JoinConflictSchema = z.object({ id: z.string(), mine: ProductDataSchema, family: ProductDataSchema });
export type JoinConflict = z.infer<typeof JoinConflictSchema>;

/** `GET /api/household/join/preview?code=`: what joining would need decided. */
export const JoinPreviewResponseSchema = z.object({ conflicts: z.array(JoinConflictSchema) });
export const JoinPreviewQuerySchema = z.object({ code: InviteCodeSchema });

export const ProductsResponseSchema = z.object({ products: z.array(ProductSchema) });
export const ProductResponseSchema = z.object({ product: ProductSchema });

// ---------- Recipes ----------

export const UnitKeySchema = z.enum(['g', ...UNIT_KEYS]);

/** One ingredient: an amount of a product in one of its units. */
export const RecipeItemSchema = z.object({
  productId: z.string().min(1),
  amount: z.number().positive().max(100_000),
  unit: UnitKeySchema,
});
export type RecipeItemDto = z.infer<typeof RecipeItemSchema>;

/** Editable recipe data (an own recipe, or a family's override of a catalog recipe). */
export const RecipeDataSchema = z.object({
  name: z.string().trim().min(1).max(80),
  items: z.array(RecipeItemSchema).min(1).max(100),
});
export type RecipeData = z.infer<typeof RecipeDataSchema>;

/** A recipe as the family sees it; flags mean the same as for products. Weight and KBJU follow from products. */
export const RecipeSchema = RecipeDataSchema.extend({
  id: z.string(),
  source: ProductSourceSchema,
  modified: z.boolean(),
  hidden: z.boolean(),
  favorite: z.boolean(),
  original: RecipeDataSchema.nullable(),
});
export type RecipeDto = z.infer<typeof RecipeSchema>;

export const RecipesResponseSchema = z.object({ recipes: z.array(RecipeSchema) });
export const RecipeResponseSchema = z.object({ recipe: RecipeSchema });

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
  productInUse: 'PRODUCT_IN_USE',
} as const;
