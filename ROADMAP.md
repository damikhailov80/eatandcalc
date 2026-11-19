# Roadmap

Development goes in stages; each stage ends with a working app.

| # | Stage | Scope | Status |
|---|---|---|---|
| 0 | Boilerplate | Expo SDK 58 + expo-router, 5 tabs, theme tokens, base UI kit, domain types, nutrition math | ✅ done |
| 1 | Backend & auth | Monorepo; Next.js API on Vercel, Better Auth (Google, allowlist), Prisma + Neon, household, `/api/me`; sign-in screen and guard; landing with APK download; CI migrations | 🔧 code done; local dev setup (Google OAuth) pending |
| 2 | Products | Shared catalog + per-family edits / hiding / own products, per-account favorites, search, filters, units → grams, merge on join | ✅ done (plan below) |
| 3 | Recipes | Shared catalog + own recipes, editor (products in their units), totals / per 100 g, hide / ♥ / delete, merge on join | ✅ done (plan below) |
| 4 | Family | Members list, profile editor, norms, macro-energy check; account roles (owner/member), invite link + code, join/leave/remove | ✅ done (today's eaten = 0 until stage 6) |
| 5 | Cooking | Session from a recipe, a copy or blank; editor (multiplier, frozen product copies, pot and gross weight → per 100 g); history by day with search; delete, cook again; join / leave | ✅ done (plan below) |
| 6 | Daily planner | Date strip, meals, add dish (history / recipe / product), distribution between members, member rings | 🔧 in progress (plan below) |
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

Not done on purpose: "copy a recipe" (a new own recipe based on another; not needed). "Приготовить" (new cooking from the recipe) is in the recipe editor (Stage 5).

## Stage 5 plan: cooking

Decisions:
- A cooking session is one real pot on a date: name, rows, optional recipe (origin, ×1..×4 multiplier) and origin session (copy).
- Rows are **frozen forever**: each keeps the product's name, KBJU per 100 g and unit weights as they were when the row was added. Product edits / deletes never change a session; to refresh, remove the row and add the product again. A copy copies the frozen rows as they are. Deleting a product is never blocked by sessions.
- Weights: the empty pot and the pot with food; cooked weight = gross − pot, KBJU per 100 g of the finished dish follows from it. Until weighed, per 100 g uses the raw weight (badge «сырой вес»). No portions.
- Recipe comparison against the recipe as the family sees it now × multiplier («как в рецепте» / «изменено: N», «в рецепте 150 г» per row). Picking a multiplier resets the amounts to the recipe × N (rows of the same product keep their frozen copy); the ×1..×4 switch shows only while the pot equals the recipe × N, after manual changes it folds into a «×N» badge that asks to confirm the reset.
- Join: sessions move into the family. Leave / removal: the family keeps all, the account gets copies (product, recipe and origin ids re-pointed to its copies).

Steps (each one ends with a test on the phones, then commit):
1. [x] Model + list + editor: migration `cooking_session`, shared schemas and `cookingTotals`, `/api/cooking` CRUD, Cooking tab (by day, search), new cooking from a recipe or blank, editor (name, date, rows, ×N, comparison, weights, totals).
2. [x] Delete, "Приготовить снова" (copy dated today), new cooking as a copy of a session, "Приготовить" from a recipe.
3. [x] Join / leave: move on join (`moveCookingOnJoin`), copy on leave (`copyCookingOnLeave`).

## Stage 6 plan: daily planner

Decisions:
- An empty day shows Завтрак, Обед, Ужин; a meal is stored only with its first dish and goes with its last one (one breakfast / lunch / dinner per day, the server reuses it). «Добавить приём пищи» adds a snack («Перекус», «Перекус 2»).
- A dish is a **frozen copy** of one of three sources, all only to count KBJU: a **cooking session** (exact: KBJU per 100 g of the finished dish via `cookingTotals`, weight, «сырой вес» flag, the session's date), a **recipe** (approximate, e.g. coffee with sugar: KBJU per 100 g of its raw ingredients via `recipeTotals`; no cooking session is created) or a **product** (KBJU per 100 g and its unit weights). Edits / deletes of the source never change the history. `session_id` / `recipe_id` / `product_id` (SetNull) only suggest «как в прошлый раз».
- Each member's amount is entered in grams, for a product in its units («1 шт (сред.)», «2 ст. л.»), for a recipe in portions (one portion = the whole recipe, its weight kept in the dish's `weight_g`; a new recipe dish starts at 0 portions, e.g. tea). Grams are stored, the entered amount and unit are kept for display.
- Eaten = `Consumption` (member, grams): `dish per 100 g × grams / 100`. What is served is not checked against the pot's weight.
- Join / leave: meals don't move (family members don't either): the joiner's meals go with the old household, on leave the family keeps all; moved / copied sessions start untouched.
- Two people editing a day: each dish is written on its own, last write wins; other phones see it through the sync poll.

Steps (each one ends with a test on the phones, then commit):
1. [x] Day + dish from a session + manual split: migration `meals`, `GET /api/meals?from&to`, `POST /api/meals/dishes`, `PATCH|DELETE /api/meals/dishes/:id`; Day tab (date strip, rings, meal cards), `day/add` (sessions), `day/dish` (per-member grams, edit, remove); today's eaten on Family.
2. [ ] Other sources: «+ Блюдо» tabs Готовки / Рецепты / Продукты; a recipe or a product goes straight to the split (migration `meal_dish_units`: `recipe_id`, unit weights, entered amount + unit); per-member unit chips.
3. [ ] Meals & extras: snacks, «Как в прошлый раз», ring over-badge details, «готовка изменена» → refresh the copy.
4. [ ] Join / leave check, docs.

## Open questions

- Time zones: `date` is the household's local calendar date.
