/**
 * Server env, read lazily on first use (not at import), so `next build` works without secrets.
 * Missing required values fail the first request that needs them.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

type Env = {
  betterAuthUrl: string;
  betterAuthSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  allowedEmails: Set<string>;
};

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= {
    betterAuthUrl: required('BETTER_AUTH_URL'),
    betterAuthSecret: required('BETTER_AUTH_SECRET'),
    googleClientId: required('GOOGLE_CLIENT_ID'),
    googleClientSecret: required('GOOGLE_CLIENT_SECRET'),
    allowedEmails: new Set(
      required('ALLOWED_EMAILS')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  };
  return cached;
}

export const isAllowedEmail = (email: string) =>
  getEnv().allowedEmails.has(email.trim().toLowerCase());
