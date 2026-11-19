import { MealResponseSchema, OkResponseSchema, UpdateDishRequestSchema } from '@eatandcalc/shared';

import { deleteDish, updateDish } from '@/lib/meals';
import { parseBody, withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withUser<Ctx>(async (request, me, { params }) => {
  const { id } = await params;
  const { consumptions } = await parseBody(request, UpdateDishRequestSchema);
  return Response.json(MealResponseSchema.parse({ meal: await updateDish(me, id, consumptions) }));
});

export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  await deleteDish(me, (await params).id);
  return Response.json(OkResponseSchema.parse({ ok: true }));
});
