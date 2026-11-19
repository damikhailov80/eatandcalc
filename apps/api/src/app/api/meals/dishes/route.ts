import { AddDishRequestSchema, MealResponseSchema } from '@eatandcalc/shared';

import { addDish } from '@/lib/meals';
import { parseBody, withUser } from '@/lib/session';

export const POST = withUser(async (request, me) => {
  const input = await parseBody(request, AddDishRequestSchema);
  return Response.json(MealResponseSchema.parse({ meal: await addDish(me, input) }), { status: 201 });
});
