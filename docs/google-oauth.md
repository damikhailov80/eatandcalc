# Google OAuth setup

How Google sign-in is wired and how to set it up locally and in production.

## How sign-in works

```
Phone (dev or prod APK)                      API (apps/api, Better Auth)              Google
───────────────────────                      ───────────────────────────              ──────
1. "Войти через Google"
2. native account picker  ─────────────────────────────────────────────────────────►  checks package + SHA-1
                           ◄──────────────────────────── ID token (aud = Web client ID)
3. POST /api/auth/sign-in/social { idToken } ─►
                                             4. verifies the token signature and
                                                aud == GOOGLE_CLIENT_ID
                                             5. email in ALLOWED_EMAILS? else 403
                                             6. creates user/session, joins household
                           ◄──────────────── session cookie (stored in SecureStore)
```

- No browser and no redirect URIs: the token comes from the native Google Sign-In SDK, so the API can run on `localhost` / the Mac's LAN IP.
- **Two OAuth clients** in one Google Cloud project:
  - **Web application**: its ID is the token audience; the API verifies against it. Used by both the API and the app.
  - **Android**: identifies *our APK* by package name + SHA-1 of the signing key. Google refuses to issue a token to an APK whose package/SHA-1 pair is not registered. Its client ID is not used in code.
- Access control is layered: Google "Testing" mode (only test users) + `ALLOWED_EMAILS` in the API (checked on every sign-in).

Code: `apps/mobile/src/lib/auth.ts` (client), `apps/api/src/lib/auth.ts` (server, allowlist hooks).

## Local setup (done once)

1. **Project.** console.cloud.google.com → project picker → New project → `eatandcalc`.
2. **Consent screen.** Google Auth Platform → Get started:
   - App name `eatandcalc`, support email: yours;
   - Audience: **External**;
   - Contact email: yours.
3. **Test users.** Audience → Test users → add both family accounts. Keep the app in **Testing**; no verification by Google is needed.
4. **Web client.** Clients → Create client → **Web application**, name `eatandcalc web`, leave origins and redirect URIs empty. Copy:
   - Client ID → `GOOGLE_CLIENT_ID` in `apps/api/.env.local` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `apps/mobile/.env.local`;
   - Client secret → `GOOGLE_CLIENT_SECRET` in `apps/api/.env.local`.
5. **Dev signing key.** `npm run android:sha1` prints the package and SHA-1. On the first run it creates `apps/mobile/credentials/debug.keystore` (gitignored). **Keep this file** (e.g. in a password manager): a new key means a new SHA-1 and a new Android client.
6. **Android client.** Clients → Create client → **Android**: package `com.eatandcalc.app`, SHA-1 from step 5. Nothing to copy back.
7. **API env.** In `apps/api/.env.local` also set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and `ALLOWED_EMAILS` (comma-separated). `BETTER_AUTH_URL=http://localhost:3000` is fine locally.
8. Restart `npm run dev` (env files are read at start) and sign in on the phone.

## Production setup (at release)

1. **Android client for the release key.** EAS signs production APKs with its own keystore: `cd apps/mobile && npx eas-cli credentials -p android` → copy its SHA-1 → Clients → Create client → **Android**, package `com.eatandcalc.app`, that SHA-1. Keep the dev client as well (one Android client per signing key).
2. **Web client is reused.** Put the same ID/secret into Vercel env of `eat-and-calc-api`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, plus `BETTER_AUTH_SECRET` (a new one, not the local), `BETTER_AUTH_URL=https://eat-and-calc-api.vercel.app`, `ALLOWED_EMAILS`.
3. **App.** `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` goes into EAS env (`npx eas-cli env:create … --environment production`); `EXPO_PUBLIC_API_URL` too.
4. **Consent screen** can stay in Testing for a family app. Testing-mode refresh tokens expire after 7 days, but we don't use Google refresh tokens: the app keeps its own Better Auth session (90 days).
5. Rotate the Web client secret before production if it was ever shared (Clients → `eatandcalc web` → Reset secret), then update Vercel and `apps/api/.env.local`.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `DEVELOPER_ERROR` / code 10 in the app | Package or SHA-1 of the installed APK is not registered as an Android client, or `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is wrong. Compare `npm run android:sha1` with Google Cloud. |
| "Доступ только для членов семьи…" | Email is not in `ALLOWED_EMAILS` (API returns 403 `NOT_IN_FAMILY`). |
| Google says the app is not verified / access blocked | The account is not in Test users. |
| 401 `INVALID_TOKEN` from the API | `GOOGLE_CLIENT_ID` in the API differs from the Web client ID used by the app. |
| "Нет связи с сервером" | API not running, or phone not on the same Wi-Fi; check `http://<Mac LAN IP>:3000/api/health` from the phone's browser. |
| Worked, then stopped after deleting `apps/mobile/android/` | Should not happen: build scripts restore the saved keystore. If `credentials/debug.keystore` was lost, run `npm run android:sha1` and register the new SHA-1. |
