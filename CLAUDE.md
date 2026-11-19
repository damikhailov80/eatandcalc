# CLAUDE.md

## Project

Monorepo (npm workspaces): Expo / React Native Android app for family nutrition planning, a Next.js API and a Next.js landing page: products, recipes (templates), cooking sessions (concrete pots), per-member consumption, daily planner with norms. The idea is in `README.md`, stages in `ROADMAP.md`, design in `design/mockups/`.

Current stage: **1 (backend & auth) built; local development only** (Docker DB, local API, dev build on two phones over Wi-Fi; Google OAuth setup in README "One-time setup → Local"). Vercel, Neon, EAS and the APK landing are **postponed to the final release**; don't push work toward them unless asked. Stage 4 (family, roles, invites) is built ahead of order. Stages 2 (products), 3 (recipes) and 5 (cooking) are done (decisions in `ROADMAP.md` → "Stage 2 plan", "Stage 3 plan", "Stage 5 plan").

Decided: Android only; Google sign-in only, allowlist `ALLOWED_EMAILS` filters who can sign in; each account starts with its own household as **owner**, others join by **invite** (link/code/QR, valid until the owner revokes or replaces it) as **member**; everyone edits data, only the owner invites/removes accounts, a member can leave; the app is **online-only** (TanStack Query is a request cache, no offline writes); domains `*.vercel.app` for now.

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
npm run db:seed         # upsert the shared product + recipe catalogs (packages/db/prisma/catalog.ts, recipes.ts)
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
- **Sync between devices:** every successful non-GET request through `withUser` bumps `household.revision` (`bumpRevision` in `lib/household.ts`; join also bumps the joined household). Mobile `useHouseholdSync` (`lib/sync.ts`, mounted in the tabs layout) polls `GET /api/sync` (`householdId` + `revision`) every 15 s while the app is foregrounded and invalidates all queries when it changes; `lib/query.ts` wires TanStack `focusManager`/`onlineManager` to `AppState`/`expo-network`. Data tabs pass `onRefresh={refreshAll}` to `Screen` / `ListScreen` (pull-to-refresh); editors don't. Long lists (products) use `ListScreen` with memoized rows and stable callbacks, never a `.map` inside `Screen`.
- **DB:** Prisma 7 with `@prisma/adapter-pg`; import `prisma` from `@eatandcalc/db` (server only — never in mobile/web). Schema changes = new migration in `packages/db/prisma/migrations`, backward compatible (old app versions keep working). Tables `snake_case` via `@@map`/`@map`.
- **UI:** own components in `src/components/ui/`. No react-native-paper or other UI kits. Colors, radii, spacing and fonts come only from `@/theme`; no hard-coded hex values in screens. Use `Text` from the UI kit, not RN `Text`.
- **Design fidelity:** match `design/mockups/` (screen table below). Touch targets ≥ 44, tabular figures, ru-RU number formatting via `@eatandcalc/shared` (`format.ts`) (`1 435`, `13,2`).
- **Numeric input:** `keyboardType="decimal-pad"`; accept both `,` and `.`.
- **Nutrition math:** only through `@eatandcalc/shared` (`nutrition.ts`, pure functions). Don't compute KBJU inline in components.
- Don't edit `apps/mobile/android/` (generated). Native config goes in `app.json`; `app.config.ts` only adds per-variant tweaks (`APP_VARIANT=development` → name "Eat And Calc (dev)", `.dev` package, `*-dev.png` icons: peach background + "DEV" badge). App icons are in `apps/mobile/assets/images/` (green apple on `primarySoft`). Native modules not in Expo Go need a dev build.

## Data model

Types: `packages/shared/src/domain.ts`; DB schema: `packages/db/prisma/schema.prisma` (so far auth tables + `household`, `household_user` (with `role`), `household_invite`, `family_member`, `product`, `household_product`, `product_favorite`, `recipe`, `household_recipe`, `recipe_favorite`, `cooking_session`; other domain tables arrive with their stages). Everything belongs to a **Household**; several accounts share one household.

```
Household ─┬─ HouseholdUser (account, role owner|member), HouseholdInvite (code; no expiry)
           ├─ FamilyMember (norms; not an account, archived on delete)
           ├─ Product (own; catalog rows have no household) + HouseholdProduct (override, hidden)
           ├─ Recipe (own; catalog rows have no household) + HouseholdRecipe ── items[] ──► Product
           ├─ CookingSession ── CookingItem[] (snapshot) ──► Recipe? (origin only)
           └─ Meal (date, type) ── MealDish ──► CookingSession
                                     └─ Consumption[] ──► FamilyMember (grams)
```

- **Product:** `nutrients` always per **100 g**; `units` = grams per one unit for a fixed set (`ml`, `tsp`, `tbsp`, `pieceS/M/L`; `g` is implicit), a missing key = not measured that way. One `product` table: `household_id` null = shared **catalog** (seeded from `packages/db/prisma/catalog.ts`, permanent `cat-…` ids), set = the family's **own** product. Catalog values are exactly USDA FoodData Central (SR Legacy, FDC id per row in `catalog.ts`); only products present there; `npm run db:seed` upserts and drops unreferenced removed rows. Families never touch catalog rows: `household_product` holds their `override` (full copy, reset = drop it) and `hidden_at` (catalog products only; own products are deleted, `DELETE /api/products/:id`). Favorites (`product_favorite`) are per **account**. `GET /api/products` returns the merged list, `PATCH /api/products/:id` edits an own product or saves the family's override (equal to catalog = no override), `DELETE …/override` resets, `PUT|DELETE …/hidden` and `…/favorite` hide / ♥ (the app updates the cache optimistically, `useProductFlags`) (`ProductDto`: `source`, `modified`, `hidden`, `favorite`, `original`); filtering and search run on the client (`lib/products.ts`, `matchesSearch`). **Join** (`joinHousehold` → `mergeProductsOnJoin`): own products move, hiding is united, edits are added; `GET /api/household/join/preview?code=` lists products edited differently on both sides, the joiner's version wins unless its id is in `keepFamily` (picker `JoinConflicts`). **Leave / removal** (`moveToFreshHousehold` → `copyProductsOnLeave`): the family keeps all, the account gets a copy (own products with new ids, ♥ re-pointed, overrides, hiding).
- **Recipe** = template: `items` (JSON `[{ productId, amount, unit }]`, display order) only. No cooked weight, no portions: weight = sum of raw ingredient grams, KBJU = sum of ingredients; both computed on the client from the current product list (`recipeTotals` in `nutrition.ts`, `lib/recipes.ts` in mobile), never stored. Catalog / own / override / hidden / ♥ work exactly like products (`recipe.household_id` null = catalog from `packages/db/prisma/recipes.ts`, `rcp-…` ids; `household_recipe`, `recipe_favorite`; `RecipeDto` has the same flags as `ProductDto`; `POST /api/recipes`, `PATCH|DELETE /api/recipes/:id`, `DELETE …/override`, `PUT|DELETE …/hidden` and `…/favorite` as for products (`useRecipeFlags`); the server checks every item's product is visible and has the unit). Search matches the name or any ingredient. Deleting an own product used in the family's recipes (own or overrides) → 409 `PRODUCT_IN_USE` (`recipesUsing`). **Join / leave** as for products, after them: `mergeRecipesOnJoin` (preview `recipeConflicts` with product names, weight and kcal resolved per side; `keepFamilyRecipes` in the join request; both default to `[]` for old apps / servers), `copyRecipesOnLeave` (own recipes and overrides get `productId`s remapped to the copied own products from `copyProductsOnLeave`). **Never modified by cooking.**
- **CookingSession** (`cooking_session`) = one real pot: `date` (`@db.Date`, `YYYY-MM-DD` in the API), `name`, optional `recipeId` (origin; SetNull on delete) with `recipeScale` ×1..×4, optional `copiedFromId`, `items` JSON `CookingItem[]` = **frozen** rows (`productId`, `name`, `nutrients` per 100 g, `units`, `amount`, `unit`; copied from the product when the row is added and never refreshed, so product edits / deletes don't touch sessions), `potWeightG` (empty pot) and `grossWeightG` (pot with food). Cooked weight = gross − pot (`cookedWeight`); totals and per 100 g via `cookingTotals` (raw weight until weighed). `GET|POST /api/cooking`, `GET|PATCH|DELETE /api/cooking/:id` (`lib/cooking.ts`; the server checks the recipe is visible and the origin is the family's). Mobile: list grouped by day with name search (`lib/cooking.ts`), card «Приготовить снова» and the editor's repeat button open a copy dated today (`copyOfSession`: frozen rows, weights, recipe and ×N as they are, `copiedFromId` set); `cooking/start` picks a recipe, a past session (Рецепты / Готовки) or none; the recipe editor's «Приготовить» opens `cooking/new?recipe=`; `cooking/[id]` edits and deletes (`new` = draft, `?recipe=` or `?from=`); comparison with the recipe as the family sees it now (`recipeDiff`). **Join** (`moveCookingOnJoin`, after the recipe merge): sessions move as they are. **Leave / removal** (`copyCookingOnLeave`): the family keeps all, the account gets copies with new ids; rows' `productId`, `recipeId` and `copiedFromId` point to the copies (`copyRecipesOnLeave` returns its old → new map).
- **Meal** (`breakfast | lunch | dinner | snack`, several snacks allowed) → **MealDish** (one session; the same session can appear in several meals/days) → **Consumption** (`memberId`, `grams`). One dish, many members, no copies.

| Value | Formula |
|---|---|
| Ingredient | `nutrients × grams / 100`, grams = `amount × units[unit]` (`nutrientsOf`) |
| Recipe | weight = Σ ingredient grams, KBJU = Σ ingredients, per 100 g = `total × 100 / weight` (`recipeTotals`) |
| Cooked weight | `grossWeightG − potWeightG` (`cookedWeight`; null until weighed) |
| Cooking per 100 g | `total × 100 / cookedWeight` (raw weight until weighed) (`cookingTotals`) |
| **Consumption** | `sessionTotal / cookedWeightG × gramsEaten` |
| Remaining | `norm − eaten` (negative = exceeded) |
| Energy check | `P×4 + F×9 + C×4` vs. entered kcal (`energyCheck`: norms ±3 %, products ±10 % / 10 kcal; shown only when out of tolerance; unedited catalog values get an explanation instead of a warning) |

## Design

Canvas: https://claude.ai/artifact/2z294jKrReMD5qKXG5vYUR (local copy `design/mockups/*.dc.html`, reference only, never imported). Phone frame 390 pt. Tokens in `packages/shared/src/tokens.ts` (mobile imports via `@/theme`, web maps them to CSS variables): warm bg `#F6F4EF`, white cards (radius 20), primary green `#2E7D4F` / dark `#1F5E3A` / soft `#E3F0E7`, exceeded `#C2410C`, macro colors kcal green, protein `#3566B0`, fat `#B7791F`, carbs `#7A5AB0`, member avatar colors. Fonts: Manrope 700/800 headings, Inter body. Icons: `MaterialCommunityIcons` outline.

| Mockup | Screen | Key elements |
|---|---|---|
| `Main` | Day plan (main tab) | weekday strip; copy-day & history buttons; per-member kcal rings with "ещё N" / over badge; meal cards grouped by member (dishes with weight and kcal, the member's kcal per meal; no meal / family totals); "+ Блюдо"; "Добавить приём пищи" |
| `MemberStats` | Member's day | member switcher; kcal ring; macro bars; norm / eaten / remaining table; by meal |
| `AddDish` | Add dish (sheet) | Готовки / Рецепты; recent sessions with "Повторить"; recipes → new session |
| `Distribute` | Split dish | session summary; "Как в прошлый раз"; per-member toggle, grams, day remaining, macros |
| `History` | Nutrition history | family/member filter; month calendar with status dots; week average; past days with copy-to-today |
| `CookingHistory` | Cooking tab | name search; by date; card: kcal, source (по рецепту / изменено N / копия / без рецепта), weight, kcal/100 g; "Приготовить снова" |
| `CookingEdit` | Session editor | recipe multiplier ×1..×4; rows vs. recipe («в рецепте N г», «изменено: N»); date ‹ ›; pot + gross weight → cooked weight; totals, per 100 g (no portions; "В рецепт…" dropped, "Сохранить и распределить" with Stage 6) |
| `WeightPad` | Amount entry (sheet) | frequent products; unit switch (г / ст. л. / ч. л.); keypad; live kcal |
| `Recipes` | Recipes tab | search (name or product); filter chips as in Products; card with kcal per dish, ingredients, macro bar, weight, kcal/100 g; menu: edit, delete (no "copy": not needed); «Приготовить» sits in the recipe editor header |
| `RecipeEdit` | Recipe editor | ingredients in their units; weight = sum of ingredients (no total-weight field, no portions); per dish / 100 g |
| `Products` | Products tab | search; category chips; rows with category tile, macros, basis; swipe edit/delete |
| `ProductEdit` | Product editor | category; KBJU per 100 g (the basis switch is dropped); macro check; units with grams; hide / reset note |
| `Family` | Family tab | member cards: norm, today's bar, macro chips |
| `MemberEdit` | Member profile | color; name; sex; norm steppers; macro energy check |

Components to build as needed: ProgressRing, MacroBar, MemberChip, DateStrip, SwipeRow, BottomSheet, NumericKeypad (built: MacroBar, Chip/ChipRow, SearchField, NumberField, SegmentedControl, Stepper, ProgressBar, MemberAvatar, StickyFooter, TextField, IconButton, QrCode).

## File map

| Path | Role |
|---|---|
| `apps/mobile/src/app/_layout.tsx` | root Stack, fonts, splash, auth guard, QueryClientProvider |
| `apps/mobile/src/app/sign-in.tsx` | Google sign-in screen |
| `apps/mobile/src/app/member/[id].tsx` | member profile editor (`new` = create) |
| `apps/mobile/src/app/diagnostics.tsx`, `components/DevLogButton.tsx` | temporary debug «Журнал»: floating button on every screen (off with `EXPO_PUBLIC_DEV_LOG=0`) → log with tag filter, share as text |
| `apps/mobile/src/app/join/` | join by invite: `[code]` (deep link `eatandcalc://join/<code>`), `index` (typed code; `?scan=1` opens the QR scanner); outside the auth guard |
| `apps/mobile/src/app/recipe/[id].tsx` | recipe editor (`new` = own recipe, `?name=` prefills); the product picker replaces the form while open; catalog recipe → family override, reset |
| `apps/mobile/src/app/product/[id].tsx` | product editor (`new` = own product, `?name=` prefills); catalog product → family override, reset |
| `apps/mobile/src/components/products/` | Products pieces: `ProductRow` (badges, ♥ or a trailing action), `ProductForm` (draft ↔ `ProductData`, KBJU, units) |
| `apps/mobile/src/components/recipes/` | Recipes pieces: `RecipeRow` (card: kcal, ingredients, macro bar, weight), `RecipeForm` (draft ↔ `RecipeData`, totals), `IngredientRow` (amount + unit chips for a live or frozen product, shared with cooking), `ProductPicker` (search + Свои / Все) |
| `apps/mobile/src/app/cooking/` | `start` (Рецепты / Готовки: what a new session starts from, or none), `[id]` (session editor with repeat and delete; `new` = draft, `?recipe=` or `?from=`) |
| `apps/mobile/src/components/cooking/` | `CookingRow` (card, «Приготовить снова»), `CookingForm` (draft ↔ `CookingData`: ×N, rows vs. recipe, date, weights, totals) |
| `apps/mobile/src/components/family/` | Family tab pieces: `MemberCard`, `MemberForm`, `AccountsCard` (roles, invite with QR), `JoinFamily`, `JoinConflicts` (whose product / recipe version stays), `InviteScanner` (expo-camera QR → `parseInviteCode`), `errors` |
| `apps/mobile/src/app/(tabs)/` | tab screens (День, Готовка, Рецепты, Продукты, Семья); `_layout` = `expo-router/js-top-tabs` (pager-view, swipe between tabs) with `tabBarPosition="bottom"` and an own bottom bar; swiping is off while a finger is on a `ListScreen` header or a `ChipRow` (`lib/swipeLock`) |
| `apps/mobile/src/components/ui/` | Screen (`onBack`, `footer`, `onRefresh`), ListScreen (virtualized FlatList page for long lists), QrCode (pure-JS `qrcode` matrix drawn with Views), Text, Card, Button, IconButton, TextField, Stepper, SegmentedControl, ProgressBar, MemberAvatar, StickyFooter, Placeholder, StateMessage |
| `apps/mobile/src/lib/` | `config` (API and landing URLs), `auth` (Better Auth client, Google), `api` (fetch + zod), `query` (client, focus/online wiring, `refreshAll`), `sync` (`useHouseholdSync`), `products` (list filters shared with recipes, optimistic ♥ / hide `useListFlags` → `useProductFlags`), `recipes` (totals view, ingredient line, search, `useRecipeFlags`), `cooking` (frozen rows from products / recipe ×N, `recipeDiff`, card view, search, day titles), `diagnostics` (SecureStore ring buffer, `diag(tag, msg, level)`, console/crash capture, auto sign-out reason) |
| `apps/mobile/scripts/` | `android-dev` (local Gradle build → `dist-dev/eatandcalc-dev.apk` + `dist-dev/dev.json`), `android-sha1`, `android-env` (JDK/SDK, keystore) |
| `apps/mobile/eas.json` | build profiles (development / production APK), update channels |
| `apps/api/src/lib/` | `auth` (Better Auth), `session` (`withUser`), `http` (`HttpError`, `parseBody`), `household` (membership, invites, join/leave/remove), `family`, `products` (merged list, join merge / leave copy), `recipes` (merged list, create / override / reset / hide / ♥ / delete, `recipesUsing`), `cooking` (sessions CRUD, join move / leave copy), `env`, `log` (`authLog`: JSON lines `"tag":"auth"` for Vercel Logs) |
| `apps/api/src/app/api/` | route handlers: `auth/[...all]`, `me`, `sync`, `health`, `household/{invite,join[/preview],leave,accounts/[userId]}`, `family-members[/id]`, `products[/id[/override|hidden|favorite]]`, `recipes[/id[/override|hidden|favorite]]`, `cooking[/id]` |
| `apps/api/src/app/invite/[code]/` | legacy invite link: redirects to the landing's invite page |
| `apps/web/src/app/page.tsx` | landing: headline + QR to itself, download card; under `next dev` the same card serves the local dev APK |
| `apps/web/src/app/invite/[code]/` | public invite page (shared link): opens the app via Android intent, else offers the APK; shows the code |
| `apps/web/src/app-download.ts` | APK to offer: local dev build under `next dev`, else the Blob release |
| `apps/web/src/dev-build.ts`, `app/download/dev/` | local-only dev APK info and download (404 in production) |
| `apps/web/scripts/release-android.mjs` | EAS build → Vercel Blob (`android/eatandcalc.apk`, `android/latest.json`) |
| `packages/db/prisma/` | `schema.prisma`, `migrations/`, `seed.ts`, `catalog.ts` (shared product catalog), `recipes.ts` (shared recipe catalog); config `packages/db/prisma.config.ts` |
| `packages/shared/src/` | `domain`, `api` (zod), `nutrition`, `format`, `products` (labels, search), `tokens` |
| `docker-compose.yml` | local Postgres 17 (+ shadow DB) |
| `.husky/pre-commit` | git hook: `npm run typecheck` |
| `.github/workflows/` | `check` (typecheck, lint), `migrate` (prod migrations) |
| `docs/` | guides: Google OAuth setup, builds & OTA updates, production release |
| `design/mockups/` | Claude Design sources |
