import { prisma } from '@eatandcalc/db';
import { NOT_ALLOWED_ERROR, type HouseholdRole } from '@eatandcalc/shared';

import { getAuth } from './auth';
import { isAllowedEmail } from './env';
import { HttpError } from './http';
import { authLog, requestId } from './log';

export { HttpError, parseBody } from './http';

export type RequestUser = {
  user: { id: string; email: string; name: string; image: string | null };
  householdId: string;
  role: HouseholdRole;
};

/** Resolves the signed-in user and their household; throws HttpError 401/403 otherwise. */
export async function requireUser(request: Request): Promise<RequestUser> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  const path = new URL(request.url).pathname;
  if (!session) {
    // No cookie = the client didn't send it; a cookie without a session = expired, revoked or wrong secret.
    const cookie = request.headers.get('cookie') ?? '';
    authLog('request_unauthorized', {
      path,
      requestId: requestId(request),
      cookieNames: cookie.split(';').map((c) => c.split('=')[0]?.trim()).filter(Boolean),
    });
    throw new HttpError(401, 'UNAUTHORIZED');
  }

  const { user } = session;
  if (!isAllowedEmail(user.email)) {
    authLog('request_not_allowed', { path, requestId: requestId(request), email: user.email });
    throw new HttpError(403, NOT_ALLOWED_ERROR);
  }

  const membership = await prisma.householdUser.findUnique({ where: { userId: user.id } });
  if (!membership) {
    authLog('request_no_household', { path, requestId: requestId(request), userId: user.id, email: user.email });
    throw new HttpError(403, 'NO_HOUSEHOLD');
  }

  return {
    user: { id: user.id, email: user.email, name: user.name, image: user.image ?? null },
    householdId: membership.householdId,
    role: membership.role,
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
      console.error(`[api] ${request.method} ${new URL(request.url).pathname} failed`, e);
      throw e;
    }
  };
}
