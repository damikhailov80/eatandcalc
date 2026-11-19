import { buildMeResponse, removeAccount } from '@/lib/household';
import { withUser } from '@/lib/session';

type Ctx = { params: Promise<{ userId: string }> };

/** The owner removes an account from the family; it gets a new empty own household. */
export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  const { userId } = await params;
  await removeAccount(me, userId);
  return Response.json(await buildMeResponse(me.user.id));
});
