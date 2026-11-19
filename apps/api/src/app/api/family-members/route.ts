import { prisma } from '@eatandcalc/db';
import {
  FamilyMemberInputSchema,
  FamilyMemberResponseSchema,
  FamilyMembersResponseSchema,
} from '@eatandcalc/shared';

import { familyMemberData, toFamilyMemberDto } from '@/lib/family';
import { parseBody, withUser } from '@/lib/session';

export const GET = withUser(async (_request, me) => {
  const members = await prisma.familyMember.findMany({
    where: { householdId: me.householdId, archivedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  return Response.json(FamilyMembersResponseSchema.parse({ members: members.map(toFamilyMemberDto) }));
});

export const POST = withUser(async (request, me) => {
  const input = await parseBody(request, FamilyMemberInputSchema);
  const member = await prisma.familyMember.create({
    data: { householdId: me.householdId, ...familyMemberData(input) },
  });
  return Response.json(FamilyMemberResponseSchema.parse({ member: toFamilyMemberDto(member) }), {
    status: 201,
  });
});
