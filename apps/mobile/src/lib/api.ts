import {
  FamilyMemberResponseSchema,
  FamilyMembersResponseSchema,
  InviteResponseSchema,
  MeResponseSchema,
  NOT_ALLOWED_ERROR,
  OkResponseSchema,
  type FamilyMemberDto,
  type FamilyMemberInput,
  type Invite,
  type MeResponse,
} from '@eatandcalc/shared';
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

type RequestOptions = Omit<RequestInit, 'headers' | 'body'> & {
  headers?: Record<string, string>;
  /** JSON-serialized into the request body. */
  json?: unknown;
};

/** Authenticated JSON request; the response is parsed with the shared zod schema. */
export async function apiRequest<S extends z.ZodType>(
  path: string,
  schema: S,
  { json, ...init }: RequestOptions = {},
): Promise<z.infer<S>> {
  const cookie = await authClient.getCookie();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    body: json === undefined ? undefined : JSON.stringify(json),
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
    // Business errors (409, 404, 400) never sign out.
    if (response.status === 401 || (response.status === 403 && body?.error === NOT_ALLOWED_ERROR)) {
      await authClient.signOut().catch(() => {});
    }
    throw new ApiRequestError(response.status, body?.error ?? response.statusText);
  }
  return schema.parse(await response.json());
}

/** Error code from the API (`ApiErrors`), or null for network/other failures. */
export const apiErrorCode = (e: unknown) => (e instanceof ApiRequestError ? e.message : null);

/** Public link to share: opens the app through the API's invite page. */
export const inviteUrl = (code: string) => `${API_URL}/invite/${code}`;

export const api = {
  me: (): Promise<MeResponse> => apiRequest('/api/me', MeResponseSchema),

  invite: async (): Promise<Invite | null> =>
    (await apiRequest('/api/household/invite', InviteResponseSchema)).invite,
  createInvite: async (): Promise<Invite | null> =>
    (await apiRequest('/api/household/invite', InviteResponseSchema, { method: 'POST' })).invite,
  revokeInvite: async (): Promise<void> => {
    await apiRequest('/api/household/invite', InviteResponseSchema, { method: 'DELETE' });
  },
  join: (code: string): Promise<MeResponse> =>
    apiRequest('/api/household/join', MeResponseSchema, { method: 'POST', json: { code } }),
  leave: (): Promise<MeResponse> =>
    apiRequest('/api/household/leave', MeResponseSchema, { method: 'POST' }),
  removeAccount: (userId: string): Promise<MeResponse> =>
    apiRequest(`/api/household/accounts/${encodeURIComponent(userId)}`, MeResponseSchema, {
      method: 'DELETE',
    }),

  familyMembers: async (): Promise<FamilyMemberDto[]> =>
    (await apiRequest('/api/family-members', FamilyMembersResponseSchema)).members,
  familyMember: async (id: string): Promise<FamilyMemberDto> =>
    (await apiRequest(`/api/family-members/${encodeURIComponent(id)}`, FamilyMemberResponseSchema)).member,
  createFamilyMember: async (input: FamilyMemberInput): Promise<FamilyMemberDto> =>
    (await apiRequest('/api/family-members', FamilyMemberResponseSchema, { method: 'POST', json: input }))
      .member,
  updateFamilyMember: async (id: string, input: FamilyMemberInput): Promise<FamilyMemberDto> =>
    (
      await apiRequest(`/api/family-members/${encodeURIComponent(id)}`, FamilyMemberResponseSchema, {
        method: 'PATCH',
        json: input,
      })
    ).member,
  deleteFamilyMember: async (id: string): Promise<void> => {
    await apiRequest(`/api/family-members/${encodeURIComponent(id)}`, OkResponseSchema, {
      method: 'DELETE',
    });
  },
};
