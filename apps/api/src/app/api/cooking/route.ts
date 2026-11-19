import { CookingDataSchema, CookingListResponseSchema, CookingResponseSchema } from '@eatandcalc/shared';

import { createCooking, listCooking } from '@/lib/cooking';
import { parseBody, withUser } from '@/lib/session';

export const GET = withUser(async (_request, me) =>
  Response.json(CookingListResponseSchema.parse({ sessions: await listCooking(me) })),
);

export const POST = withUser(async (request, me) => {
  const input = await parseBody(request, CookingDataSchema);
  const session = await createCooking(me, input);
  return Response.json(CookingResponseSchema.parse({ session }), { status: 201 });
});
