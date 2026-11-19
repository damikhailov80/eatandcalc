# eatandcalc

Android app for planning and tracking a family's nutrition. UI is in Russian.

## Idea

It is **not a recipe book**: no cooking instructions, only composition and numbers. The app answers one question: *how many kcal, protein, fat and carbs did each family member eat today, compared to their norm?*

The chain is: **products → recipes → cooking sessions → who ate how much**.

| Section (tab) | What it does |
|---|---|
| **День** (main screen) | Pick a date; meals (breakfast, lunch, dinner, snacks) with several dishes each. One cooked dish is shared between members, each with their own grams. Rings and bars show eaten / remaining / exceeded per member. Switch dates, edit past days, copy a previous day's plan, view history. |
| **Готовка** | A cooking session is one concrete pot on a date, usually from a recipe. Change ingredients, weights, portions, and weigh the finished dish; nutrition recalculates. History with leftovers; repeat or copy a session. Never changes the recipe. |
| **Рецепты** | Templates: ingredient list with amounts, total weight, portions, nutrition per dish / portion / 100 g. Create, edit, copy, delete, search. |
| **Продукты** | Product database with kcal / P / F / C per 100 g, per piece, per tsp / tbsp or a custom unit, plus extra units with gram weight (1 tbsp oil = 13.5 g). Search, category filter, CRUD. |
| **Семья** | Members with sex and daily norms (kcal, protein, fat, carbs); per-member stats. |

Three entities are kept separate: **Recipe** (template, e.g. chicken 200 g + rice 100 g), **Cooking session** (800 g cooked on Nov 15, maybe modified), **Consumption** (Anna ate 150 g of it). A person's intake = session nutrients ÷ cooked weight × grams eaten.

Accounts: Google sign-in only, limited to the family's accounts (allowlist); data in Neon PostgreSQL. Each account starts with its own household and becomes its **owner**; the owner invites the second adult with a link/code (Семья → «Пригласить в семью»), who joins as a **member**. Everyone edits data; only the owner manages invites and removes accounts. The app is online-only.

UX priorities: minimal taps to add a dish, easy weight editing with the numeric keyboard, automatic recalculation, quick access to frequent products and recipes, easy date switching. Visual style: light warm background, green accents, rounded cards, progress rings and bars.

Design: [Claude Design canvas](https://claude.ai/artifact/2z294jKrReMD5qKXG5vYUR), 14 screens; local copy in `design/mockups/`.
Development plan: [ROADMAP.md](ROADMAP.md).

## Architecture

```
apps/mobile      Expo app (Android), Google sign-in, talks only to apps/api
apps/api         Next.js Route Handlers on Vercel: Better Auth + Prisma → Neon
apps/web         Next.js landing page: APK download (locally the dev APK)
packages/db      Prisma schema, migrations, client
packages/shared  domain types, API zod schemas, nutrition math, formatting, design tokens
```

Stack: Expo SDK 58 · React Native 0.88 · React 19 · TypeScript · expo-router · Next.js 16 · Better Auth · Prisma 7 · PostgreSQL 17 (Docker locally, Neon in prod) · Vercel · EAS Build / Update.

## Run locally

Requires Node.js LTS, Docker, Android Studio (its SDK and JDK are used by the build scripts), Android phones on the same Wi-Fi as the Mac with the **development build** installed (Expo Go can't do native Google sign-in), and the Google OAuth clients from "One-time setup → Local".

```bash
npm install
cp packages/db/.env.example packages/db/.env.local   # Docker URLs
cp apps/api/.env.example    apps/api/.env.local      # + BETTER_AUTH_SECRET, Google Web client id/secret
cp apps/mobile/.env.example apps/mobile/.env.local   # + EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
cp apps/web/.env.example    apps/web/.env.local      # optional, Blob token

npm run db:up          # Postgres 17 in Docker on localhost:5434
npm run db:migrate     # prisma migrate dev
npm run db:seed        # shared product catalog (upsert, re-run after editing packages/db/prisma/catalog.ts)
npm run dev:api        # API on 0.0.0.0:3000
npm run dev:mobile     # Metro on :8081 for the dev build; the app calls http://<Mac LAN IP>:3000
npm run dev:web        # landing on :3001 (+ dev APK download for phones)
npm run dev            # db:up + api, web and mobile in one terminal (Ctrl+C stops all)
npm run db:studio      # Prisma Studio on :5555
npm run dev:build    # build the dev APK on this Mac, install on USB phones (only after native changes)
node apps/mobile/scripts/android-sha1.mjs   # SHA-1 of the dev signing key, for Google Cloud
```

**Installing the dev build on a phone:** with `npm run dev` running, open `http://localhost:3001` on the Mac and scan the QR code with the phone (or open `http://<Mac LAN IP>:3001` on the phone) → "Скачать APK" → install. Under `next dev` the landing's download card serves the dev APK from `apps/mobile/dist` (built by `npm run dev:build`); in production it serves the published release.

**Connecting to Metro:** the dev build has `http://<Mac LAN IP>:8081` baked in at build time and opens it on launch; if the Mac's IP changes, rebuild (`npm run dev:build`). Fallback: the launcher's Enter URL manually. Metro's interactive keys (`r` reload) are unavailable inside `npm run dev`; run `npm run dev:mobile` in its own terminal when you need them.

The dev build only needs rebuilding (`npm run dev:build`) after adding a native library or changing `app.json`; JS changes arrive through Metro. It is signed with `apps/mobile/credentials/debug.keystore` (gitignored, created on first run): keep it, Google Cloud knows its SHA-1.

**Inviting the second phone locally:** sign in on phone A (owner) → Семья → «Пригласить в семью» → «Поделиться ссылкой». The link is `http://<Mac LAN IP>:3001/invite/<code>` (the landing), so phone B must be on the same Wi-Fi; «Открыть в приложении» opens the app at `eatandcalc://join/<code>`, and if the app isn't installed the page jumps to its «Скачать APK» step; or type the code in Семья → «Присоединиться по коду». The account must still be in `ALLOWED_EMAILS`. Joining deletes the joiner's own (empty) household.

Checks: `npm run typecheck`, `npm run lint`, `cd apps/mobile && npx expo-doctor`. A husky `pre-commit` hook (installed by `npm install`) runs `npm run typecheck`; skip once with `git commit --no-verify`.

## Deploy (later)

Postponed until the app is ready; the code is in place.


| What | How |
|---|---|
| API | Vercel project `eat-and-calc-api`, Root Directory `apps/api`; deploys on push to `main` |
| Landing | Vercel project `eat-and-calc-web`, Root Directory `apps/web` |
| DB migrations | GitHub Action `migrate.yml` runs `prisma migrate deploy` on push to `main` when `packages/db/prisma/**` changes |
| Android APK | `npm run prod:release`: EAS production build → Vercel Blob → link on the landing |
| JS-only fixes | `npm run prod:update -- "what changed"` (EAS Update, OTA, no reinstall) |

## Secrets

| Value | Where |
|---|---|
| `DATABASE_URL` (Neon pooled), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAILS` | Vercel env, project `eat-and-calc-api`; locally `apps/api/.env.local` |
| `DIRECT_URL` (Neon unpooled) | GitHub → Settings → Environments → `production` secret |
| `BLOB_STORE_ID` / `BLOB_READ_WRITE_TOKEN` | Vercel env, project `eat-and-calc-web` (auto from the connected Blob store); locally the read-write token in `apps/web/.env.local` for releases |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_URL` | not secret (in the bundle): EAS env, environment `production` |
| Android keystore | dev: `apps/mobile/credentials/debug.keystore` (gitignored); prod: EAS managed credentials |

`.env*.local` files are gitignored. Keep master copies in a password manager.

## One-time setup

Detailed guides: [docs/google-oauth.md](docs/google-oauth.md) (sign-in, troubleshooting), [docs/builds-and-updates.md](docs/builds-and-updates.md) (dev build, hot reload, release APK, over-the-air updates), [docs/production-release.md](docs/production-release.md) (production setup, releasing the APK, OTA, troubleshooting).

### Local (now)

1. **Google Cloud** (console.cloud.google.com):
   - New project `eatandcalc`.
   - Google Auth Platform → Get started: app name `eatandcalc`, your support email, Audience **External**, contact email.
   - Audience → Test users → add both family accounts. Stay in **Testing**: only test users can sign in.
   - Clients → Create client → **Web application** (`eatandcalc web`, no redirect URIs). Client ID → `GOOGLE_CLIENT_ID` (`apps/api/.env.local`) and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (`apps/mobile/.env.local`); secret → `GOOGLE_CLIENT_SECRET`.
   - Clients → Create client → **Android**: package `com.eatandcalc.app.dev` (the dev build; production is `com.eatandcalc.app`, so both install side by side), SHA-1 from `node apps/mobile/scripts/android-sha1.mjs`. Nothing to copy back; Google matches the app by package + SHA-1.
2. `BETTER_AUTH_SECRET` in `apps/api/.env.local`: `openssl rand -base64 32`.
3. `npm run dev:build` (installs over USB if a phone is connected).
4. `npm run dev`, install the dev APK from the landing page on each phone (allow installs from the browser), open Eat And Calc (dev), tap the Metro server, sign in.

### Production (later)

1. **Google Cloud**: one more Android client with the SHA-1 of the EAS keystore (`npx eas-cli credentials -p android`).
2. **Expo**: `cd apps/mobile && npx eas-cli login && npx eas-cli init && npx eas-cli update:configure`; `npx eas-cli env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <id> --visibility plaintext --environment production --environment development` and `EXPO_PUBLIC_API_URL=https://eat-and-calc-api.vercel.app`, `EXPO_PUBLIC_WEB_URL=https://eat-and-calc-web.vercel.app` for `production`.
3. **Vercel**: import the GitHub repo twice — `eat-and-calc-api` (Root Directory `apps/api`) and `eat-and-calc-web` (Root Directory `apps/web`). In `eat-and-calc-api`: Storage → Neon (region Frankfurt), then add the API env vars above with `BETTER_AUTH_URL=https://eat-and-calc-api.vercel.app`. In `eat-and-calc-web`: Storage → Blob.
4. **GitHub**: environment `production` with secret `DIRECT_URL` = Neon `DATABASE_URL_UNPOOLED`. Run the "Migrate database" workflow once.
5. `npm run prod:release` and open the landing page.
