import { prisma } from '@eatandcalc/db';
import {
  FamilyMemberInputSchema,
  FamilyMemberResponseSchema,
  FamilyMembersResponseSchema,
} from '@eatandcalc/shared';

import { dbDate } from '@/lib/cooking';
import { familyMemberData, serverToday, toFamilyMemberDto, withNorms } from '@/lib/family';
import { parseBody, withUser } from '@/lib/session';

export const GET = withUser(async (_request, me) => {
  const members = await prisma.familyMember.findMany({
    where: { householdId: me.householdId, archivedAt: null },
    orderBy: { createdAt: 'asc' },
    include: withNorms,
  });
  return Response.json(FamilyMembersResponseSchema.parse({ members: members.map(toFamilyMemberDto) }));
});

/** Creates the member with its first norm record. The legacy norm columns get the same values. */
export const POST = withUser(async (request, me) => {
  const input = await parseBody(request, FamilyMemberInputSchema);
  const member = await prisma.familyMember.create({
    data: {
      householdId: me.householdId,
      ...familyMemberData(input),
      ...input.norms,
      norms: { create: { date: dbDate(input.normsDate ?? serverToday()), ...input.norms } },
    },
    include: withNorms,
  });
  return Response.json(FamilyMemberResponseSchema.parse({ member: toFamilyMemberDto(member) }), {
    status: 201,
  });
});
