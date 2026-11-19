import { prisma, type CookingSession, type Prisma } from '@eatandcalc/db';
import {
  ApiErrors,
  CookingItemSchema,
  CookingSchema,
  type CookingData,
  type CookingDto,
  type CookingItemDto,
} from '@eatandcalc/shared';

import { randomUUID } from 'node:crypto';

import { HttpError } from './http';
import type { RequestUser } from './session';

/** Stored rows of a session; invalid entries are dropped rather than failing the list. */
export function rowItems(s: CookingSession): CookingItemDto[] {
  if (!Array.isArray(s.items)) return [];
  return s.items.flatMap((item) => {
    const parsed = CookingItemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** `@db.Date` comes back as UTC midnight. */
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const dbDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

export const toCookingDto = (s: CookingSession, eatenG = 0): CookingDto =>
  CookingSchema.parse({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    name: s.name,
    date: isoDate(s.date),
    recipeId: s.recipeId,
    recipeScale: s.recipeScale,
    copiedFromId: s.copiedFromId,
    items: rowItems(s),
    potWeightG: s.potWeightG,
    grossWeightG: s.grossWeightG,
    eatenG,
  });

/** Stable JSON form of the rows (only known keys) for storing. */
const canonicalItems = (items: readonly CookingItemDto[]) =>
  items.map(({ productId, name, nutrients, units, amount, unit }) => ({
    productId,
    name,
    nutrients: { kcal: nutrients.kcal, protein: nutrients.protein, fat: nutrients.fat, carbs: nutrients.carbs },
    units,
    amount,
    unit,
  }));

/** Grams of each session served in the household's meals (by session id). */
async function eatenBySession(householdId: string, sessionId?: string): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ session_id: string; grams: number }[]>`
    SELECT d.session_id, COALESCE(SUM(c.grams), 0)::float8 AS grams
    FROM meal_dish d
    JOIN meal m ON m.id = d.meal_id
    JOIN consumption c ON c.dish_id = d.id
    WHERE m.household_id = ${householdId} AND d.session_id IS NOT NULL
      AND (${sessionId ?? null}::text IS NULL OR d.session_id = ${sessionId ?? null})
    GROUP BY d.session_id`;
  return new Map(rows.map((r) => [r.session_id, Number(r.grams)]));
}

/** Newest days first; within a day the latest cooked first. */
export async function listCooking(me: RequestUser): Promise<CookingDto[]> {
  const [rows, eaten] = await Promise.all([
    prisma.cookingSession.findMany({
      where: { householdId: me.householdId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    eatenBySession(me.householdId),
  ]);
  return rows.map((s) => toCookingDto(s, eaten.get(s.id)));
}

const withEaten = async (householdId: string, s: CookingSession) =>
  toCookingDto(s, (await eatenBySession(householdId, s.id)).get(s.id));

async function findOwn(me: RequestUser, id: string) {
  const s = await prisma.cookingSession.findFirst({ where: { id, householdId: me.householdId } });
  if (!s) throw new HttpError(404, ApiErrors.notFound);
  return s;
}

export async function getCooking(me: RequestUser, id: string): Promise<CookingDto> {
  return withEaten(me.householdId, await findOwn(me, id));
}

/** The recipe must be one the family sees, the origin one of its sessions; otherwise 400. */
async function checkLinks(me: RequestUser, data: CookingData) {
  if (data.recipeId) {
    const r = await prisma.recipe.count({
      where: { id: data.recipeId, OR: [{ householdId: null }, { householdId: me.householdId }] },
    });
    if (!r) throw new HttpError(400, ApiErrors.validation);
  }
  if (data.copiedFromId) {
    const s = await prisma.cookingSession.count({ where: { id: data.copiedFromId, householdId: me.householdId } });
    if (!s) throw new HttpError(400, ApiErrors.validation);
  }
}

const rowData = (data: CookingData) => ({
  name: data.name,
  date: dbDate(data.date),
  recipeId: data.recipeId,
  recipeScale: data.recipeId ? data.recipeScale : null,
  copiedFromId: data.copiedFromId,
  items: canonicalItems(data.items) as Prisma.InputJsonValue,
  potWeightG: data.potWeightG,
  grossWeightG: data.grossWeightG,
});

export async function createCooking(me: RequestUser, data: CookingData): Promise<CookingDto> {
  await checkLinks(me, data);
  const s = await prisma.cookingSession.create({ data: { householdId: me.householdId, ...rowData(data) } });
  return toCookingDto(s);
}

export async function updateCooking(me: RequestUser, id: string, data: CookingData): Promise<CookingDto> {
  await findOwn(me, id);
  if (data.copiedFromId === id) throw new HttpError(400, ApiErrors.validation);
  await checkLinks(me, data);
  const s = await prisma.cookingSession.update({ where: { id }, data: rowData(data) });
  return withEaten(me.householdId, s);
}

export async function deleteCooking(me: RequestUser, id: string): Promise<void> {
  await findOwn(me, id);
  await prisma.cookingSession.delete({ where: { id } });
}

type Tx = Prisma.TransactionClient;

/** Join: the joiner's sessions move into the family as they are (own products and recipes keep their ids). */
export async function moveCookingOnJoin(tx: Tx, fromId: string, toId: string) {
  await tx.cookingSession.updateMany({ where: { householdId: fromId }, data: { householdId: toId } });
}

/**
 * Leave / removal: the family keeps its sessions, the account's new household gets copies (new ids). Rows, the
 * recipe and the origin point to the copies (`productIds`, `recipeIds`: old → new; catalog ids stay).
 */
export async function copyCookingOnLeave(
  tx: Tx,
  fromId: string,
  toId: string,
  productIds: ReadonlyMap<string, string>,
  recipeIds: ReadonlyMap<string, string>,
) {
  const sessions = await tx.cookingSession.findMany({ where: { householdId: fromId }, orderBy: { createdAt: 'asc' } });
  if (!sessions.length) return;
  const newId = new Map(sessions.map((s) => [s.id, randomUUID()]));
  // One INSERT: Postgres checks the self-reference (`copiedFromId`) at the end of the statement.
  await tx.cookingSession.createMany({
    data: sessions.map((s) => ({
      id: newId.get(s.id)!,
      householdId: toId,
      date: s.date,
      name: s.name,
      recipeId: s.recipeId ? (recipeIds.get(s.recipeId) ?? s.recipeId) : null,
      recipeScale: s.recipeScale,
      copiedFromId: s.copiedFromId ? (newId.get(s.copiedFromId) ?? null) : null,
      items: canonicalItems(
        rowItems(s).map((i) => ({ ...i, productId: i.productId ? (productIds.get(i.productId) ?? i.productId) : null })),
      ) as Prisma.InputJsonValue,
      potWeightG: s.potWeightG,
      grossWeightG: s.grossWeightG,
      createdAt: s.createdAt,
    })),
  });
}
