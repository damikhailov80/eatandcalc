import { expoClient } from '@better-auth/expo/client';
import { GoogleSignin, isErrorWithCode, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { NOT_ALLOWED_ERROR } from '@eatandcalc/shared';

import { API_URL, GOOGLE_WEB_CLIENT_ID } from './config';

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: 'eatandcalc',
      storagePrefix: 'eatandcalc',
      storage: SecureStore,
    }),
  ],
});

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

export type SignInResult = { ok: true } | { ok: false; message: string | null };

const FAILED = 'Не удалось войти. Проверьте интернет и попробуйте ещё раз.';

/** Friendly text plus a short technical detail line, so the cause is visible on the phone. */
function failure(detail: string): SignInResult {
  console.warn(`[sign-in] ${detail}`);
  return { ok: false, message: `${FAILED}\n(${detail})` };
}

const describe = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Native Google account picker → ID token → Better Auth session. `message: null` = cancelled. */
export async function signInWithGoogle(): Promise<SignInResult> {
  let idToken: string | null;
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { ok: false, message: null };
    idToken = response.data.idToken;
  } catch (e) {
    return failure(isErrorWithCode(e) ? `Google: ${e.code} ${e.message}` : `Google: ${describe(e)}`);
  }
  if (!idToken) return { ok: false, message: 'Google не вернул токен. Попробуйте ещё раз.' };

  try {
    const { error } = await authClient.signIn.social({ provider: 'google', idToken: { token: idToken } });
    if (!error) return { ok: true };

    // Let the user pick another account next time.
    await GoogleSignin.signOut();
    if (error.message === NOT_ALLOWED_ERROR || error.status === 403) {
      return { ok: false, message: 'Доступ только для членов семьи. Войдите другим аккаунтом Google.' };
    }
    return failure(`API ${error.status} ${error.code ?? error.message ?? ''}`.trim());
  } catch (e) {
    return failure(`сеть: ${describe(e)}`);
  }
}

export async function signOut() {
  await Promise.allSettled([authClient.signOut(), GoogleSignin.signOut()]);
}
