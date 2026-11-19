import { expoClient } from '@better-auth/expo/client';
import { GoogleSignin, isErrorWithCode, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { NOT_ALLOWED_ERROR } from '@eatandcalc/shared';

import { API_URL, GOOGLE_WEB_CLIENT_ID } from './config';
import { clearSignOutReason, cookieNames, diag } from './diagnostics';

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
  diag('sign-in', `ошибка: ${detail}`);
  return { ok: false, message: `${FAILED}\n(${detail})` };
}

const describe = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Native Google account picker → ID token → Better Auth session, then a check that the session really works.
 * `message: null` = cancelled by the user. Every step goes to the diagnostics log (Журнал входа).
 */
export async function signInWithGoogle(): Promise<SignInResult> {
  clearSignOutReason();
  diag('sign-in', `старт, API ${API_URL}, webClientId ${GOOGLE_WEB_CLIENT_ID ? 'задан' : 'ПУСТОЙ'}`);
  let idToken: string | null;
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      // Also what a misconfigured client or a non-test Google user can look like on some devices.
      diag('sign-in', `Google: ${response.type} (окно выбора закрыто без аккаунта)`);
      return { ok: false, message: null };
    }
    idToken = response.data.idToken;
    diag('sign-in', `Google: аккаунт ${response.data.user.email}, токен ${idToken ? 'есть' : 'НЕТ'}`);
  } catch (e) {
    return failure(isErrorWithCode(e) ? `Google: ${e.code} ${e.message}` : `Google: ${describe(e)}`);
  }
  if (!idToken) {
    diag('sign-in', 'Google не вернул idToken');
    return { ok: false, message: 'Google не вернул токен. Попробуйте ещё раз.' };
  }

  try {
    const { data, error } = await authClient.signIn.social({ provider: 'google', idToken: { token: idToken } });
    if (error) {
      diag('sign-in', `API /sign-in/social: ${error.status} ${error.code ?? ''} ${error.message ?? ''}`.trim());
      // Let the user pick another account next time.
      await GoogleSignin.signOut();
      if (error.message === NOT_ALLOWED_ERROR || error.status === 403) {
        return { ok: false, message: 'Доступ только для членов семьи. Войдите другим аккаунтом Google.' };
      }
      return failure(`API ${error.status} ${error.code ?? error.message ?? ''}`.trim());
    }
    const userEmail = (data as { user?: { email?: string } } | null)?.user?.email ?? '?';
    diag('sign-in', `API /sign-in/social: ok, пользователь ${userEmail}`);

    // Without a stored cookie every later request is 401 and the app silently drops back to sign-in.
    const cookie = await authClient.getCookie();
    diag('sign-in', `cookie сохранены: ${cookieNames(cookie)}`);
    const session = await authClient.getSession();
    if (session.error || !session.data) {
      const detail = session.error
        ? `get-session ${session.error.status} ${session.error.message ?? ''}`.trim()
        : 'get-session: сессии нет';
      await GoogleSignin.signOut();
      return failure(detail);
    }
    diag('sign-in', `сессия ok, ${session.data.user.email}`);
    return { ok: true };
  } catch (e) {
    return failure(`сеть: ${describe(e)}`);
  }
}

export async function signOut() {
  diag('signout', 'выход вручную');
  await Promise.allSettled([authClient.signOut(), GoogleSignin.signOut()]);
}
