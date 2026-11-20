import { prisma } from '@eatandcalc/db';
import { ApiErrors, FamilyMemberResponseSchema, ISODateSchema } from '@eatandcalc/shared';

import { dbDate } from '@/lib/cooking';
import { familyMemberDto, findFamilyMember } from '@/lib/family';
import { HttpError, withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string; date: string }> };

/** Deletes the weight recorded on `date`. */
export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  const { id, date } = await params;
  const parsed = ISODateSchema.safeParse(date);
  if (!parsed.success) throw new HttpError(400, ApiErrors.validation);
  await findFamilyMember(me.householdId, id);
  const { count } = await prisma.memberWeight.deleteMany({ where: { memberId: id, date: dbDate(parsed.data) } });
  if (!count) throw new HttpError(404, ApiErrors.notFound);
  return Response.json(FamilyMemberResponseSchema.parse({ member: await familyMemberDto(me.householdId, id) }));
});
