import { RecipeResponseSchema } from '@eatandcalc/shared';

import { setRecipeFavorite } from '@/lib/recipes';
import { withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

/** Adds the recipe to the current account's favorites. */
export const PUT = withUser<Ctx>(async (_request, me, { params }) => {
  const recipe = await setRecipeFavorite(me, (await params).id, true);
  return Response.json(RecipeResponseSchema.parse({ recipe }));
});

export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  const recipe = await setRecipeFavorite(me, (await params).id, false);
  return Response.json(RecipeResponseSchema.parse({ recipe }));
});
