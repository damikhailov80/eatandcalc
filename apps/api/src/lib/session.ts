import { prisma } from '@eatandcalc/db';
import { NOT_ALLOWED_ERROR } from '@eatandcalc/shared';

import { auth } from './auth';
import { isAllowedEmail } from './env';

export type RequestUser = {
  user: { id: string; email: string; name: string; image: string | null };
  householdId: string;
};

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Resolves the signed-in user and their household; throws HttpError 401/403 otherwise. */
export async function requireUser(request: Request): Promise<RequestUser> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new HttpError(401, 'UNAUTHORIZED');

  const { user } = session;
  if (!isAllowedEmail(user.email)) throw new HttpError(403, NOT_ALLOWED_ERROR);

  const membership = await prisma.householdUser.findUnique({ where: { userId: user.id } });
  if (!membership) throw new HttpError(403, 'NO_HOUSEHOLD');

  return {
    user: { id: user.id, email: user.email, name: user.name, image: user.image ?? null },
    householdId: membership.householdId,
  };
}

/** Wraps a route handler: maps HttpError to a JSON error response. */
export function withUser<Ctx>(
  handler: (request: Request, me: RequestUser, ctx: Ctx) => Promise<Response>,
) {
  return async (request: Request, ctx: Ctx) => {
    try {
      return await handler(request, await requireUser(request), ctx);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      throw e;
    }
  };
}
