import { RecipeDataSchema, RecipeResponseSchema, RecipesResponseSchema } from '@eatandcalc/shared';

import { createRecipe, listRecipes } from '@/lib/recipes';
import { parseBody, withUser } from '@/lib/session';

export const GET = withUser(async (_request, me) =>
  Response.json(RecipesResponseSchema.parse({ recipes: await listRecipes(me) })),
);

/** Adds the family's own recipe. */
export const POST = withUser(async (request, me) => {
  const input = await parseBody(request, RecipeDataSchema);
  const recipe = await createRecipe(me, input);
  return Response.json(RecipeResponseSchema.parse({ recipe }), { status: 201 });
});
