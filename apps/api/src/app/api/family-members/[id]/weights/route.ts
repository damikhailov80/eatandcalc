import { prisma } from '@eatandcalc/db';
import { FamilyMemberResponseSchema, PutMemberWeightRequestSchema } from '@eatandcalc/shared';

import { dbDate } from '@/lib/cooking';
import { familyMemberDto, findFamilyMember } from '@/lib/family';
import { parseBody, withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

/** Saves the weight on `date` (replacing one there); `from` = the record moved from another date. */
export const PUT = withUser<Ctx>(async (request, me, { params }) => {
  const { id } = await params;
  const input = await parseBody(request, PutMemberWeightRequestSchema);
  await findFamilyMember(me.householdId, id);
  const date = dbDate(input.date);
  await prisma.$transaction([
    ...(input.from && input.from !== input.date
      ? [prisma.memberWeight.deleteMany({ where: { memberId: id, date: dbDate(input.from) } })]
      : []),
    prisma.memberWeight.upsert({
      where: { memberId_date: { memberId: id, date } },
      create: { memberId: id, date, kg: input.kg },
      update: { kg: input.kg },
    }),
  ]);
  return Response.json(FamilyMemberResponseSchema.parse({ member: await familyMemberDto(me.householdId, id) }));
});
