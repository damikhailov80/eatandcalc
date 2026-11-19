import { RecipeResponseSchema } from '@eatandcalc/shared';

import { resetRecipe } from '@/lib/recipes';
import { withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

/** Drops the family's edits of a catalog recipe (back to the catalog one). */
export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  const recipe = await resetRecipe(me, (await params).id);
  return Response.json(RecipeResponseSchema.parse({ recipe }));
});
