import { JoinRequestSchema } from '@eatandcalc/shared';

import { buildMeResponse, joinHousehold } from '@/lib/household';
import { parseBody, withUser } from '@/lib/session';

export const POST = withUser(async (request, me) => {
  const { code, keepFamily, keepFamilyRecipes } = await parseBody(request, JoinRequestSchema);
  await joinHousehold(me, code, { products: keepFamily, recipes: keepFamilyRecipes });
  return Response.json(await buildMeResponse(me.user.id));
});
