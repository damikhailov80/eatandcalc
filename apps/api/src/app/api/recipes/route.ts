import { RecipesResponseSchema } from '@eatandcalc/shared';

import { listRecipes } from '@/lib/recipes';
import { withUser } from '@/lib/session';

export const GET = withUser(async (_request, me) =>
  Response.json(RecipesResponseSchema.parse({ recipes: await listRecipes(me) })),
);
