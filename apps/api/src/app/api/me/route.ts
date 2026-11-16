import { prisma } from '@eatandcalc/db';
import { MeResponseSchema } from '@eatandcalc/shared';

import { withUser } from '@/lib/session';

export const GET = withUser(async (_request, me) => {
  const household = await prisma.household.findUniqueOrThrow({
    where: { id: me.householdId },
    include: { users: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
  });

  const body = MeResponseSchema.parse({
    user: me.user,
    household: { id: household.id, name: household.name },
    members: household.users.map(({ user }) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    })),
  });
  return Response.json(body);
});
