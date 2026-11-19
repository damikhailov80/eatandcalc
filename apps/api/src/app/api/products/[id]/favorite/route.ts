import { ProductResponseSchema } from '@eatandcalc/shared';

import { setFavorite } from '@/lib/products';
import { withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

/** Adds the product to the current account's favorites. */
export const PUT = withUser<Ctx>(async (_request, me, { params }) => {
  const product = await setFavorite(me, (await params).id, true);
  return Response.json(ProductResponseSchema.parse({ product }));
});

export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  const product = await setFavorite(me, (await params).id, false);
  return Response.json(ProductResponseSchema.parse({ product }));
});
