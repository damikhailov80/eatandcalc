import { prisma } from '@eatandcalc/db';
import { FamilyMemberInputSchema, FamilyMemberResponseSchema, OkResponseSchema } from '@eatandcalc/shared';

import { familyMemberData, findFamilyMember, toFamilyMemberDto } from '@/lib/family';
import { parseBody, withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser<Ctx>(async (_request, me, { params }) => {
  const member = await findFamilyMember(me.householdId, (await params).id);
  return Response.json(FamilyMemberResponseSchema.parse({ member: toFamilyMemberDto(member) }));
});

export const PATCH = withUser<Ctx>(async (request, me, { params }) => {
  const { id } = await params;
  const input = await parseBody(request, FamilyMemberInputSchema);
  await findFamilyMember(me.householdId, id);
  const member = await prisma.familyMember.update({ where: { id }, data: familyMemberData(input) });
  return Response.json(FamilyMemberResponseSchema.parse({ member: toFamilyMemberDto(member) }));
});

/** Archives the member: history (consumptions, later stages) keeps pointing at it. */
export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  const { id } = await params;
  await findFamilyMember(me.householdId, id);
  await prisma.familyMember.update({ where: { id }, data: { archivedAt: new Date() } });
  return Response.json(OkResponseSchema.parse({ ok: true }));
});
