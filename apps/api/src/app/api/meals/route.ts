import { ApiErrors, MealsQuerySchema, MealsResponseSchema } from '@eatandcalc/shared';

import { HttpError } from '@/lib/http';
import { listMeals } from '@/lib/meals';
import { withUser } from '@/lib/session';

/** `?from=&to=` (inclusive): the days' meals with dishes and who ate how much. */
export const GET = withUser(async (request, me) => {
  const params = new URL(request.url).searchParams;
  const query = MealsQuerySchema.safeParse({ from: params.get('from') ?? '', to: params.get('to') ?? '' });
  if (!query.success) throw new HttpError(400, ApiErrors.validation);
  return Response.json(MealsResponseSchema.parse({ meals: await listMeals(me, query.data.from, query.data.to) }));
});
