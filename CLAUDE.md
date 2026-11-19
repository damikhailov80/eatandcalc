# CLAUDE.md

## Project

Monorepo (npm workspaces): Expo / React Native Android app for family nutrition planning, a Next.js API and a Next.js landing page: products, recipes (templates), cooking sessions (concrete pots), per-member consumption, daily planner with norms. The idea is in `README.md`, stages in `ROADMAP.md`, design in `design/mockups/`.

Current stage: **1 (backend & auth) built; local development only** (Docker DB, local API, dev build on two phones over Wi-Fi; Google OAuth setup in README "One-time setup → Local"). Vercel, Neon, EAS and the APK landing are **postponed to the final release**; don't push work toward them unless asked. Stage 4 (family, roles, invites) is built ahead of order. Next: **Stage 2, products**.

Decided: Android only; Google sign-in only, allowlist `ALLOWED_EMAILS` filters who can sign in; each account starts with its own household as **owner**, others join by **invite** (link/code, 7 days) as **member**; everyone edits data, only the owner invites/removes accounts, a member can leave; the app is **online-only** (TanStack Query is a request cache, no offline writes); domains `*.vercel.app` for now.

## Rules

- **Answer in the language of the user's request.** Docs, code and comments in English. **All UI strings in Russian**; don't translate them.
- **Documentation:** `README.md` (idea + how to run), `CLAUDE.md`, `ROADMAP.md`, plus guides the user asked for in `docs/`: `google-oauth.md` (OAuth setup), `builds-and-updates.md` (dev build, hot reload, release APK, EAS Update), `production-release.md` (prod setup, APK release, OTA, troubleshooting). Keep them in sync when the flow changes. Never create other `.md` files unless the user explicitly asks; put new info into the existing ones.
- **Git:** never run `git add`, `git rm`, `git commit`, `git push` or anything else that changes the index/history without the user's explicit approval. Delete files with plain `rm`.
- **Package manager:** npm only, workspaces. In `apps/mobile` add packages with `npx expo install <pkg>`; elsewhere `npm install <pkg> -w @eatandcalc/<name>`. Keep `react` / `react-dom` versions identical in all apps.

## Commands

```bash
npm install
npm run db:up           # Postgres in Docker, localhost:5434
npm run db:migrate      # prisma migrate dev (new migration: add --name in packages/db)
npm run dev:api         # Next API on :3000
npm run dev:mobile      # Expo (dev build, not Expo Go)
npm run dev:web         # landing on :3001
npm run dev             # db:up + api + web + mobile together (concurrently)
npm run db:studio       # Prisma Studio on :5555
npm run dev:build       # local dev APK build + install over USB (only after native changes)
npm run prod:update     # OTA (EAS Update) of JS/TS to production; optional -- "msg", default = last commit subject
npm run prod:release    # new production APK: EAS build → Vercel Blob → landing (asks for confirmation)
node apps/mobile/scripts/android-sha1.mjs   # one-time: SHA-1 of the dev signing key for Google Cloud
npm run typecheck       # all workspaces (run before declaring work done; also the husky pre-commit hook)
npm run lint
cd apps/mobile && npx expo-doctor
```

## Conventions

- **Expo SDK 58.** Expo APIs change every SDK; check https://docs.expo.dev/versions/v58.0.0/ or https://docs.expo.dev/llms.txt instead of relying on memory.
- **Workspaces:** `apps/mobile`, `apps/api`, `apps/web`, `packages/db` (Prisma), `packages/shared` (types, zod API schemas, nutrition, format, tokens). Packages ship TS sources (no build step); Next apps list them in `transpilePackages`.
- **Routing (mobile):** expo-router, routes only in `apps/mobile/src/app/`. Non-route code lives outside `src/app/`. Import alias `@/` → `apps/mobile/src/` (same alias in each Next app → its own `src/`).
- **Auth:** every screen except `sign-in` and `join/*` (invite deep link; it asks to sign in itself) sits behind `Stack.Protected` in the root layout. Mobile signs in with a native Google ID token → Better Auth (`apps/api/src/lib/auth.ts`); allowlist + household assignment happen in Better Auth DB hooks.
- **API:** mobile never talks to the DB. Every route handler is wrapped in `withUser` (`apps/api/src/lib/session.ts`) and filters by `householdId`; owner-only actions call `requireOwner`. Business errors are `ApiErrors` codes with 400/404/409, never 401/403 (the client signs out only on 401 or 403 `NOT_IN_FAMILY`). Bodies are parsed with `parseBody(request, Schema)`. Request/response shapes are zod schemas in `packages/shared/src/api.ts`; the client calls through `apps/mobile/src/lib/api.ts`.
- **Sync between devices:** every successful non-GET request through `withUser` bumps `household.revision` (`bumpRevision` in `lib/household.ts`; join also bumps the joined household). Mobile `useHouseholdSync` (`lib/sync.ts`, mounted in the tabs layout) polls `GET /api/sync` (`householdId` + `revision`) every 15 s while the app is foregrounded and invalidates all queries when it changes; `lib/query.ts` wires TanStack `focusManager`/`onlineManager` to `AppState`/`expo-network`. Data tabs pass `onRefresh={refreshAll}` to `Screen` (pull-to-refresh); editors don't.
- **DB:** Prisma 7 with `@prisma/adapter-pg`; import `prisma` from `@eatandcalc/db` (server only — never in mobile/web). Schema changes = new migration in `packages/db/prisma/migrations`, backward compatible (old app versions keep working). Tables `snake_case` via `@@map`/`@map`.
- **UI:** own components in `src/components/ui/`. No react-native-paper or other UI kits. Colors, radii, spacing and fonts come only from `@/theme`; no hard-coded hex values in screens. Use `Text` from the UI kit, not RN `Text`.
- **Design fidelity:** match `design/mockups/` (screen table below). Touch targets ≥ 44, tabular figures, ru-RU number formatting via `@eatandcalc/shared` (`format.ts`) (`1 435`, `13,2`).
- **Numeric input:** `keyboardType="decimal-pad"`; accept both `,` and `.`.
- **Nutrition math:** only through `@eatandcalc/shared` (`nutrition.ts`, pure functions). Don't compute KBJU inline in components.
- Don't edit `apps/mobile/android/` (generated). Native config goes in `app.json`; `app.config.ts` only adds per-variant tweaks (`APP_VARIANT=development` → name "Eat And Calc (dev)", `.dev` package, `*-dev.png` icons: peach background + "DEV" badge). App icons are in `apps/mobile/assets/images/` (green apple on `primarySoft`). Native modules not in Expo Go need a dev build.

## Data model

Types: `packages/shared/src/domain.ts`; DB schema: `packages/db/prisma/schema.prisma` (so far auth tables + `household`, `household_user` (with `role`), `household_invite`, `family_member`; other domain tables arrive with their stages). Everything belongs to a **Household**; several accounts share one household.

```
Household ─┬─ HouseholdUser (account, role owner|member), HouseholdInvite (code, expiresAt)
           ├─ FamilyMember (norms; not an account, archived on delete)
           ├─ Product ── ProductUnit[]
           ├─ Recipe ── RecipeItem[] ──► Product
           ├─ CookingSession ── CookingItem[] (snapshot) ──► Recipe? (origin only)
           └─ Meal (date, type) ── MealDish ──► CookingSession
                                     └─ Consumption[] ──► FamilyMember (grams)
```

- **Product:** `nutrients` are for one `basisUnitId` ("100 г", "1 шт", "ст. л."). `units[]` have `grams` per unit (`null` if unknown). Deleting archives; history keeps its values.
- **Recipe** = template: items, `totalWeightG` (`null` = sum of raw weights), `portions`. **Never modified by cooking**; "В рецепт…" is an explicit separate action.
- **CookingSession** = one real pot: `date`, optional `recipeId` / `copiedFromId`, `items[]` is a **snapshot** (name, amount, grams, nutrients copied), `cookedWeightG` (weighed finished dish), `portions`. Leftover = `cookedWeightG − Σ consumptions`.
- **Meal** (`breakfast | lunch | dinner | snack`, several snacks allowed) → **MealDish** (one session; the same session can appear in several meals/days) → **Consumption** (`memberId`, `grams`). One dish, many members, no copies.

| Value | Formula |
|---|---|
| Ingredient | `nutrients × amount` in basis unit, else `× grams / basisUnitGrams` |
| Per 100 g / portion | `total × 100 / cookedWeightG` / `total / portions` |
| **Consumption** | `sessionTotal / cookedWeightG × gramsEaten` |
| Remaining | `norm − eaten` (negative = exceeded) |
| Energy check | `P×4 + F×9 + C×4` vs. entered kcal |

## Design

Canvas: https://claude.ai/artifact/2z294jKrReMD5qKXG5vYUR (local copy `design/mockups/*.dc.html`, reference only, never imported). Phone frame 390 pt. Tokens in `packages/shared/src/tokens.ts` (mobile imports via `@/theme`, web maps them to CSS variables): warm bg `#F6F4EF`, white cards (radius 20), primary green `#2E7D4F` / dark `#1F5E3A` / soft `#E3F0E7`, exceeded `#C2410C`, macro colors kcal green, protein `#3566B0`, fat `#B7791F`, carbs `#7A5AB0`, member avatar colors. Fonts: Manrope 700/800 headings, Inter body. Icons: `MaterialCommunityIcons` outline.

| Mockup | Screen | Key elements |
|---|---|---|
| `Main` | Day plan (main tab) | weekday strip; copy-day & history buttons; per-member kcal rings with "ещё N" / over badge; meal cards with dishes (session date, kcal/100 g, leftover, weight, member chips with grams); "+ Блюдо"; "Добавить приём пищи" |
| `MemberStats` | Member's day | member switcher; kcal ring; macro bars; norm / eaten / remaining table; by meal |
| `AddDish` | Add dish (sheet) | Готовки / Рецепты; leftovers; recent sessions with "Повторить"; recipes → new session |
| `Distribute` | Split dish | session summary; eaten vs. cooked, leftover; "Поровну", "Всё без остатка", "Как в прошлый раз"; per-member toggle, grams, day remaining, macros |
| `History` | Nutrition history | family/member filter; month calendar with status dots; week average; past days with copy-to-today |
| `CookingHistory` | Cooking tab | filters Все / С остатками / Без рецепта; by date; eaten progress, leftover; "Повторить сегодня", "Копировать и изменить" |
| `CookingEdit` | Session editor | recipe multiplier; ingredient steppers vs. recipe; cooked weight; portions; totals, per 100 g, per portion; "В рецепт…", "Сохранить и распределить" |
| `WeightPad` | Amount entry (sheet) | frequent products; unit switch (г / ст. л. / ч. л.); keypad; live kcal |
| `Recipes` | Recipes tab | sort; card with kcal/portion, ingredients, macro bar; menu: cook today, edit, copy, delete |
| `RecipeEdit` | Recipe editor | ingredient steppers in their units; total weight or sum; portions; per portion / dish / 100 g |
| `Products` | Products tab | search; category chips; rows with category tile, macros, basis; swipe edit/delete |
| `ProductEdit` | Product editor | category; basis (100 г / 1 шт / ч. л. / ст. л. / Своя); KBJU inputs; macro check; extra units; delete note |
| `Family` | Family tab | member cards: norm, today's bar, macro chips |
| `MemberEdit` | Member profile | color; name; sex; norm steppers; macro energy check |

Components to build as needed: Chip, SearchField, NumberField, ProgressRing, MacroBar, MemberChip, DateStrip, SwipeRow, BottomSheet, NumericKeypad (built: SegmentedControl, Stepper, ProgressBar, MemberAvatar, StickyFooter, TextField, IconButton).

## File map

| Path | Role |
|---|---|
| `apps/mobile/src/app/_layout.tsx` | root Stack, fonts, splash, auth guard, QueryClientProvider |
| `apps/mobile/src/app/sign-in.tsx` | Google sign-in screen |
| `apps/mobile/src/app/member/[id].tsx` | member profile editor (`new` = create) |
| `apps/mobile/src/app/diagnostics.tsx`, `components/DevLogButton.tsx` | temporary debug «Журнал»: floating button on every screen (off with `EXPO_PUBLIC_DEV_LOG=0`) → log with tag filter, share as text |
| `apps/mobile/src/app/join/` | join by invite: `[code]` (deep link `eatandcalc://join/<code>`), `index` (typed code); outside the auth guard |
| `apps/mobile/src/components/family/` | Family tab pieces: `MemberCard`, `MemberForm`, `AccountsCard` (roles, invite), `JoinFamily`, `errors` |
| `apps/mobile/src/app/(tabs)/` | tab screens (День, Готовка, Рецепты, Продукты, Семья) |
| `apps/mobile/src/components/ui/` | Screen (`onBack`, `footer`, `onRefresh`), Text, Card, Button, IconButton, TextField, Stepper, SegmentedControl, ProgressBar, MemberAvatar, StickyFooter, Placeholder, StateMessage |
| `apps/mobile/src/lib/` | `config` (API and landing URLs), `auth` (Better Auth client, Google), `api` (fetch + zod), `query` (client, focus/online wiring, `refreshAll`), `sync` (`useHouseholdSync`), `diagnostics` (SecureStore ring buffer, `diag(tag, msg, level)`, console/crash capture, auto sign-out reason) |
| `apps/mobile/scripts/` | `android-dev` (local Gradle build → `dist/eatandcalc-dev.apk` + `dist/dev.json`), `android-sha1`, `android-env` (JDK/SDK, keystore) |
| `apps/mobile/eas.json` | build profiles (development / production APK), update channels |
| `apps/api/src/lib/` | `auth` (Better Auth), `session` (`withUser`), `http` (`HttpError`, `parseBody`), `household` (membership, invites, join/leave/remove), `family`, `env`, `log` (`authLog`: JSON lines `"tag":"auth"` for Vercel Logs) |
| `apps/api/src/app/api/` | route handlers: `auth/[...all]`, `me`, `sync`, `health`, `household/{invite,join,leave,accounts/[userId]}`, `family-members[/id]` |
| `apps/api/src/app/invite/[code]/` | legacy invite link: redirects to the landing's invite page |
| `apps/web/src/app/page.tsx` | landing: headline + QR to itself, download card; under `next dev` the same card serves the local dev APK |
| `apps/web/src/app/invite/[code]/` | public invite page (shared link): opens the app via Android intent, else offers the APK; shows the code |
| `apps/web/src/app-download.ts` | APK to offer: local dev build under `next dev`, else the Blob release |
| `apps/web/src/dev-build.ts`, `app/download/dev/` | local-only dev APK info and download (404 in production) |
| `apps/web/scripts/release-android.mjs` | EAS build → Vercel Blob (`android/eatandcalc.apk`, `android/latest.json`) |
| `packages/db/prisma/` | `schema.prisma`, `migrations/`, `seed.ts`; config `packages/db/prisma.config.ts` |
| `packages/shared/src/` | `domain`, `api` (zod), `nutrition`, `format`, `tokens` |
| `docker-compose.yml` | local Postgres 17 (+ shadow DB) |
| `.husky/pre-commit` | git hook: `npm run typecheck` |
| `.github/workflows/` | `check` (typecheck, lint), `migrate` (prod migrations) |
| `docs/` | guides: Google OAuth setup, builds & OTA updates, production release |
| `design/mockups/` | Claude Design sources |
