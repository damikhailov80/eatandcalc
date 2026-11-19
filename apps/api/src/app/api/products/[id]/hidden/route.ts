import { ProductResponseSchema } from '@eatandcalc/shared';

import { setHidden } from '@/lib/products';
import { withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

/** Hides the product for the whole family. */
export const PUT = withUser<Ctx>(async (_request, me, { params }) => {
  const product = await setHidden(me, (await params).id, true);
  return Response.json(ProductResponseSchema.parse({ product }));
});

/** Brings a hidden product back. */
export const DELETE = withUser<Ctx>(async (_request, me, { params }) => {
  const product = await setHidden(me, (await params).id, false);
  return Response.json(ProductResponseSchema.parse({ product }));
});
