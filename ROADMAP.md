# Roadmap

Development goes in stages; each stage ends with a working app.

| # | Stage | Scope | Status |
|---|---|---|---|
| 0 | Boilerplate | Expo SDK 58 + expo-router, 5 tabs, theme tokens, base UI kit, domain types, nutrition math | ✅ done |
| 1 | Backend & auth | Monorepo; Next.js API on Vercel, Better Auth (Google, allowlist), Prisma + Neon, household, `/api/me`; sign-in screen and guard; landing with APK download; CI migrations | 🔧 code done; local dev setup (Google OAuth) pending |
| 2 | Products | Shared catalog + per-family edits / hiding / own products, per-account favorites, search, filters, units → grams, merge on join | ✅ done (plan below) |
| 3 | Recipes | Shared catalog + own recipes, editor (products in their units), totals / per 100 g, hide / ♥ / delete, merge on join | ✅ done (plan below) |
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
- Households: each account gets its own on first sign-in and is its owner; others join by invite (link `<landing>/invite/<code>` → `eatandcalc://join/<code>` or the APK download if not installed, the code typed in or the QR scanned in the app; valid until revoked or replaced, one active per household). Owner: invites, removes accounts; member: can leave. Everyone edits data. `ALLOWED_EMAILS` still filters who can sign in.
- Online-only: no offline writes or sync; TanStack Query is just a request cache.
- Domains: `*.vercel.app` until a real domain is bought.
- Until the release stage everything runs locally: Docker DB, API on the Mac, dev build (built locally, no EAS) on two phones over Wi-Fi.

## Stage 2 plan: products

Decisions:
- One global **catalog** (277 common products, seeded from `packages/db/prisma/catalog.ts`, stable slug ids `cat-…`; values exactly from USDA FoodData Central SR Legacy with the FDC id per row, carbs by difference incl. fiber; products missing in USDA are not in the catalog) plus the family's **own** products in the same `product` table (`household_id` set).
- KBJU always **per 100 g**. Units are a fixed set, each converted to grams per product and editable: г (always 1), мл (grams per ml), ч. л., ст. л., шт мал/сред/бол.
- Per **family** (`household_product`): an override of a catalog product (full copy, can be reset to the catalog values) and hiding (restorable). Own products are edited in place and deleted (not hidden); once recipes exist, a product used in them can't be deleted.
- Per **account** (`product_favorite`): favorites (♥).
- Filters: Свои (= избранное + добавленные, the quick list), Все, Избранное, Добавленные, Изменённые (reset), Скрытые (restore); category chips; instant name search on the client (case- and ё-insensitive).
- Release note: production needs `npm run db:seed` (catalog upsert) after migrations; wire it into the `migrate` workflow at the release stage.
- Joining a family: the joiner's own products move over, hidden sets are merged, overrides are added; when both edited the same catalog product differently the joiner picks whose version stays (their own by default). Favorites stay with the account.
- Leaving a family (or being removed): the family keeps everything; the account's new household gets a copy of own products (new ids, its ♥ follow the copies), overrides and hiding.

Steps (each one ends with a test on the phones, then commit):
1. [x] Catalog + read-only list: migration, shared types / nutrition / schemas, catalog seed, `GET /api/products`, Products tab with search, categories, filters Свои / Все.
2. [x] Edit & add: product editor (KBJU, energy check, units), create own product, override catalog product, reset; filters Добавленные / Изменённые.
3. [x] Hide & favorites: hide / restore catalog products, delete own ones, ♥, filters Скрытые / Избранное, Свои as the default list.
4. [x] Join merge: conflict preview and picker in the join flow, merge in the join transaction; copy on leave / removal.

## Stage 3 plan: recipes

Decisions:
- A recipe is a **template**: products in their units (г, мл, ч. л., ст. л., шт), in order. No cooked weight, no portions: the recipe's weight is the sum of raw ingredient grams, KBJU is the sum of the ingredients (total and per 100 g). Cooking (weight change, portions) belongs to cooking sessions, Stage 5.
- Weight and KBJU are not stored: the app computes them from the products as the family sees them now (`recipeTotals`), so a product edit shows up in every recipe. An item whose product lost the unit is left out of the sums and flagged.
- Same model as products: a shared **catalog** of recipes (`packages/db/prisma/recipes.ts`, permanent `rcp-…` ids, items point at catalog products; example: «Капуста тушёная с тушёнкой и яйцами», one portion) plus the family's **own** recipes in the same `recipe` table; per family an override (full copy, reset) and hiding (`household_recipe`); per account ♥ (`recipe_favorite`). Same filters as products; search by the recipe name or any of its products.
- An own product used in a recipe (own or an override) can't be deleted.
- Join / leave: the same rules as products (own recipes move, hiding united, edits added, the joiner picks whose edit stays; on leave the account gets copies with product ids re-pointed to its copied own products).
- «Тушёнка говяжья» added to the product catalog (USDA SR Legacy 170602, canned beef).

Steps (each one ends with a test on the phones, then commit):
1. [x] Catalog + read-only list: migration, shared schemas, `recipeTotals`, recipe catalog seed, `GET /api/recipes`, Recipes tab with search and filters Свои / Все.
2. [x] Editor & own recipes: recipe editor with product picker, units (switching a unit keeps the weight), totals; create own / edit / delete own / override catalog / reset; filters Добавленные / Изменённые; product delete ban (409 `PRODUCT_IN_USE`, the app names the recipes).
3. [x] Hide & favorites: hide / restore catalog recipes, ♥ (list and editor, optimistic); filters Избранное / Скрытые; reset / restore buttons in Изменённые / Скрытые.
4. [x] Join / leave: merge with conflict picker, copy on leave.

Not done on purpose: "copy a recipe" (a new own recipe based on another; not needed). "Cook today" from a recipe card arrives with Stage 5 (cooking sessions).

## Open questions

- Postgres schema for Stage 2+: cooking snapshots as JSONB or a `cooking_items` table; numeric precision.
- Time zones: `date` is the household's local calendar date.
- Conflict handling when two people edit the same day (last write wins?).
