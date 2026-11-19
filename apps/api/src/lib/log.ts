/**
 * One-line JSON logs for the auth flow, easy to filter in Vercel → Logs (search `"tag":"auth"`).
 * Never log tokens or cookie values; emails are fine (they are the allowlist key).
 */
export function authLog(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ tag: 'auth', event, ...data }));
}

/** Vercel's request id (also returned to the client in the `x-vercel-id` response header). */
export const requestId = (request: Request) => request.headers.get('x-vercel-id') ?? undefined;
