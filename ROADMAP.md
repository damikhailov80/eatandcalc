# Roadmap

Development goes in stages; each stage ends with a working app.

| # | Stage | Scope | Status |
|---|---|---|---|
| 0 | Boilerplate | Expo SDK 58 + expo-router, 5 tabs, theme tokens, base UI kit, domain types, nutrition math | ✅ done |
| 1 | Backend & auth | Monorepo; Next.js API on Vercel, Better Auth (Google, allowlist), Prisma + Neon, household, `/api/me`; sign-in screen and guard; landing with APK download; CI migrations | 🔧 code done; local dev setup (Google OAuth) pending |
| 2 | Products | List, search, category filter, create/edit/delete, units & gram weights, seed catalog | |
| 3 | Recipes | List, editor with steppers, totals / per portion / per 100 g, copy, delete | |
| 4 | Family | Members list, profile editor, norms, macro-energy check; account roles (owner/member), invite link + code, join/leave/remove | ✅ done (today's eaten = 0 until stage 6) |
| 5 | Cooking | Session from recipe or blank, editor (multiplier, cooked weight), quick weight pad, history with leftovers, repeat/copy | |
| 6 | Daily planner | Date strip, meals, add dish (leftovers / history / recipe), distribution between members, member rings | |
| 7 | Stats & history | Member day stats, history calendar, copy a day's plan | |
| 8 | Polish | Frequent items, empty states, haptics, performance | |
| 9 | Release | Vercel (API + landing), Neon, CI migrations, EAS production APK on the landing, EAS Update | code from stage 1 waits |

## Decided

- Android only (APK from the landing page, no Google Play); iOS later if ever.
- Backend: Next.js Route Handlers (`apps/api`) on Vercel, Prisma 7 → Neon PostgreSQL (Frankfurt); Docker Postgres locally.
- Auth: Better Auth, Google only, native ID-token sign-in; access limited by `ALLOWED_EMAILS`.
- Households: each account gets its own on first sign-in and is its owner; others join by invite (link `<landing>/invite/<code>` → `eatandcalc://join/<code>` or the APK download if not installed, or the code typed in; valid 7 days, one active per household). Owner: invites, removes accounts; member: can leave. Everyone edits data. `ALLOWED_EMAILS` still filters who can sign in.
- Online-only: no offline writes or sync; TanStack Query is just a request cache.
- Domains: `*.vercel.app` until a real domain is bought.
- Until the release stage everything runs locally: Docker DB, API on the Mac, dev build (built locally, no EAS) on two phones over Wi-Fi.

## Open questions

- Postgres schema for Stage 2+: cooking snapshots as JSONB or a `cooking_items` table; numeric precision.
- Seed product catalog: per household or a shared global one.
- Time zones: `date` is the household's local calendar date.
- Conflict handling when two people edit the same day (last write wins?).
