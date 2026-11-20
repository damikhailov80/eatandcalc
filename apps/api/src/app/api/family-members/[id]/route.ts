import { prisma } from '@eatandcalc/db';
import { FamilyMemberResponseSchema, FamilyMemberUpdateSchema, OkResponseSchema } from '@eatandcalc/shared';

import { familyMemberData, familyMemberDto, findFamilyMember, saveLegacyNorms } from '@/lib/family';
import { parseBody, withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser<Ctx>(async (_request, me, { params }) => {
  const member = await familyMemberDto(me.householdId, (await params).id);
  return Response.json(FamilyMemberResponseSchema.parse({ member }));
});

export const PATCH = withUser<Ctx>(async (request, me, { params }) => {
  const { id } = await params;
  const input = await parseBody(request, FamilyMemberUpdateSchema);
  const found = await findFamilyMember(me.householdId, id);
  await prisma.familyMember.update({ where: { id }, data: familyMemberData(input) });
  if (input.norms) await saveLegacyNorms(found, input.norms);
  return Response.json(FamilyMemberResponseSchema.parse({ member: await familyMemberDto(me.householdId, id) }));
});

/** Archives the member: history (consumptions, later stages) keeps pointing at it. */
export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  const { id } = await params;
  await findFamilyMember(me.householdId, id);
  await prisma.familyMember.update({ where: { id }, data: { archivedAt: new Date() } });
  return Response.json(OkResponseSchema.parse({ ok: true }));
});
