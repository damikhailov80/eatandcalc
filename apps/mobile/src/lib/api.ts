import {
  FamilyMemberResponseSchema,
  FamilyMembersResponseSchema,
  InviteResponseSchema,
  JoinPreviewResponseSchema,
  MeResponseSchema,
  NOT_ALLOWED_ERROR,
  OkResponseSchema,
  ProductResponseSchema,
  ProductsResponseSchema,
  RecipeResponseSchema,
  RecipesResponseSchema,
  SyncResponseSchema,
  type FamilyMemberDto,
  type FamilyMemberInput,
  type Invite,
  type JoinConflict,
  type MeResponse,
  type ProductData,
  type ProductDto,
  type RecipeData,
  type RecipeDto,
  type SyncResponse,
} from '@eatandcalc/shared';
import type { z } from 'zod';

import { authClient } from './auth';
import { API_URL, WEB_URL } from './config';
import { cookieNames, diag, recordSignOut } from './diagnostics';

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
  const method = init.method ?? 'GET';
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      body: json === undefined ? undefined : JSON.stringify(json),
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : null),
        ...init?.headers,
      },
    });
  } catch (e) {
    diag('api', `${method} ${path}: сеть: ${e instanceof Error ? e.message : String(e)}`, 'error');
    throw e;
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    // x-vercel-id matches the server's `"tag":"auth"` log lines in Vercel → Logs.
    const line = `${method} ${path} → ${response.status} ${body?.error ?? ''} (cookie: ${cookieNames(cookie)}, id ${response.headers.get('x-vercel-id') ?? '-'})`;
    diag('api', line, response.status >= 500 ? 'error' : 'warn');
    // Session gone on the server (expired, revoked, removed from allowlist) → back to sign-in.
    // Business errors (409, 404, 400) never sign out.
    if (response.status === 401 || (response.status === 403 && body?.error === NOT_ALLOWED_ERROR)) {
      recordSignOut(line);
      await authClient.signOut().catch(() => {});
    }
    throw new ApiRequestError(response.status, body?.error ?? response.statusText);
  }
  const result = schema.safeParse(await response.json().catch(() => undefined));
  if (!result.success) {
    diag('api', `${method} ${path}: ответ не прошёл схему: ${result.error.message}`, 'error');
    throw result.error;
  }
  return result.data;
}

/** Error code from the API (`ApiErrors`), or null for network/other failures. */
export const apiErrorCode = (e: unknown) => (e instanceof ApiRequestError ? e.message : null);

/** Public link to share: the landing's invite page opens the app or offers to install it. */
export const inviteUrl = (code: string) => `${WEB_URL}/invite/${code}`;

export const api = {
  me: (): Promise<MeResponse> => apiRequest('/api/me', MeResponseSchema),
  sync: (): Promise<SyncResponse> => apiRequest('/api/sync', SyncResponseSchema),

  invite: async (): Promise<Invite | null> =>
    (await apiRequest('/api/household/invite', InviteResponseSchema)).invite,
  createInvite: async (): Promise<Invite | null> =>
    (await apiRequest('/api/household/invite', InviteResponseSchema, { method: 'POST' })).invite,
  revokeInvite: async (): Promise<void> => {
    await apiRequest('/api/household/invite', InviteResponseSchema, { method: 'DELETE' });
  },
  joinPreview: async (code: string): Promise<JoinConflict[]> =>
    (await apiRequest(`/api/household/join/preview?code=${encodeURIComponent(code)}`, JoinPreviewResponseSchema))
      .conflicts,
  join: (code: string, keepFamily: string[] = []): Promise<MeResponse> =>
    apiRequest('/api/household/join', MeResponseSchema, { method: 'POST', json: { code, keepFamily } }),
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

  products: async (): Promise<ProductDto[]> =>
    (await apiRequest('/api/products', ProductsResponseSchema)).products,
  product: async (id: string): Promise<ProductDto> =>
    (await apiRequest(`/api/products/${encodeURIComponent(id)}`, ProductResponseSchema)).product,
  createProduct: async (input: ProductData): Promise<ProductDto> =>
    (await apiRequest('/api/products', ProductResponseSchema, { method: 'POST', json: input })).product,
  /** Own product: edited; catalog product: saved as the family's version. */
  updateProduct: async (id: string, input: ProductData): Promise<ProductDto> =>
    (
      await apiRequest(`/api/products/${encodeURIComponent(id)}`, ProductResponseSchema, {
        method: 'PATCH',
        json: input,
      })
    ).product,
  resetProduct: async (id: string): Promise<ProductDto> =>
    (
      await apiRequest(`/api/products/${encodeURIComponent(id)}/override`, ProductResponseSchema, {
        method: 'DELETE',
      })
    ).product,
  /** Own product only, for good. */
  deleteProduct: async (id: string): Promise<void> => {
    await apiRequest(`/api/products/${encodeURIComponent(id)}`, OkResponseSchema, { method: 'DELETE' });
  },
  /** Catalog product hidden for the whole family / brought back. */
  setProductHidden: async (id: string, hidden: boolean): Promise<ProductDto> =>
    (
      await apiRequest(`/api/products/${encodeURIComponent(id)}/hidden`, ProductResponseSchema, {
        method: hidden ? 'PUT' : 'DELETE',
      })
    ).product,
  /** ♥ of the signed-in account. */
  setProductFavorite: async (id: string, favorite: boolean): Promise<ProductDto> =>
    (
      await apiRequest(`/api/products/${encodeURIComponent(id)}/favorite`, ProductResponseSchema, {
        method: favorite ? 'PUT' : 'DELETE',
      })
    ).product,

  recipes: async (): Promise<RecipeDto[]> => (await apiRequest('/api/recipes', RecipesResponseSchema)).recipes,
  recipe: async (id: string): Promise<RecipeDto> =>
    (await apiRequest(`/api/recipes/${encodeURIComponent(id)}`, RecipeResponseSchema)).recipe,
  createRecipe: async (input: RecipeData): Promise<RecipeDto> =>
    (await apiRequest('/api/recipes', RecipeResponseSchema, { method: 'POST', json: input })).recipe,
  /** Own recipe: edited; catalog recipe: saved as the family's version. */
  updateRecipe: async (id: string, input: RecipeData): Promise<RecipeDto> =>
    (
      await apiRequest(`/api/recipes/${encodeURIComponent(id)}`, RecipeResponseSchema, {
        method: 'PATCH',
        json: input,
      })
    ).recipe,
  resetRecipe: async (id: string): Promise<RecipeDto> =>
    (
      await apiRequest(`/api/recipes/${encodeURIComponent(id)}/override`, RecipeResponseSchema, {
        method: 'DELETE',
      })
    ).recipe,
  /** Own recipe only, for good. */
  deleteRecipe: async (id: string): Promise<void> => {
    await apiRequest(`/api/recipes/${encodeURIComponent(id)}`, OkResponseSchema, { method: 'DELETE' });
  },
};
