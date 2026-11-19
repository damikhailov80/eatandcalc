import { CookingDataSchema, CookingResponseSchema, OkResponseSchema } from '@eatandcalc/shared';

import { deleteCooking, getCooking, updateCooking } from '@/lib/cooking';
import { parseBody, withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser<Ctx>(async (_request, me, { params }) => {
  const session = await getCooking(me, (await params).id);
  return Response.json(CookingResponseSchema.parse({ session }));
});

export const PATCH = withUser<Ctx>(async (request, me, { params }) => {
  const { id } = await params;
  const input = await parseBody(request, CookingDataSchema);
  const session = await updateCooking(me, id, input);
  return Response.json(CookingResponseSchema.parse({ session }));
});

export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  await deleteCooking(me, (await params).id);
  return Response.json(OkResponseSchema.parse({ ok: true }));
});
