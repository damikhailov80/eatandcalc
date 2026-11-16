# Builds and over-the-air updates

How the Android app is built and how code reaches the phones, locally (now) and in production (at release).

## Two layers of the app

```
┌──────────────────── APK ────────────────────┐
│ Native shell: Java/Kotlin, Hermes JS engine,│  changes only with a new APK
│ native modules (Google Sign-In, SecureStore)│
│   ┌───────── JS bundle ─────────┐           │
│   │ screens, styles, logic,     │           │  dev:  served by Metro over Wi-Fi
│   │ API calls (our TypeScript)  │           │  prod: inside the APK, replaced by EAS Update
│   └─────────────────────────────┘           │
└─────────────────────────────────────────────┘
```

Everything visible (screens, colors, texts, nutrition math) is JavaScript compiled from TypeScript. The native shell only changes when we add a native module, change `app.json` (icon, permissions, package) or upgrade Expo SDK / React Native.

## Local development

### Dev build (native shell)

- `npm run android:dev` (`apps/mobile/scripts/android-dev.mjs`):
  1. `expo prebuild` generates or refreshes `apps/mobile/android/` (gitignored, never edited by hand) with `APP_VARIANT=development`, so the launcher name is **Eat And Calc (dev)** (`apps/mobile/app.config.ts`; production builds are **Eat And Calc**);
  2. copies `apps/mobile/credentials/debug.keystore` into it (stable SHA-1 for Google, see `docs/google-oauth.md`);
  3. `./gradlew app:assembleDebug` with JDK/SDK from Android Studio, `arm64-v8a` only (override: `ANDROID_ARCHS`);
  4. copies the APK to `apps/mobile/dist/eatandcalc-dev.apk`, writes `dist/dev.json` (version, build time, size) and installs it on every phone connected over USB.
- The dev APK contains `expo-dev-client` and **no JS bundle**: it loads JS from Metro.
- Rebuild only after native changes. First build ≈ 7 min, later ones are incremental.
- **Installing without USB:** under `npm run dev` the local landing page (`http://localhost:3001`) offers the dev APK in its usual download card ("Скачать APK" → `/download/dev`, `apps/web/src/app/download/dev/route.ts`, served straight from `apps/mobile/dist`, 404 in production builds). The QR next to the headline opens the landing itself on a phone (`http://<Mac LAN IP>:3001`; in production the Vercel domain). Download, install over the previous version (same signature, the session is kept).
- **Phone can't reach the Mac** (`ERR_TOO_MANY_RETRIES`, the launcher doesn't list Metro, even `192.168.1.1` fails): newer Android requires a per-app local network permission. Settings → Apps → Chrome / "Eat And Calc (dev)" → Permissions → "Nearby devices" → Allow. The local landing shows this hint under the download button (dev only).
- Expo Go is not used (it lacks native Google Sign-In).

### Hot reload (JS)

- `npm run dev` starts Postgres, API (:3000), landing (:3001) and Metro (:8081). The dev build's launcher lists the Metro server found on the Wi-Fi; tap it once and later launches reopen it. Fallback: Enter URL manually → `http://<Mac LAN IP>:8081`.
- Metro keeps a dependency graph of all modules and watches the files. On save it rebuilds only the changed module and pushes it to connected phones over a WebSocket (HMR).
- On the phone, Hermes swaps the module and React Refresh re-renders the affected components, keeping their state (signed-in session, current tab, `useState` values).
- Full reload happens automatically when a changed module has no component above it, on syntax errors (red screen, clears after the fix), or manually: shake the phone → Reload.
- The app calls the API at `http://<Mac LAN IP>:3000` (derived from Metro's host, `apps/mobile/src/lib/config.ts`). API changes are picked up by Next.js on its own.

## Production

### Release APK (native shell + JS bundle)

- `npm run release:android` (`apps/web/scripts/release-android.mjs`): EAS cloud build with profile `production` (`apps/mobile/eas.json`) → downloads the APK → uploads `android/eatandcalc.apk` and `android/latest.json` to Vercel Blob → the landing page shows version, date and the download button.
- The production APK contains the JS bundle, `EXPO_PUBLIC_API_URL=https://eatandcalc-api.vercel.app`, and is signed with the EAS-managed keystore. `versionCode` is incremented by EAS (`appVersionSource: remote`, `autoIncrement`).
- Phones install it from the landing page once (allow installs from the browser).

### Over-the-air updates (JS only)

```
edit TS → npx eas-cli update --channel production --message "…"
        → EAS uploads the new bundle
        → app checks for updates on launch, downloads in background
        → next app start runs the new bundle
```

- Enabled by `expo-updates`; channel `production` is set in the build profile.
- **Compatibility guard:** `runtimeVersion` policy `appVersion` (`apps/mobile/app.json`). An APK only receives updates published for the same `expo.version`. After a native change: bump `version` in `app.json` (e.g. `1.0.0` → `1.1.0`), run `npm run release:android`, install the new APK; old APKs keep running their last compatible bundle.
- Rollback: `npx eas-cli update:rollback` (or republish the previous commit).
- Free EAS plan is far above two users.
- **API compatibility:** a phone may run the old bundle until its next restart, so API changes and DB migrations must stay backward compatible.

| Change | Local | Production |
|---|---|---|
| Screen, style, text, logic (TS) | save → Fast Refresh | `eas update` |
| API / DB | Next.js reload / `npm run db:migrate` | push to `main` (Vercel + migrate workflow) |
| New JS-only library | `npx expo install` → Fast Refresh | `eas update` |
| New native module, `app.json`, SDK upgrade | `npm run android:dev` | bump version → `npm run release:android` |

### One-time production setup for updates

`cd apps/mobile && npx eas-cli login && npx eas-cli init && npx eas-cli update:configure` (adds the project ID and updates URL to `app.json`), then the first `npm run release:android`.
