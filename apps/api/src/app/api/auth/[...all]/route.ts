import { toNextJsHandler } from 'better-auth/next-js';

import { getAuth } from '@/lib/auth';

// Resolve the auth instance per request so importing this route at build time needs no env.
export const GET = (request: Request) => toNextJsHandler(getAuth()).GET(request);
export const POST = (request: Request) => toNextJsHandler(getAuth()).POST(request);
