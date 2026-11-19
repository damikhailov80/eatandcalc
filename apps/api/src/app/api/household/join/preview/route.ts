import { ApiErrors, JoinPreviewQuerySchema, JoinPreviewResponseSchema } from '@eatandcalc/shared';

import { previewJoin } from '@/lib/household';
import { HttpError } from '@/lib/http';
import { withUser } from '@/lib/session';

/** `?code=`: products edited differently by the joiner and the family (the join request then says whose stays). */
export const GET = withUser(async (request, me) => {
  const query = JoinPreviewQuerySchema.safeParse({ code: new URL(request.url).searchParams.get('code') ?? '' });
  if (!query.success) throw new HttpError(400, ApiErrors.validation);
  const conflicts = await previewJoin(me, query.data.code);
  return Response.json(JoinPreviewResponseSchema.parse({ conflicts }));
});
