# Roadmap

Development goes in stages; each stage ends with a working app.

| # | Stage | Scope | Status |
|---|---|---|---|
| 0 | Boilerplate | Expo SDK 58 + expo-router, 5 tabs, theme tokens, base UI kit, domain types, nutrition math | ✅ done |
| 1 | Backend & auth | Choose backend (Supabase recommended vs. own API), Google sign-in, PostgreSQL schema + migrations, households & invites, data access layer + TanStack Query cache | ⏳ next, discussed separately |
| 2 | Products | List, search, category filter, create/edit/delete, units & gram weights, seed catalog | |
| 3 | Recipes | List, editor with steppers, totals / per portion / per 100 g, copy, delete | |
| 4 | Family | Members list, profile editor, norms, macro-energy check | |
| 5 | Cooking | Session from recipe or blank, editor (multiplier, cooked weight), quick weight pad, history with leftovers, repeat/copy | |
| 6 | Daily planner | Date strip, meals, add dish (leftovers / history / recipe), distribution between members, member rings | |
| 7 | Stats & history | Member day stats, history calendar, copy a day's plan | |
| 8 | Polish | Frequent items, empty states, haptics, performance, optional offline sync | |

## Decided

- Shared household: several Google accounts join one family and edit the same data.
- Online-first with cache; full offline sync is optional (Stage 8).

## Open questions for Stage 1

- Backend choice (Supabase vs. own API) and the Google sign-in flow on iOS/Android.
- Household invites (link or code) and roles.
- Postgres schema: cooking snapshots as JSONB or a `cooking_items` table; numeric precision.
- Seed product catalog: per household or a shared global one.
- Time zones: `date` is the household's local calendar date.
- Conflict handling when two people edit the same day.
