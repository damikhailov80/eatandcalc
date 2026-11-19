import { ProductDataSchema, ProductResponseSchema } from '@eatandcalc/shared';

import { getProduct, updateProduct } from '@/lib/products';
import { parseBody, withUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser<Ctx>(async (_request, me, { params }) => {
  const product = await getProduct(me, (await params).id);
  return Response.json(ProductResponseSchema.parse({ product }));
});

/** Own product: edited in place. Catalog product: saved as the family's override. */
export const PATCH = withUser<Ctx>(async (request, me, { params }) => {
  const { id } = await params;
  const input = await parseBody(request, ProductDataSchema);
  const product = await updateProduct(me, id, input);
  return Response.json(ProductResponseSchema.parse({ product }));
});
