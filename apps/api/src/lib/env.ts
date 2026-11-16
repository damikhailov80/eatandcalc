/** Server env, read once. Missing required values fail fast at startup. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export const env = {
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

export const isAllowedEmail = (email: string) => env.allowedEmails.has(email.trim().toLowerCase());
