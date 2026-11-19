import { prisma } from '@eatandcalc/db';
import { SyncResponseSchema } from '@eatandcalc/shared';

import { withUser } from '@/lib/session';

/** Cheap change marker polled by the app: refetch everything when it differs from the last seen one. */
export const GET = withUser(async (_request, me) => {
  const household = await prisma.household.findUniqueOrThrow({
    where: { id: me.householdId },
    select: { id: true, revision: true },
  });
  return Response.json(SyncResponseSchema.parse({ householdId: household.id, revision: household.revision }));
});
