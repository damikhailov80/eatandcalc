/**
 * API contract between apps/mobile and apps/api.
 * Every response body is described by a zod schema; the server validates before sending,
 * the client parses on receipt.
 */
import { z } from 'zod';

export const HouseholdSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const MeResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    image: z.string().nullable(),
  }),
  household: HouseholdSchema,
  members: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      image: z.string().nullable(),
    }),
  ),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Error code the server returns when a Google account is not on the family allowlist. */
export const NOT_ALLOWED_ERROR = 'NOT_IN_FAMILY';
