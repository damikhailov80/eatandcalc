# Production

## What runs where

| Piece | Where | Notes |
|---|---|---|
| API | https://eat-and-calc-api.vercel.app | Vercel `eat-and-calc-api`, Root Directory `apps/api`; `/api/health` (DB), `/api/auth/ok` (auth) |
| Landing | https://eat-and-calc-web.vercel.app | Vercel `eat-and-calc-web`, Root Directory `apps/web`; shows the APK from Blob |
| APK storage | Vercel Blob (public) connected to `eat-and-calc-web` | `android/eatandcalc.apk`, `android/latest.json` (cached 60 s) |
| Builds / OTA | EAS project `eatandcalc` (personal account) | `projectId`, `updates.url` in `apps/mobile/app.json`; profiles in `apps/mobile/eas.json` |
| Release signing key | EAS managed credentials | its SHA-1 is a Google Android client for `com.eatandcalc.app` |
| DB | Neon (Frankfurt) | migrations: `.github/workflows/migrate.yml` on push to `main` when `packages/db/prisma/**` changes |

Both Vercel projects deploy on push to `main` and skip the build when nothing relevant changed (`ignoreCommand` in `apps/*/vercel.json`, shown as "Canceled — Ignored Build Step"); Redeploy forces one.

If an account or key is lost, the setup lives in: Vercel env of `eat-and-calc-api` (`DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAILS`; optional `AUTH_LOG_LEVEL`, `WEB_URL`), EAS env `production` (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, never in `eas.json` `env`: OTA updates don't get it), GitHub environment `production` (secret `DIRECT_URL`, Neon unpooled), Google Cloud (Web client + one Android client per package and SHA-1: `.app` with the EAS key from `npx eas-cli credentials -p android`, `.app.dev` with `node apps/mobile/scripts/android-sha1.mjs`; consent screen in Testing, both accounts are test users).

## Shipping a change

| Change | How |
|---|---|
| Screens, logic, JS-only library | `/push-update` (commit, push, `npm run prod:update`) |
| Native module, `app.json`, SDK upgrade | bump `expo.version` in `app.json`, commit, `npm run prod:release`, install the APK on the phones |
| API / DB | push to `main` (Vercel + migrate workflow); must stay backward compatible: phones may run the old bundle until restart |

**OTA** (`npm run prod:update -- "msg"`, default message = last commit subject): `eas-cli update`, channel and environment `production`. The app downloads it on launch and runs it on the next start. `runtimeVersion` policy `appVersion`: only APKs with the same `expo.version` receive it. Rollback: `npx eas-cli update:rollback`.

**APK** (`npm run prod:release`, `apps/web/scripts/release-android.mjs`): asks to confirm → EAS build, profile `production` (10–20 min) → uploads APK + `latest.json` to Blob. EAS builds committed code. If the build finished but publishing failed: `npm run prod:release -- --build <build-id>`. `versionCode` is incremented by EAS. On each phone: landing → «Скачать APK»; it installs over the previous release, the session is kept.

**Catalog seed** (after changing `catalog.ts` / `recipes.ts`; upserts, never touches family edits):

```bash
 DATABASE_URL='postgresql://…?sslmode=require' npm run db:seed   # Neon unpooled URL; leading space keeps it out of history
```

## Troubleshooting

- **Phone: «Журнал»**, the floating bug button (temporary; hide with `EXPO_PUBLIC_DEV_LOG=0` in EAS env). It logs sign-in steps, failed API calls with `x-vercel-id`, auto sign-out reasons, crashes; build info shows the API URL and the OTA update id. «Поделиться» sends it as text.
- **Server: Vercel → `eat-and-calc-api` → Logs**, search `"tag":"auth"` (`user_rejected`, `session_rejected`, `request_unauthorized`, `api_error`, …). `AUTH_LOG_LEVEL=debug` + Redeploy for more. Hobby keeps logs briefly.

| Symptom | Cause / fix |
|---|---|
| `DEVELOPER_ERROR` / code 10 on sign-in | Package + SHA-1 of the installed APK isn't a Google Android client, or `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is wrong / missing in EAS env |
| `Google: cancelled` without closing the picker | The account isn't a test user on the consent screen |
| 403 / «Доступ только для членов семьи…» | Email not in `ALLOWED_EMAILS` (edited env needs a Redeploy) |
| 401 `INVALID_TOKEN` | `GOOGLE_CLIENT_ID` in Vercel differs from the app's Web client ID |
| `GET /api/me → 401` + auto sign-out | Session cookie not accepted; check `BETTER_AUTH_URL` and `request_unauthorized` in Logs |
| `/api/health` 500, `/api/auth/ok` 200 | DB unreachable: `DATABASE_URL` (needs `sslmode=require`) |
| `/api/auth/ok` 500 | An auth env var is missing or added without Redeploy |
| Vercel build: `X is not set` | Something reads env at import time; keep env, auth and Prisma lazy (`apps/api/src/lib/env.ts`) |
| Web build: `Module not found: @eatandcalc/…` | The workspace package isn't in `apps/web/package.json` |
| App: `EXPO_PUBLIC_API_URL is not set` / wrong server | `npx eas-cli env:list --environment production`, fix, then OTA or rebuild |
| `BLOB_READ_WRITE_TOKEN is not set` / `BlobStoreNotFoundError` | Copy the current store's read-write token into `apps/web/.env.local` |
| Landing button grey / old version | Store not connected to `eat-and-calc-web` (Redeploy), or wait 60 s |
| Local phone can't reach the Mac | Android → Apps → Chrome / «Eat And Calc (dev)» → Permissions → Nearby devices → Allow; same Wi-Fi; `http://<Mac LAN IP>:3000/api/health` |
