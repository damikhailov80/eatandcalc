import { ProductsResponseSchema } from '@eatandcalc/shared';

import { listProducts } from '@/lib/products';
import { withUser } from '@/lib/session';

export const GET = withUser(async (_request, me) =>
  Response.json(ProductsResponseSchema.parse({ products: await listProducts(me) })),
);
