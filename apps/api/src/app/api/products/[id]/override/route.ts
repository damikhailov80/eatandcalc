import { ProductResponseSchema } from '@eatandcalc/shared';

import { resetProduct } from '@/lib/products';
import { withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

/** Drops the family's edits of a catalog product (back to the catalog values). */
export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  const product = await resetProduct(me, (await params).id);
  return Response.json(ProductResponseSchema.parse({ product }));
});
