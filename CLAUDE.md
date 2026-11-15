# CLAUDE.md

## Project

Expo / React Native app for family nutrition planning: products, recipes (templates), cooking sessions (concrete pots), per-member consumption, daily planner with norms. The idea is in `README.md`, stages in `ROADMAP.md`, design in `design/mockups/`.

Current stage: **0 done (boilerplate)**. Next: **Stage 1, backend & auth** (Google sign-in + PostgreSQL, shared household, online-first + cache). The backend tech is not chosen yet; don't add persistence/auth/state libraries until it is.

## Rules

- **Answer in the language of the user's request.** Docs, code and comments in English. **All UI strings in Russian**; don't translate them.
- **Documentation is exactly three files:** `README.md` (idea + how to run), `CLAUDE.md`, `ROADMAP.md`. Never create new `.md` files unless the user explicitly asks for one; put new info into these three.
- **Git:** never run `git add`, `git rm`, `git commit`, `git push` or anything else that changes the index/history without the user's explicit approval. Delete files with plain `rm`.
- **Package manager:** npm only. Add packages with `npx expo install <pkg>`.

## Commands

```bash
npm install
npm start               # expo start
npm run typecheck       # tsc --noEmit (run before declaring work done)
npx expo lint
npx expo-doctor
```

## Conventions

- **Expo SDK 58.** Expo APIs change every SDK; check https://docs.expo.dev/versions/v58.0.0/ or https://docs.expo.dev/llms.txt instead of relying on memory.
- **Routing:** expo-router, routes only in `src/app/`. Non-route code lives outside `src/app/`. Import alias `@/` → `src/`.
- **UI:** own components in `src/components/ui/`. No react-native-paper or other UI kits. Colors, radii, spacing and fonts come only from `@/theme`; no hard-coded hex values in screens. Use `Text` from the UI kit, not RN `Text`.
- **Design fidelity:** match `design/mockups/` (screen table below). Touch targets ≥ 44, tabular figures, ru-RU number formatting via `@/lib/format` (`1 435`, `13,2`).
- **Numeric input:** `keyboardType="decimal-pad"`; accept both `,` and `.`.
- **Nutrition math:** only through `@/lib/nutrition` (pure functions). Don't compute KBJU inline in components.
- Don't edit `ios/` / `android/` (generated). Native config goes in `app.json`. Native modules not in Expo Go need a dev build.

## Data model

Types: `src/types/domain.ts`. Everything belongs to a **Household**; several accounts share one household.

```
Household ─┬─ FamilyMember (norms)
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

Canvas: https://claude.ai/artifact/2z294jKrReMD5qKXG5vYUR (local copy `design/mockups/*.dc.html`, reference only, never imported). Phone frame 390 pt. Tokens in `src/theme/tokens.ts`: warm bg `#F6F4EF`, white cards (radius 20), primary green `#2E7D4F` / dark `#1F5E3A` / soft `#E3F0E7`, exceeded `#C2410C`, macro colors kcal green, protein `#3566B0`, fat `#B7791F`, carbs `#7A5AB0`, member avatar colors. Fonts: Manrope 700/800 headings, Inter body. Icons: `MaterialCommunityIcons` outline.

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

Components to build as needed: Chip, SegmentedControl, SearchField, NumberField, Stepper, ProgressRing, MacroBar, ProgressBar, MemberAvatar/Chip, DateStrip, SwipeRow, BottomSheet, NumericKeypad, StickyFooter.

## File map

| Path | Role |
|---|---|
| `src/app/_layout.tsx` | root Stack, font loading, splash, SafeAreaProvider |
| `src/app/(tabs)/_layout.tsx` | bottom tabs (День, Готовка, Рецепты, Продукты, Семья) |
| `src/app/(tabs)/*.tsx` | tab screens (placeholders now) |
| `src/components/ui/` | Screen, Text, Card, Button, Placeholder |
| `src/theme/tokens.ts` | design tokens |
| `src/types/domain.ts` | domain types |
| `src/lib/nutrition.ts` | nutrition calculations |
| `src/lib/format.ts` | number formatting |
| `design/mockups/` | Claude Design sources |
