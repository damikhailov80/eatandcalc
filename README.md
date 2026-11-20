# eatandcalc

Android app for a family's nutrition: how many kcal, protein, fat and carbs each member ate today vs. their norm. No cooking instructions, only composition and numbers. UI is in Russian.

Chain: **products → recipes (templates) → cooking sessions (real pots, weighed) → who ate how many grams** of which dish on the day plan (plus fast-food dishes of McDonald's, KFC, Burger King, Pizza Hut); history shows days in / over / under the norm. Google sign-in for the family's accounts only; one household shared by invite; online-only.

## Architecture

```
apps/mobile      Expo app (Android), Google sign-in, talks only to apps/api
apps/api         Next.js Route Handlers on Vercel: Better Auth + Prisma → Neon
apps/web         Next.js landing page: APK download (locally the dev APK)
packages/db      Prisma schema, migrations, client
packages/shared  domain types, API zod schemas, nutrition math, formatting, design tokens
```

Stack: Expo SDK 58 · React Native 0.88 · React 19 · TypeScript · expo-router · Next.js 16 · Better Auth · Prisma 7 · PostgreSQL 17 (Docker locally, Neon in prod) · Vercel · EAS Build / Update.

Production, releases and troubleshooting: [docs/production-release.md](docs/production-release.md).

## Run locally

Needs Node.js LTS, Docker, Android Studio (SDK + JDK for the build scripts), phones on the same Wi-Fi with the dev build (Expo Go can't do native Google sign-in).

```bash
npm install
cp packages/db/.env.example packages/db/.env.local   # Docker URLs
cp apps/api/.env.example    apps/api/.env.local      # BETTER_AUTH_SECRET, Google Web client id/secret, ALLOWED_EMAILS
cp apps/mobile/.env.example apps/mobile/.env.local   # EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
cp apps/web/.env.example    apps/web/.env.local      # Blob token (releases only)
npm run db:up && npm run db:migrate && npm run db:seed
npm run dev:build      # dev APK (only after native changes); installs over USB
npm run dev            # db + API :3000 + landing :3001 + Metro :8081
```

- Install the dev APK without USB: open `http://<Mac LAN IP>:3001` on the phone → «Скачать APK».
- The dev build has Metro's `http://<Mac LAN IP>:8081` baked in; if the Mac's IP changes, rebuild. JS changes arrive through Metro.
- The dev build is signed with `apps/mobile/credentials/debug.keystore` (gitignored): keep it, Google knows its SHA-1.
- Checks: `npm run typecheck`, `npm run lint`, `cd apps/mobile && npx expo-doctor`; husky `pre-commit` runs typecheck.

## Secrets

| Value | Where |
|---|---|
| `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAILS` | Vercel env `eat-and-calc-api`; locally `apps/api/.env.local` |
| `DIRECT_URL` (Neon unpooled) | GitHub → Environments → `production` |
| `BLOB_READ_WRITE_TOKEN` | Vercel `eat-and-calc-web` (auto); locally `apps/web/.env.local` for releases |
| `EXPO_PUBLIC_*` | not secret: EAS env `production`; locally `apps/mobile/.env.local` |
| Android keystore | dev: `apps/mobile/credentials/debug.keystore`; prod: EAS managed |

`.env*.local` are gitignored; master copies in a password manager.
