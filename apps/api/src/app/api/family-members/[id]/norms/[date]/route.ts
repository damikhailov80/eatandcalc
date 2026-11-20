import { prisma } from '@eatandcalc/db';
import { ApiErrors, FamilyMemberResponseSchema, ISODateSchema } from '@eatandcalc/shared';

import { dbDate } from '@/lib/cooking';
import { familyMemberDto, findFamilyMember } from '@/lib/family';
import { HttpError, withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string; date: string }> };

/** Deletes the norm record on `date`; the last one stays (409 `LAST_NORM`). */
export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  const { id, date } = await params;
  const parsed = ISODateSchema.safeParse(date);
  if (!parsed.success) throw new HttpError(400, ApiErrors.validation);
  const member = await findFamilyMember(me.householdId, id);
  const record = member.norms.find((n) => n.date.getTime() === dbDate(parsed.data).getTime());
  if (!record) throw new HttpError(404, ApiErrors.notFound);
  if (member.norms.length <= 1) throw new HttpError(409, ApiErrors.lastNorm);
  await prisma.memberNorm.delete({ where: { memberId_date: { memberId: id, date: record.date } } });
  return Response.json(FamilyMemberResponseSchema.parse({ member: await familyMemberDto(me.householdId, id) }));
});
