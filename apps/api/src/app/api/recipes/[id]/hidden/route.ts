import { RecipeResponseSchema } from '@eatandcalc/shared';

import { setRecipeHidden } from '@/lib/recipes';
import { withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

/** Hides the catalog recipe for the whole family. */
export const PUT = withUser<Ctx>(async (_request, me, { params }) => {
  const recipe = await setRecipeHidden(me, (await params).id, true);
  return Response.json(RecipeResponseSchema.parse({ recipe }));
});

/** Brings a hidden recipe back. */
export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  const recipe = await setRecipeHidden(me, (await params).id, false);
  return Response.json(RecipeResponseSchema.parse({ recipe }));
});
