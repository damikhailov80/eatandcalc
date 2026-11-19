import { OkResponseSchema, RecipeDataSchema, RecipeResponseSchema } from '@eatandcalc/shared';

import { deleteRecipe, getRecipe, updateRecipe } from '@/lib/recipes';
import { parseBody, withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser<Ctx>(async (_request, me, { params }) => {
  const recipe = await getRecipe(me, (await params).id);
  return Response.json(RecipeResponseSchema.parse({ recipe }));
});

/** Own recipe: edited in place. Catalog recipe: saved as the family's override. */
export const PATCH = withUser<Ctx>(async (request, me, { params }) => {
  const { id } = await params;
  const input = await parseBody(request, RecipeDataSchema);
  const recipe = await updateRecipe(me, id, input);
  return Response.json(RecipeResponseSchema.parse({ recipe }));
});

/** Own recipe only: deleted for good. */
export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  await deleteRecipe(me, (await params).id);
  return Response.json(OkResponseSchema.parse({ ok: true }));
});
