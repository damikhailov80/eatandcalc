import { RecipeResponseSchema } from '@eatandcalc/shared';

import { getRecipe } from '@/lib/recipes';
import { withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser<Ctx>(async (_request, me, { params }) => {
  const recipe = await getRecipe(me, (await params).id);
  return Response.json(RecipeResponseSchema.parse({ recipe }));
});
