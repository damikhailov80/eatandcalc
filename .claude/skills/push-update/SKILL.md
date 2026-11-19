---
name: push-update
description: Ship the current working-tree changes to production in one go - checks, commit, git push (Vercel redeploys API/landing) and an OTA update of the Android app (npm run prod:update). Use when the user says push-update, "закоммить, запушь и обнови", "выкати на прод", "отправь OTA".
---

# push-update

Invoking this skill (by name or the phrases above) **is** the user's explicit approval to commit and push the current changes (CLAUDE.md git rule). It covers only this run: do not commit or push on your own afterwards.

## Steps

1. **Look at what ships.** `git status --short`, `git diff --stat`, `git log origin/main..HEAD --oneline`.
   - Nothing changed and nothing unpushed → say so and stop.
   - Never stage secrets: `.env*` (except `.env.example`), `*.keystore`, `credentials.json`, `.claude/settings.local.json`, `apps/mobile/android/`, `dist/`. If such files show up as changed, leave them out and mention it.
   - On a branch other than `main` → ask before pushing (Vercel prod deploys from `main`).

2. **Native changes can't go over the air.** If the diff (including unpushed commits) touches `apps/mobile/app.json` (plugins, `version`, android config), `apps/mobile/app.config.ts`, native dependencies in `apps/mobile/package.json`, or assets used by native config (icons, splash), an OTA update won't apply (`runtimeVersion` policy `appVersion`; native code is baked into the APK). Stop and tell the user this needs `npm run prod:release` (new APK) instead; push only if they say so.

3. **Checks.** `npm run typecheck` and `npm run lint`. On failure: fix if it's clearly from these changes, otherwise stop and report.

4. **Commit.** Stage the specific files (`git add <paths>`, not `-A`). Message in the repo's style (`git log -5 --oneline`): short English subject, `Area: what changed`, a body when it isn't obvious, ending with the attribution line from the session's system reminder. The husky pre-commit hook runs typecheck again; if it fails, fix and create a new commit (never `--no-verify`, never amend a pushed commit).

5. **Push.** `git push`. Vercel rebuilds `eat-and-calc-api` and, if web/shared changed, `eat-and-calc-web`. The API goes live before phones get the new bundle, so API changes must be backward compatible (old app versions keep working); flag it if they aren't.

6. **OTA.** Only if something under `apps/mobile/` or `packages/shared/` changed (otherwise say the update is skipped: nothing for the app): `npm run prod:update -- "<commit subject>"` (timeout 10 min; it runs `eas-cli update` for Android, channel `production`, environment `production`). If EAS asks to log in, ask the user to run `! npx eas-cli login`.

7. **Report** briefly in the user's language: commit hash and subject, what was pushed, the EAS update group id / link from the output, and that phones pick it up after the app is restarted (sometimes twice: the first launch downloads, the next one applies). Mention anything skipped.
