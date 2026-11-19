# Production release (Android APK)

How production is wired, what was set up once, and how to ship a new APK or a JS-only update. Background on the two app layers (native shell vs. JS bundle) and on local dev builds: [builds-and-updates.md](builds-and-updates.md). Google sign-in details: [google-oauth.md](google-oauth.md).

## Overview

```
                 git push main
                      │
     ┌────────────────┼──────────────────────────┐
     ▼                ▼                          ▼
Vercel eat-and-calc-api   Vercel eat-and-calc-web    GitHub Action "Migrate database"
(apps/api, Better Auth)   (apps/web, landing)        (prisma migrate deploy → prod DB)
     │                         ▲
     │ Postgres                │ reads android/latest.json
     ▼                         │
  prod DB              Vercel Blob (eat-and-calc-web store)
                               ▲
                               │ uploads APK + latest.json
                  npm run prod:release (on the Mac)
                               │
                               ▼
                    EAS Build (Expo cloud, profile "production")
                    signs with the EAS-managed keystore
```

| Piece | Where | Notes |
|---|---|---|
| API | https://eat-and-calc-api.vercel.app | Vercel project `eat-and-calc-api`, Root Directory `apps/api`; health: `/api/health` (DB check), `/api/auth/ok` (auth only) |
| Landing | https://eat-and-calc-web.vercel.app | Vercel project `eat-and-calc-web`, Root Directory `apps/web`; shows the latest APK from Blob |
| APK storage | Vercel Blob store connected to `eat-and-calc-web` | `android/eatandcalc.apk` (overwritten every release), `android/latest.json` (version, build, date, URL) |
| Builds / OTA | EAS project `@d.a.mikhailov80/eatandcalc` | `projectId` and `updates.url` in `apps/mobile/app.json`; profiles in `apps/mobile/eas.json` |
| Release signing key | EAS managed credentials | never on disk in the repo; its SHA-1 is registered as a Google Android client |
| DB migrations | `.github/workflows/migrate.yml` | runs on push to `main` when `packages/db/prisma/**` changes, or manually |

Both Vercel projects deploy on push to `main`, but each skips the build when nothing relevant changed (`ignoreCommand` in `apps/api/vercel.json` and `apps/web/vercel.json`; such deployments show as "Canceled — Ignored Build Step"). Use Redeploy in the Vercel dashboard to force one.

## One-time setup (done)

The order matters only where noted. Everything below is already configured; repeat a step only if the corresponding account or key is lost.

### 1. Database

- A cloud Postgres (e.g. Neon, region Frankfurt). The pooled connection string is the API's `DATABASE_URL`; with Neon add `?sslmode=require`.
- `localhost` URLs do not work from Vercel.
- Schema: GitHub → Settings → Environments → `production` → secret `DIRECT_URL` (unpooled connection string), then Actions → "Migrate database" → Run workflow once. Later migrations run automatically on push.

### 2. API on Vercel (`eat-and-calc-api`)

- Import the GitHub repo, Root Directory `apps/api`, framework Next.js.
- Settings → Environment Variables (Production):

| Variable | Value |
|---|---|
| `DATABASE_URL` | prod DB (step 1) |
| `BETTER_AUTH_URL` | `https://eat-and-calc-api.vercel.app` (https, no trailing slash, no `/api`) |
| `BETTER_AUTH_SECRET` | new `openssl rand -base64 32`, not the local one. Changing it later signs everyone out |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | the same Web client as locally (`eatandcalc web`) |
| `ALLOWED_EMAILS` | comma-separated family accounts |
| `AUTH_LOG_LEVEL` | optional; Better Auth log level, default `info`, `debug` while chasing a sign-in problem |
| `WEB_URL` | optional; landing for legacy `/invite/<code>` redirects, default `https://eat-and-calc-web.vercel.app` |

- Env vars are read at request time, not at build time (`apps/api/src/lib/env.ts`, lazy `getAuth()` and `prisma`), so the build passes without them; a missing one shows up as a 500 with `X is not set` in Vercel → Logs.
- After changing env vars: Deployments → Redeploy.
- Check: `/api/auth/ok` and `/api/health` both return `{"ok":true}`.

### 3. Landing and Blob (`eat-and-calc-web`)

- Import the repo again, Root Directory `apps/web`.
- Storage → Create → Blob with **public** access (the landing links straight to the APK file; a private store rejects the upload) → connect to `eat-and-calc-web`. Vercel adds `BLOB_STORE_ID` to the project (newer stores authenticate the deployment via OIDC; older ones add `BLOB_READ_WRITE_TOKEN`). `apps/web/src/release.ts` works with either; Redeploy.
- Copy the store's read-write token (store → `.env.local` tab, starts with `vercel_blob_rw_`) into `apps/web/.env.local` as `BLOB_READ_WRITE_TOKEN=…`: the release script runs on the Mac and uploads with it.
- Workspace packages the web app imports must be listed in `apps/web/package.json` (`@eatandcalc/shared`), otherwise Vercel fails with "Module not found".

### 4. EAS project

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli init               # writes extra.eas.projectId and owner to app.json
npx eas-cli update:configure   # writes updates.url to app.json
```

`apps/mobile/eas.json`, profile `production`: APK (`buildType: apk`), `distribution: internal`, update channel `production`, `autoIncrement` of `versionCode` (`appVersionSource: remote`: EAS stores the counter), `environment: production` (loads the EAS env vars from step 6).

### 5. Release signing key and Google

```bash
cd apps/mobile && npx eas-cli credentials -p android
```

Profile `production` → Keystore → Generate new (once; the release script is non-interactive and cannot create it). Copy the **SHA-1** shown for the keystore.

Google Cloud → Clients → Create client → **Android**: package `com.eatandcalc.app`, that SHA-1. Keep the dev Android client (`com.eatandcalc.app.dev`) too: one Android client per package + signing key. Without this, sign-in in the release APK fails with `DEVELOPER_ERROR`.

### 6. App env in EAS

Cloud builds and `eas update` do not read local `.env*` files. All `EXPO_PUBLIC_*` values live in the EAS environment `production`, not in the `env` block of `eas.json`: build profile `env` is applied only to builds, so an OTA update would ship without it and the app would crash with `EXPO_PUBLIC_API_URL is not set`.

```bash
cd apps/mobile
npx eas-cli env:create --name EXPO_PUBLIC_API_URL --value https://eat-and-calc-api.vercel.app \
  --environment production --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <GOOGLE_CLIENT_ID> \
  --environment production --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_WEB_URL --value https://eat-and-calc-web.vercel.app \
  --environment production --visibility plaintext   # invite links point to the landing
npx eas-cli env:list --environment production   # check
```

Neither value is a secret (both end up in the APK). Change one with `npx eas-cli env:update`; it takes effect with the next build or OTA update.

### 7. Local secret files

- `apps/api/.env.prod` and `apps/mobile/.env.prod` hold a local copy of the production values for reference. They are gitignored (`.env.prod`, `.env*.local`), which also keeps them out of the archive EAS uploads for a build. Nothing reads them; the real values live in Vercel and EAS.
- Keep master copies of the secrets in a password manager.

## Releasing a new APK

Needed for the first install and after any native change (new native module, `app.json` change, Expo SDK upgrade). JS-only changes go through OTA updates (next section).

1. **Prepare.** Commit the changes (EAS builds the working tree, but keep the repo in sync with what ships). Make sure the API is deployed and `/api/health` is OK, and that migrations needed by the new version are applied.
2. **Bump the version** in `apps/mobile/app.json` → `expo.version` (e.g. `1.0.0` → `1.1.0`) when the native shell changed. `runtimeVersion` follows it (`policy: appVersion`), so OTA updates for the old version don't reach the new APK and vice versa. `versionCode` is incremented by EAS automatically; don't touch it.
3. **Build and publish** from the repo root:

   ```bash
   npm run prod:release
   ```

   `apps/web/scripts/release-android.mjs`:
   1. checks `BLOB_READ_WRITE_TOKEN` (from `apps/web/.env.local`), shows `expo.version` and warns about uncommitted changes, asks `Continue? [y/N]`;
   2. `eas build --platform android --profile production --non-interactive --wait` (10–20 min on the free plan, queue included);
   3. downloads the APK from EAS;
   4. uploads `android/eatandcalc.apk` and `android/latest.json` to Vercel Blob;
   5. prints `Published <version> (<build>): <url>`.

   If the build finished but publishing failed (Blob token, network), don't spend another build: `npm run prod:release -- --build <build-id>` publishes an existing finished build (ID from the script output or expo.dev → Builds).

4. **Check the landing.** https://eat-and-calc-web.vercel.app shows the new version and date within about a minute (`latest.json` is cached for 60 s).
5. **Install on the phones.** Open the landing on each phone → "Скачать APK" → allow installs from the browser on the first time. A new APK installs over the previous release (same EAS key, the session is kept). The release app "Eat And Calc" lives next to the dev build "Eat And Calc (dev)" with its own data and session.

Build logs and past builds: https://expo.dev/accounts/d.a.mikhailov80/projects/eatandcalc/builds (personal account `d.a.mikhailov80`, not the team). A build can also be started without publishing: `cd apps/mobile && npx eas-cli build -p android --profile production`.

## Shipping JS-only changes (OTA)

Screens, styles, texts and logic don't need a new APK:

```bash
npm run prod:update -- "what changed"
```

From the repo root; it runs `npx eas-cli update --platform android --channel production --environment production --message "…"` in `apps/mobile`. Without a message (`npm run prod:update`) the last commit subject is used.

- `--environment production` is required: it injects `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_URL` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` into the bundle.
- The app downloads the update on launch and runs it on the next start.
- Only APKs with the same `expo.version` receive it.
- Rollback: `npx eas-cli update:rollback`.
- A phone may run the old bundle until restart: API changes and migrations must stay backward compatible.

## Troubleshooting

### Sign-in diagnostics

When someone can't sign in (especially "nothing happens, the sign-in form comes back"), look at both ends:

1. **Phone: «Журнал»**, the floating bug button over every screen (drag it aside; the red badge counts new warnings/errors). It lists every step of the last sign-in attempts: Google result (`cancelled` = the account picker returned no account), the account email, the `/sign-in/social` response, which cookies were stored, the `get-session` check; every failed API call with its status, error code and `x-vercel-id`; why the app signed out on its own; screen changes (`nav`), `console.warn/error` and uncaught JS errors (`crash`). Any code can add a line with `diag(tag, msg, level)` from `@/lib/diagnostics`. Filter by tag or «ошибки»; build info on top shows the API URL, webClientId and the OTA update id (proof the fix reached the phone). «Поделиться» sends the filtered log as text. The log lives in SecureStore (last 200 entries), so it survives restarts and ships with an OTA update (no native changes). **Temporary:** before the real release hide it with `EXPO_PUBLIC_DEV_LOG=0` in EAS env (or remove `DevLogButton` and the `diagnostics` route).
2. **Server: Vercel → `eat-and-calc-api` → Logs**, search `"tag":"auth"`. Events: `user_created`, `user_rejected` / `session_rejected` (email not in `ALLOWED_EMAILS`, with the allowlist size, so a mangled env var shows up as a wrong count), `session_created`, `request_unauthorized` (with the cookie names the request carried), `request_no_household`, `api_error` (Better Auth's own errors, e.g. a rejected ID token). Match phone lines by `x-vercel-id`. Set `AUTH_LOG_LEVEL=debug` + Redeploy for more detail. Runtime logs are kept only briefly on the Hobby plan: look right after the attempt.

How to read it:

| Phone log | Meaning |
|---|---|
| `Google: cancelled` without the user closing the picker | Google side: the account isn't a test user on the OAuth consent screen (Testing mode), or the release SHA-1 / client config is off. |
| `API /sign-in/social: 403 …` | Not in `ALLOWED_EMAILS` (server: `user_rejected` / `session_rejected`). Edited env needs a Redeploy. |
| `API /sign-in/social: 401 …` | ID token rejected (audience, `GOOGLE_CLIENT_ID`); see `api_error` on the server. |
| `cookie сохранены: нет` or `get-session: сессии нет` | Session cookie not stored or not accepted (`BETTER_AUTH_URL`, trusted origins). |
| `GET /api/me → 401 UNAUTHORIZED` + automatic sign-out | Session created but not accepted on requests; server `request_unauthorized` shows which cookies arrived. |

| Symptom | Cause / fix |
|---|---|
| `BLOB_READ_WRITE_TOKEN is not set (apps/web/.env.local)` | The line in `apps/web/.env.local` is empty or missing. Copy the token from Vercel → `eat-and-calc-web` → Storage → Blob store. |
| Vercel API build: `Failed to collect page data … X is not set` | Something reads env at import time again. Keep env, auth and Prisma lazy (see step 2). |
| `/api/health` 500, `/api/auth/ok` 200 | DB unreachable: `DATABASE_URL` missing, points to `localhost`, wrong password or no `sslmode=require`. Vercel → Logs shows the error. |
| `/api/auth/ok` 500 | An auth env var is missing in Vercel or was added without Redeploy. |
| Web deployment "Canceled" | Ignored Build Step: the commit didn't touch `apps/web`, `packages/shared` or the lockfile. Redeploy manually. |
| Web build: `Module not found: @eatandcalc/…` | The workspace package isn't in `apps/web/package.json` dependencies. |
| EAS: keystore generation not supported in non-interactive mode | Run `npx eas-cli credentials -p android` once (step 5). |
| `DEVELOPER_ERROR` / code 10 on sign-in in the release APK | The EAS key's SHA-1 isn't registered as a Google Android client, or `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is missing in EAS env (`eas env:list --environment production`). |
| 401 `INVALID_TOKEN` from the API | `GOOGLE_CLIENT_ID` in Vercel differs from `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in EAS. |
| Sign-in rejected for an account | The email isn't in `ALLOWED_EMAILS` (Vercel) or isn't a test user on the Google consent screen. |
| Release app calls the wrong server / crashes with `EXPO_PUBLIC_API_URL is not set` | Check `eas env:list --environment production`. The value is baked into the JS bundle: fix it, then publish an OTA update with `--environment production` (or rebuild). |
| `Cannot use public access on a private store` | The Blob store was created as private. Create a new store with public access, connect it to `eat-and-calc-web` (disconnect the old one), update the token in `apps/web/.env.local`, Redeploy, then `npm run prod:release -- --build <build-id>`. |
| Landing download button stays grey after a successful release | The deployment can't read the store: check that it's connected to `eat-and-calc-web` (`BLOB_STORE_ID` in its env vars), Redeploy, and look for "Failed to read the Android release manifest" in Vercel → Logs. |
| `BlobStoreNotFoundError: This store does not exist` | `apps/web/.env.local` still holds the token of a deleted store. Copy the token of the current one. |
| Landing still shows the old version | Wait 60 s (cache) or check `android/latest.json` in the Blob store. |
