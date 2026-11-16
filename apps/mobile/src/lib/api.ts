import { MeResponseSchema, type MeResponse } from '@eatandcalc/shared';
import type { z } from 'zod';

import { authClient } from './auth';
import { API_URL } from './config';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Authenticated JSON request; the response is parsed with the shared zod schema. */
export async function apiRequest<S extends z.ZodType>(
  path: string,
  schema: S,
  init?: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> },
): Promise<z.infer<S>> {
  const cookie = await authClient.getCookie();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : null),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    // Session gone on the server (expired, revoked, removed from allowlist) → back to sign-in.
    if (response.status === 401 || response.status === 403) await authClient.signOut().catch(() => {});
    throw new ApiRequestError(response.status, body?.error ?? response.statusText);
  }
  return schema.parse(await response.json());
}

export const api = {
  me: (): Promise<MeResponse> => apiRequest('/api/me', MeResponseSchema),
};
