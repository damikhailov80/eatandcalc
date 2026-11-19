import { InviteResponseSchema } from '@eatandcalc/shared';

import { createInvite, getActiveInvite, requireOwner, revokeInvites } from '@/lib/household';
import { withUser } from '@/lib/session';

const toResponse = (invite: { code: string; expiresAt: Date } | null) =>
  Response.json(
    InviteResponseSchema.parse({
      invite: invite && { code: invite.code, expiresAt: invite.expiresAt.toISOString() },
    }),
  );

/** Current invite of the household (owner only). */
export const GET = withUser(async (_request, me) => {
  requireOwner(me);
  return toResponse(await getActiveInvite(me.householdId));
});

/** New invite code; replaces the previous one. */
export const POST = withUser(async (_request, me) => {
  requireOwner(me);
  return toResponse(await createInvite(me));
});

export const DELETE = withUser(async (_request, me) => {
  requireOwner(me);
  await revokeInvites(me.householdId);
  return toResponse(null);
});
