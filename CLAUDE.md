# CLAUDE.md

## Project

Monorepo (npm workspaces): Expo / React Native Android app for family nutrition, a Next.js API and a Next.js landing page: products, recipes (templates), cooking sessions (concrete pots), per-member consumption, day plan with norms, history. Idea in `README.md`.

**Development is done; the app is in use and changes come from feedback** (small fixes, shipped with `/push-update`). Production: API and landing on Vercel, Neon, the APK from the landing, JS over the air (`docs/production-release.md`). Development is local: Docker DB, local API, dev build on the phones over Wi-Fi.

Decided: Android only; Google sign-in only, allowlist `ALLOWED_EMAILS` filters who can sign in; each account starts with its own household as **owner**, others join by **invite** (link/code/QR, valid until the owner revokes or replaces it) as **member**; everyone edits data, only the owner invites/removes accounts, a member can leave; the app is **online-only** (TanStack Query is a request cache, no offline writes); domains `*.vercel.app`.

## Rules

- **Answer in the language of the user's request.** Docs, code and comments in English. **All UI strings in Russian**; don't translate them.
- **Documentation:** only `README.md` (idea + how to run), `CLAUDE.md` and `docs/production-release.md` (prod, releases, OTA, troubleshooting). Keep them in sync when the flow changes; never create other `.md` files unless the user explicitly asks.
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
npm run db:seed         # upsert the shared product, fast-food and recipe catalogs (packages/db/prisma/catalog.ts, fastfood.ts, recipes.ts)
npm run db:seed-history # local only: 90 days of test meals, dated norms and weights for a family (-- --household <id>, -- --reset)
npm run db:studio       # Prisma Studio on :5555
npm run dev:build       # local dev APK build + install over USB (only after native changes)
npm run prod:update     # OTA (EAS Update) of JS/TS to production; optional -- "msg", default = last commit subject
npm run prod:release    # new production APK: EAS build → Vercel Blob → landing (asks for confirmation)
node apps/mobile/scripts/android-sha1.mjs   # SHA-1 of the dev signing key for Google Cloud
npm run typecheck       # all workspaces (run before declaring work done; also the husky pre-commit hook)
npm run lint
cd apps/mobile && npx expo-doctor
```

## Conventions

- **Expo SDK 58.** Expo APIs change every SDK; check https://docs.expo.dev/versions/v58.0.0/ or https://docs.expo.dev/llms.txt instead of relying on memory.
- **Workspaces:** `apps/mobile`, `apps/api`, `apps/web`, `packages/db` (Prisma), `packages/shared` (types, zod API schemas, nutrition, stats, format, tokens). Packages ship TS sources (no build step); Next apps list them in `transpilePackages`.
- **Routing (mobile):** expo-router, routes only in `apps/mobile/src/app/`. Non-route code lives outside `src/app/`. Import alias `@/` → `apps/mobile/src/` (same alias in each Next app → its own `src/`).
- **Auth:** every screen except `sign-in` and `join/*` (invite deep link; it asks to sign in itself) sits behind `Stack.Protected` in the root layout. Mobile signs in with a native Google ID token → Better Auth (`apps/api/src/lib/auth.ts`); allowlist + household assignment happen in Better Auth DB hooks.
- **API:** mobile never talks to the DB. Every route handler is wrapped in `withUser` (`apps/api/src/lib/session.ts`) and filters by `householdId`; owner-only actions call `requireOwner`. Business errors are `ApiErrors` codes with 400/404/409, never 401/403 (the client signs out only on 401 or 403 `NOT_IN_FAMILY`). Bodies are parsed with `parseBody(request, Schema)`. Request/response shapes are zod schemas in `packages/shared/src/api.ts`; the client calls through `apps/mobile/src/lib/api.ts`. API changes must stay backward compatible (phones may run an old bundle).
- **Sync between devices:** every successful non-GET request through `withUser` bumps `household.revision` (`bumpRevision` in `lib/household.ts`; join also bumps the joined household). Mobile `useHouseholdSync` (`lib/sync.ts`, mounted in the tabs layout) polls `GET /api/sync` every 15 s while foregrounded and invalidates all queries when it changes; `lib/query.ts` wires TanStack `focusManager`/`onlineManager` to `AppState`/`expo-network`. Data tabs pass `onRefresh={refreshAll}` to `Screen` / `ListScreen` (pull-to-refresh); editors don't. Long lists use `ListScreen` with memoized rows and stable callbacks, never a `.map` inside `Screen`.
- **Native vs. OTA:** a new native module, `app.json` or SDK change needs a bumped `expo.version` and a new APK (`runtimeVersion` policy `appVersion`); everything else ships over the air.
- **DB:** Prisma 7 with `@prisma/adapter-pg`; import `prisma` from `@eatandcalc/db` (server only — never in mobile/web). Schema changes = new migration in `packages/db/prisma/migrations`, backward compatible. Tables `snake_case` via `@@map`/`@map`.
- **UI:** own components in `src/components/ui/`. No react-native-paper or other UI kits. Colors, radii, spacing and fonts come only from `@/theme`; no hard-coded hex values in screens. Use `Text` from the UI kit, not RN `Text`. No explanatory prose in the UI (badges / icons, details on tap).
- **Design:** canvas https://claude.ai/artifact/2z294jKrReMD5qKXG5vYUR (local copy `design/mockups/*.dc.html`, reference only, never imported; the app has moved on from it where decided). Tokens in `packages/shared/src/tokens.ts` (mobile via `@/theme`, web as CSS variables). Fonts: Manrope 700/800 headings, Inter body. Icons: `MaterialCommunityIcons` outline. Touch targets ≥ 44, tabular figures, ru-RU number formatting via `@eatandcalc/shared` (`format.ts`) (`1 435`, `13,2`).
- **Numeric input:** `keyboardType="decimal-pad"`; accept both `,` and `.`.
- **Nutrition math:** only through `@eatandcalc/shared` (`nutrition.ts`, `stats.ts`, pure functions). Don't compute KBJU inline in components.
- **Haptics:** every mutation buzzes through the `MutationCache` in `lib/query.ts` (success / error); `meta: { haptic: false }` opts out (toggles tap on press instead).
- Don't edit `apps/mobile/android/` (generated). Native config goes in `app.json`; `app.config.ts` only adds per-variant tweaks (`APP_VARIANT=development` → name "Eat And Calc (dev)", `.dev` package, `*-dev.png` icons). Native modules not in Expo Go need a dev build.

## Data model

Types: `packages/shared/src/domain.ts`; DB schema: `packages/db/prisma/schema.prisma`. Everything belongs to a **Household**; several accounts share one household. `date` everywhere is the household's local calendar date (`YYYY-MM-DD`).

```
Household ─┬─ HouseholdUser (account, role owner|member), HouseholdInvite (code; no expiry)
           ├─ FamilyMember (not an account, archived on delete) ─┬─ MemberNorm[] (date, KBJU)
           │                                                     └─ MemberWeight[] (date, kg)
           ├─ Product (own; catalog rows have no household) + HouseholdProduct (override, hidden)
           ├─ Recipe (own; catalog rows have no household) + HouseholdRecipe ── items[] ──► Product
           ├─ CookingSession ── CookingItem[] (snapshot) ──► Recipe? (origin only)
           └─ Meal (date, type) ── MealDish (frozen copy) ··► CookingSession | Recipe | Product
                                     └─ Consumption[] ──► FamilyMember (grams)
```

- **Product:** `nutrients` always per **100 g**; `units` = grams per one unit for a fixed set (`ml`, `tsp`, `tbsp`, `pieceS/M/L`; `g` is implicit), a missing key = not measured that way. One `product` table: `household_id` null = shared **catalog** (seeded from `packages/db/prisma/catalog.ts`, permanent `cat-…` ids), set = the family's **own** product. Catalog values are exactly USDA FoodData Central (SR Legacy, FDC id per row in `catalog.ts`); only products present there; `npm run db:seed` upserts and drops unreferenced removed rows. Families never touch catalog rows: `household_product` holds their `override` (full copy, reset = drop it) and `hidden_at` (catalog products only; own products are deleted, `DELETE /api/products/:id`). Favorites (`product_favorite`) are per **account**. `GET /api/products` returns the merged list, `PATCH /api/products/:id` edits an own product or saves the family's override (equal to catalog = no override), `DELETE …/override` resets, `PUT|DELETE …/hidden` and `…/favorite` hide / ♥ (the app updates the cache optimistically, `useProductFlags`) (`ProductDto`: `source`, `modified`, `hidden`, `favorite`, `original`); filtering and search run on the client (`lib/products.ts`, `matchesSearch`). **Join** (`joinHousehold` → `mergeProductsOnJoin`): own products move, hiding is united, edits are added; `GET /api/household/join/preview?code=` lists products edited differently on both sides, the joiner's version wins unless its id is in `keepFamily` (picker `JoinConflicts`). **Leave / removal** (`moveToFreshHousehold` → `copyProductsOnLeave`): the family keeps all, the account gets a copy (own products with new ids, ♥ re-pointed, overrides, hiding).
- **Fast food** = a product with `restaurant` (`mcdonalds | kfc | burgerking | pizzahut | other`; null = a grocery). Everything above applies unchanged (catalog / own / override / hidden / ♥ / join / leave / meals). One portion = `units.pieceM`, shown as «шт» (`unitShortFor`); the form edits only that unit and a chain instead of a category (`category` stays: `drinks` / `other`). The tab «Фастфуд» and «Продукты» are one `ProductListScreen` (`kind`), `filterProducts` splits them by `kind` (`isKind`); recipe / cooking ingredient pickers show groceries only. Catalog dishes come from `packages/db/prisma/fastfood.ts` (`ff-…` ids; values from the chains' own tables, not USDA: source per row), their chain is fixed (never part of an override, `canonical` drops it); an own dish can change chain. API compatibility: `ProductDataSchema.restaurant` is optional (missing = keep the current one), `ProductDto` / `MealDishDto` default it to null.
- **Recipe** = template: `items` (JSON `[{ productId, amount, unit }]`, display order) only. No cooked weight, no portions: weight = sum of raw ingredient grams, KBJU = sum of ingredients; both computed on the client from the current product list (`recipeTotals` in `nutrition.ts`, `lib/recipes.ts` in mobile), never stored. Catalog / own / override / hidden / ♥ work exactly like products (`recipe.household_id` null = catalog from `packages/db/prisma/recipes.ts`, `rcp-…` ids; `household_recipe`, `recipe_favorite`; `RecipeDto` has the same flags as `ProductDto`; `POST /api/recipes`, `PATCH|DELETE /api/recipes/:id`, `DELETE …/override`, `PUT|DELETE …/hidden` and `…/favorite` as for products (`useRecipeFlags`); the server checks every item's product is visible and has the unit). Search matches the name or any ingredient. Deleting an own product used in the family's recipes (own or overrides) → 409 `PRODUCT_IN_USE` (`recipesUsing`). **Join / leave** as for products, after them: `mergeRecipesOnJoin` (preview `recipeConflicts` with product names, weight and kcal resolved per side; `keepFamilyRecipes` in the join request; both default to `[]` for old apps / servers), `copyRecipesOnLeave` (own recipes and overrides get `productId`s remapped to the copied own products from `copyProductsOnLeave`). **Never modified by cooking.**
- **CookingSession** (`cooking_session`) = one real pot: `date` (`@db.Date`), `name`, optional `recipeId` (origin; SetNull on delete) with `recipeScale` ×1..×4, optional `copiedFromId`, `items` JSON `CookingItem[]` = **frozen** rows (`productId`, `name`, `nutrients` per 100 g, `units`, `amount`, `unit`; copied from the product when the row is added and never refreshed, so product edits / deletes don't touch sessions; a row's name and KBJU can be edited in the pot (`CookingItemEditor`: no product is created, the recipe is untouched, «Как в продукте» resets; a pencil marks rows that differ from their product, `isEdited`)), `potWeightG` (empty pot) and `grossWeightG` (pot with food). Cooked weight = gross − pot (`cookedWeight`); totals and per 100 g via `cookingTotals` (raw weight until weighed). `GET|POST /api/cooking`, `GET|PATCH|DELETE /api/cooking/:id` (`lib/cooking.ts`; the server checks the recipe is visible and the origin is the family's). Mobile: list grouped by day with name search (`lib/cooking.ts`), «Приготовить снова» opens a copy dated today (`copyOfSession`: frozen rows, weights, recipe and ×N as they are, `copiedFromId` set); `cooking/start` picks a recipe, a past session or none; the recipe editor's «Приготовить» opens `cooking/new?recipe=`; `cooking/[id]` edits and deletes (`new` = draft, `?recipe=` or `?from=`); comparison with the recipe as the family sees it now (`recipeDiff`). **Join** (`moveCookingOnJoin`, after the recipe merge): sessions move as they are. **Leave / removal** (`copyCookingOnLeave`): the family keeps all, the account gets copies with new ids; rows' `productId`, `recipeId` and `copiedFromId` point to the copies (`copyRecipesOnLeave` returns its old → new map).
- **Meal** (`meal`: `date`, `type` `breakfast | lunch | dinner | snack`): four fixed meals per day, one of each; the app shows all four, a meal is stored only with its first dish and deleted with its last (`addDish` reuses the day's meal of that type). **MealDish** (`meal_dish`) = a **frozen copy** of its source, only to count KBJU: a cooking session (`cookingTotals` per 100 g, `weight_g` = cooked weight, `raw_weight`, `source_date`), a recipe (`recipeTotals` per 100 g of raw ingredients, `weight_g` = one portion = the whole recipe; no session is created) or a product (per 100 g, `units`, `restaurant` for fast food: caption «McDonald's · …»). Edits / deletes of the source never change it (`session_id` / `recipe_id` / `product_id` SetNull, used only for «Как в прошлый раз»); to refresh, remove the dish and add it again. **Consumption** (`consumption`: `memberId`, `grams`, plus `amount` + `unit` as entered, `g` = null; `portion` = recipe portions). Nothing tracks what is left of a pot. `GET /api/meals?from&to` (≤ 400 days), `POST /api/meals/dishes` (`mealId` or `date` + `type`, `source`, consumptions; the server takes the snapshot), `PATCH|DELETE /api/meals/dishes/:id` (`lib/meals.ts`). Mobile: `lib/day.ts` (week query, meal slots, eaten per member, units of a dish, `lastSplit`). **Join / leave**: meals don't move (family profiles don't either): the joiner's meals are deleted with the old household, on leave / removal the family keeps all.
- **Norms** (`member_norm`, PK `member_id + date`): a member's daily KBJU from `date` until the next record, at most one per day; a date before the first record uses the first one (`normOn` in `stats.ts`). `FamilyMemberDto.normHistory` (date ascending; `norms` = the latest record, for old apps); mobile `useFamilyMembers(date)` (`lib/family.ts`) resolves `norms` for the shown date (day tab, dish split, member day; family tab = today). Create sends the first norm with `normsDate` (local today); `PATCH /api/family-members/:id` edits name / sex / color (an old app's `norms` becomes a record at the server's UTC date when it differs); `PUT /api/family-members/:id/norms` (`date`, `norms`, `from` = moved record) and `DELETE …/norms/:date` (409 `LAST_NORM` for the only one). Screens: profile lists the records (`NormHistoryCard`), `member/norm?member=&date=` edits one. The `family_member.kcal…carbs` columns are legacy (written on create, not read).
- **Weight** (`member_weight`, PK `member_id + date`): a member's body weight in kg, at most one per day (1..400). `FamilyMemberDto.weights` (date ascending, default `[]` for old servers); `PUT /api/family-members/:id/weights` (`date`, `kg`, `from` = moved record) and `DELETE …/weights/:date`. Day tab: the member's day (`day/member`) has a «Вес» row (the day's weight or «+»; hidden for future days) that opens `member/weight?member=&date=` (prefilled with the last known weight). History: card «Вес» over the same 6 months as «По месяцам», a line per chosen member (`WeightChart`, Views only) with the latest weight and change (`weightPeriod` in `stats.ts`). Weights stay with the member (join / leave don't move members).
- **Stats / history** are computed on the client from `GET /api/meals` (`packages/shared/src/stats.ts`); no stats API. Each day is compared with the norms in effect on it (family = sum of the active members' norms on that date; `familyNormOn`, `periodSummary(eaten, normFor)` also returns the average norm); a day with nothing eaten and today have no status.

| Value | Formula |
|---|---|
| Ingredient | `nutrients × grams / 100`, grams = `amount × units[unit]` (`nutrientsOf`) |
| Recipe | weight = Σ ingredient grams, KBJU = Σ ingredients, per 100 g = `total × 100 / weight` (`recipeTotals`) |
| Cooked weight | `grossWeightG − potWeightG` (`cookedWeight`; null until weighed) |
| Cooking per 100 g | `total × 100 / cookedWeight` (raw weight until weighed) (`cookingTotals`) |
| **Consumption** | `dish per 100 g × grams / 100` (`dishConsumed`); grams = `amount × grams per unit` (portion = `weight_g`) |
| Remaining | `norm on the date − eaten` (negative = exceeded) |
| Day status | kcal eaten vs. norm: 90–110 % ok, above over, below under (`dayStatus`, `DAY_TOLERANCE`); norm = the one in effect on that day (`normOn`); family = sum of members vs. sum of norms |
| Energy check | `P×4 + F×9 + C×4` vs. entered kcal (`energyCheck`: norms ±3 %, products ±10 % / 10 kcal; shown only when out of tolerance; unedited catalog values get an explanation instead of a warning) |

## File map

Mobile screens are in `apps/mobile/src/app/` (tabs in `(tabs)/`, editors `product|recipe|member|cooking/[id]` with `new` = create, `day/{add,dish,member}`, `history`, `join/`); their pieces in `apps/mobile/src/components/<area>/`. Non-obvious places:

| Path | Role |
|---|---|
| `apps/mobile/src/app/_layout.tsx` | root Stack, fonts, splash, auth guard, QueryClientProvider |
| `apps/mobile/src/app/(tabs)/_layout.tsx` | `expo-router/js-top-tabs` (pager-view) with an own bottom bar; swipe is off while a finger is on a `ListScreen` header or a `ChipRow` (`lib/swipeLock`) |
| `apps/mobile/src/app/diagnostics.tsx`, `components/DevLogButton.tsx` | temporary debug «Журнал» (off with `EXPO_PUBLIC_DEV_LOG=0`) |
| `apps/mobile/src/components/ui/` | own UI kit: Screen (`onBack`, `footer`, `onRefresh`), ListScreen (virtualized), StateMessage, QrCode, inputs, bars |
| `apps/mobile/src/components/products/ProductListScreen.tsx` | the «Продукты» and «Фастфуд» tabs (`kind`) |
| `apps/mobile/src/components/LoadError.tsx` | failed load in an editor: no answer / 5xx → «Нет связи» + retry, 4xx → «… не найден» + back |
| `apps/mobile/src/components/family/` | members, accounts and invites, `JoinFamily`, `JoinConflicts`, `InviteScanner`, `errors` (`familyErrorMessage`) |
| `apps/mobile/src/lib/` | `config` (URLs), `auth`, `api` (fetch + zod, `ApiRequestError`), `query` (client, keys, `refreshAll`, haptics), `sync`, `products` / `recipes` / `cooking` / `day` (view logic per area), `haptics`, `diagnostics` (`diag(tag, msg, level)`) |
| `apps/mobile/scripts/` | `android-dev` (local Gradle dev build → `dist-dev/`), `android-sha1`, `android-env` |
| `apps/api/src/lib/` | `auth`, `session` (`withUser`), `http` (`HttpError`, `parseBody`), `household` (invites, join/leave/remove), `family`, `products`, `recipes`, `cooking`, `meals`, `env` (lazy), `log` (`authLog`) |
| `apps/api/src/app/api/` | route handlers |
| `apps/web/src/app/` | landing (`page.tsx`), public invite page `invite/[code]`, local dev APK `download/dev` |
| `apps/web/scripts/release-android.mjs` | `prod:release`: EAS build → Vercel Blob |
| `packages/db/prisma/` | `schema.prisma`, `migrations/`, `seed.ts`, `seed-history.ts`, `catalog.ts`, `fastfood.ts`, `recipes.ts` |
| `.github/workflows/` | `check` (typecheck, lint), `migrate` (prod migrations) |
