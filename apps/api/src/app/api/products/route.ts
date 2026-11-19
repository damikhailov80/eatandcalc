import { ProductDataSchema, ProductResponseSchema, ProductsResponseSchema } from '@eatandcalc/shared';

import { createProduct, listProducts } from '@/lib/products';
import { parseBody, withUser } from '@/lib/session';

export const GET = withUser(async (_request, me) =>
  Response.json(ProductsResponseSchema.parse({ products: await listProducts(me) })),
);

/** Adds the family's own product. */
export const POST = withUser(async (request, me) => {
  const input = await parseBody(request, ProductDataSchema);
  const product = await createProduct(me, input);
  return Response.json(ProductResponseSchema.parse({ product }), { status: 201 });
});
