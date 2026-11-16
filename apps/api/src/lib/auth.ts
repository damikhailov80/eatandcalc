import { prisma } from '@eatandcalc/db';
import { NOT_ALLOWED_ERROR } from '@eatandcalc/shared';
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { getEnv, isAllowedEmail } from './env';
import { ensureHouseholdMembership } from './household';

const notAllowed = () => new APIError('FORBIDDEN', { message: NOT_ALLOWED_ERROR });

function createAuth() {
  const env = getEnv();
  return betterAuth({
    baseURL: env.betterAuthUrl,
    secret: env.betterAuthSecret,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    // Google is the only way in; the mobile app sends a native Google ID token.
    socialProviders: {
      google: {
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
      },
    },
    plugins: [expo()],
    trustedOrigins: [
      'eatandcalc://',
      ...(process.env.NODE_ENV === 'development' ? ['exp://', 'exp://**'] : []),
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 90, // 90 days: family app, sign in rarely
      updateAge: 60 * 60 * 24,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!isAllowedEmail(user.email)) throw notAllowed();
          },
          after: async (user) => {
            await ensureHouseholdMembership(user.id);
          },
        },
      },
      session: {
        create: {
          // Re-check on every sign-in so removing an email from ALLOWED_EMAILS locks the account out.
          before: async (session) => {
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
            });
            if (!user || !isAllowedEmail(user.email)) throw notAllowed();
            await ensureHouseholdMembership(user.id);
          },
        },
      },
    },
  });
}

let cached: ReturnType<typeof createAuth> | undefined;

/** Better Auth instance, created on first request (not at import) so `next build` needs no secrets. */
export function getAuth() {
  cached ??= createAuth();
  return cached;
}
