# eatandcalc

Mobile app (iOS / Android) for planning and tracking a family's nutrition. UI is in Russian.

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

Accounts: Google sign-in, data in an external PostgreSQL database, several accounts share one household, online-first with a local cache.

UX priorities: minimal taps to add a dish, easy weight editing with the numeric keyboard, automatic recalculation, quick access to frequent products and recipes, easy date switching. Visual style: light warm background, green accents, rounded cards, progress rings and bars.

Design: [Claude Design canvas](https://claude.ai/artifact/2z294jKrReMD5qKXG5vYUR), 14 screens; local copy in `design/mockups/`.
Development plan: [ROADMAP.md](ROADMAP.md).

## Run

Requires Node.js LTS and the Expo Go app on a phone (or an iOS simulator / Android emulator).

```bash
npm install
npm start            # Expo dev server; press i / a, or scan the QR code with Expo Go
npm run typecheck    # tsc --noEmit
npx expo-doctor      # dependency / config check
```

Stack: Expo SDK 58 · React Native 0.88 · React 19 · TypeScript · expo-router.
