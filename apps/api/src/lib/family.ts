import { prisma, type FamilyMember, type MemberNorm } from '@eatandcalc/db';
import {
  ApiErrors,
  FamilyMemberSchema,
  type FamilyMemberDto,
  type FamilyMemberInput,
  type Nutrients,
} from '@eatandcalc/shared';

import { dbDate, isoDate } from './cooking';
import { HttpError } from './http';

/** Include for member queries: norm records by date ascending. */
export const withNorms = { norms: { orderBy: { date: 'asc' } } } as const;

type MemberWithNorms = FamilyMember & { norms: MemberNorm[] };

const normsOf = (n: Pick<MemberNorm, 'kcal' | 'protein' | 'fat' | 'carbs'>): Nutrients => ({
  kcal: n.kcal,
  protein: n.protein,
  fat: n.fat,
  carbs: n.carbs,
});

export const toFamilyMemberDto = (m: MemberWithNorms): FamilyMemberDto => {
  const latest = m.norms.at(-1);
  return FamilyMemberSchema.parse({
    id: m.id,
    name: m.name,
    sex: m.sex,
    color: m.color,
    norms: normsOf(latest ?? m),
    normHistory: m.norms.map((n) => ({ date: isoDate(n.date), norms: normsOf(n) })),
  });
};

/** Name, sex and color (norms are records in `member_norm`). */
export const familyMemberData = (input: Pick<FamilyMemberInput, 'name' | 'sex' | 'color'>) => ({
  name: input.name,
  sex: input.sex,
  color: input.color,
});

/** The server's UTC date: the fallback for old apps that don't send the family's local date. */
export const serverToday = () => new Date().toISOString().slice(0, 10);

/** Saves the norm record on `date` (replacing one there). */
export const upsertNorm = (memberId: string, date: string, norms: Nutrients) =>
  prisma.memberNorm.upsert({
    where: { memberId_date: { memberId, date: dbDate(date) } },
    create: { memberId, date: dbDate(date), ...norms },
    update: norms,
  });

const sameNorms = (a: Nutrients, b: Nutrients) =>
  a.kcal === b.kcal && a.protein === b.protein && a.fat === b.fat && a.carbs === b.carbs;

/** Old apps send the norm with every PATCH: a changed one becomes today's record. */
export async function saveLegacyNorms(member: MemberWithNorms, norms: Nutrients) {
  const latest = member.norms.at(-1);
  if (latest && sameNorms(normsOf(latest), norms)) return;
  await upsertNorm(member.id, serverToday(), norms);
}

/** Active (not archived) member of the household with its norm records, or 404. */
export async function findFamilyMember(householdId: string, id: string) {
  const member = await prisma.familyMember.findFirst({
    where: { id, householdId, archivedAt: null },
    include: withNorms,
  });
  if (!member) throw new HttpError(404, ApiErrors.notFound);
  return member;
}

/** The member DTO as stored now. */
export const familyMemberDto = async (householdId: string, id: string) =>
  toFamilyMemberDto(await findFamilyMember(householdId, id));
