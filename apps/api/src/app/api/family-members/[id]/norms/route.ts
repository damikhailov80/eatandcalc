import { prisma } from '@eatandcalc/db';
import { FamilyMemberResponseSchema, PutMemberNormRequestSchema } from '@eatandcalc/shared';

import { dbDate } from '@/lib/cooking';
import { familyMemberDto, findFamilyMember, upsertNorm } from '@/lib/family';
import { parseBody, withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

/** Saves the norm record on `date` (replacing one there); `from` = the record moved from another date. */
export const PUT = withUser<Ctx>(async (request, me, { params }) => {
  const { id } = await params;
  const input = await parseBody(request, PutMemberNormRequestSchema);
  await findFamilyMember(me.householdId, id);
  await prisma.$transaction([
    ...(input.from && input.from !== input.date
      ? [prisma.memberNorm.deleteMany({ where: { memberId: id, date: dbDate(input.from) } })]
      : []),
    upsertNorm(id, input.date, input.norms),
  ]);
  return Response.json(FamilyMemberResponseSchema.parse({ member: await familyMemberDto(me.householdId, id) }));
});
