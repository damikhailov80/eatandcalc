import { buildMeResponse, leaveHousehold } from '@/lib/household';
import { withUser } from '@/lib/session';

/** A member leaves the family and gets a new empty own household. */
export const POST = withUser(async (_request, me) => {
  await leaveHousehold(me);
  return Response.json(await buildMeResponse(me.user.id));
});
