import { prisma, type FamilyMember } from '@eatandcalc/db';
import { ApiErrors, FamilyMemberSchema, type FamilyMemberDto, type FamilyMemberInput } from '@eatandcalc/shared';

import { HttpError } from './http';

export const toFamilyMemberDto = (m: FamilyMember): FamilyMemberDto =>
  FamilyMemberSchema.parse({
    id: m.id,
    name: m.name,
    sex: m.sex,
    color: m.color,
    norms: { kcal: m.kcal, protein: m.protein, fat: m.fat, carbs: m.carbs },
  });

export const familyMemberData = (input: FamilyMemberInput) => ({
  name: input.name,
  sex: input.sex,
  color: input.color,
  ...input.norms,
});

/** Active (not archived) member of the household, or 404. */
export async function findFamilyMember(householdId: string, id: string) {
  const member = await prisma.familyMember.findFirst({ where: { id, householdId, archivedAt: null } });
  if (!member) throw new HttpError(404, ApiErrors.notFound);
  return member;
}
